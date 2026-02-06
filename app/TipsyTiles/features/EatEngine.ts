import GameFeature from "../../game-engine/GameFeature.ts"
import { contain, explode } from "../../game-engine/Math.ts"
import { Reel } from "../../game-engine/Reel.ts";
import SlotsBase from "../../game-engine/SlotsBase.ts";
import { Grid, Point, SymbolDef, Timeline, TimelineEvent } from "../../game-engine/types.ts";
import * as PIXI from "pixi.js"
import gsap from "gsap"

export class EatEngineFeature extends GameFeature {
    constructor(game: SlotsBase) {
        super(game, "EAT_SEQUENCE", null);
    }

    onClustersFound(clusters, grid, timeline) {
        // --- 1. FILTER CLUSTERS ---
        const validClusters = clusters.filter(cluster => {
            return cluster.some(node => {
                const symbolDef = this.config.symbols[node.value];
                return symbolDef && symbolDef.isEater === true;
            });
        });

        if (validClusters.length === 0) return false;

        let win = 0;

        // --- 2. CALCULATE PAYOUTS ---
        validClusters.forEach(cluster => {
            // ... (Your existing payout logic) ...
            const baseNode = cluster.find(node => !this.config.symbols[node.value].isSuper);
            const payoutId = baseNode ? baseNode.value : cluster[0].value;
            const config = this.config.symbols[payoutId];
            const count = cluster.length;

            if (config.payouts && !config.dontCluster) {
                let payout = config.payouts[count];
                if (payout === undefined) {
                    const maxKey = Math.max(...Object.keys(config.payouts).map(Number));
                    if (count > maxKey) payout = config.payouts[maxKey];
                }
                if (payout) win += payout;
            }
        });

        // --- 3. PREPARE EXPLOSION ---
        const clustersToProcess = Array.from({ length: this.config.cols }, () => []);

        // Helper to format grouped clusters for the frontend
        const groupedClusters = validClusters.map(cluster =>
            cluster.map(node => ({ x: node.x, y: node.y }))
        );

        validClusters.flat().forEach(({ x, y }) => {
            if (!clustersToProcess[x].includes(y)) {
                clustersToProcess[x].push(y);
            }
        });

        timeline.push({
            type: this.type,
            clusters: clustersToProcess,      // Used for mask/explosion logic
            groupedClusters: groupedClusters, // NEW: Used for independent pathfinding
            grid: JSON.parse(JSON.stringify(grid)),
        });

        explode(this.engine, grid, clustersToProcess, timeline, win, this.config.symbols);

        return true;
    }

    // async onCustomEvent(event: TimelineEvent): Promise<void> {
    //     console.log("EAT EVENT", event)
    //     // get position of eater
    //     // remove its sprite
    //     // spawn a ghost of it
    //     // have the ghost animate toward something in the cluster that hasn't been eaten
    //     // When it is on something to eat, remove its sprite, and continue to next thing to eat
    //     // It will move like a king, i.e. one step at a time, but not diagonal.
    //     // When done, return true
    // }

    async onCustomEvent(event: any): Promise<void> {
        const { groupedClusters, grid } = event; // Destructure the NEW property
        const reelSprites = this.game.reels;
        const rows = this.config.rows;
        this.reels.forEach(r => r.sortReverse());

        if (!groupedClusters || groupedClusters.length === 0) return;

        // We will collect all animation promises here
        const allAnimationPromises: Promise<void>[] = [];

        // --- PROCESS EACH CLUSTER INDEPENDENTLY ---
        for (const clusterPoints of groupedClusters) {

            // 1. Create a Set specific to THIS cluster only
            const clusterSet = new Set<string>();
            clusterPoints.forEach((p: Point) => clusterSet.add(`${p.x},${p.y}`));

            // 2. Find Eater(s) specifically in THIS cluster
            const eatersInCluster: Point[] = clusterPoints.filter((p: Point) => {
                const symbolId = grid[p.x][p.y];
                const def = this.config.symbols[symbolId];
                return def && def.isEater;
            });

            if (eatersInCluster.length === 0) continue;

            const globalVisited = new Set<string>();

            // 3. Define Animation for this specific group
            const animateEaterSequence = async (startPoint: Point) => {
                const startKey = `${startPoint.x},${startPoint.y}`;
                if (globalVisited.has(startKey)) return;
                const totalToEat = clusterSet.size;
                let currentEatenCount = 0;
                const moveSequence: { point: Point, type: 'EAT' | 'BACKTRACK' }[] = [];

                const dfs = (current: Point) => {
                    const key = `${current.x},${current.y}`;
                    globalVisited.add(key);
                    currentEatenCount++; // Increment progress

                    const neighbors = [
                        { x: current.x, y: current.y + 1 },
                        { x: current.x, y: current.y - 1 },
                        { x: current.x + 1, y: current.y },
                        { x: current.x - 1, y: current.y }
                    ];

                    // STRICT CHECK: Neighbor must be in THIS cluster's set
                    const validNeighbors = neighbors.filter(n => {
                        const nKey = `${n.x},${n.y}`;
                        return clusterSet.has(nKey) && !globalVisited.has(nKey);
                    });

                    for (const next of validNeighbors) {
                        moveSequence.push({ point: next, type: 'EAT' });
                        dfs(next);
                        if (currentEatenCount < totalToEat) {
                            moveSequence.push({ point: current, type: 'BACKTRACK' });
                        }
                        // moveSequence.push({ point: current, type: 'BACKTRACK' });
                    }
                };

                dfs(startPoint);

                // Clean trailing backtracks
                while (moveSequence.length > 0 && moveSequence[moveSequence.length - 1].type === 'BACKTRACK') {
                    moveSequence.pop();
                }

                // ... (Visual setup and GSAP animation logic remains exactly the same as your original code) ...
                // Copy/paste your existing visual logic here (getReelSymbol, ghost creation, loop over moveSequence)
                // Just ensuring you use the logic inside this scope.

                // --- VISUAL LOGIC START (Condensed for brevity) ---
                const getReelSymbol = (x: number, y: number) => {
                    const r = reelSprites[x] as any;
                    return r.symbols[rows - y];
                };
                const getGlobalPos = (x: number, y: number) => {
                    const s = getReelSymbol(x, y);
                    if (!s) return { x: 0, y: 0 };
                    const g = s.parent.toGlobal(new PIXI.Point(s.x, s.y));
                    return this.game.app.stage.toLocal(g);
                }

                const originSprite = getReelSymbol(startPoint.x, startPoint.y);
                if (!originSprite) return;
                originSprite.visible = false;

                const ghost = new PIXI.Sprite(originSprite.texture);
                ghost.anchor.set(0.5);
                ghost.scale.set(originSprite.scale.x, originSprite.scale.y);
                const startPos = getGlobalPos(startPoint.x, startPoint.y);
                ghost.position.set(startPos.x, startPos.y);
                this.game.app.stage.addChild(ghost);

                for (const step of moveSequence) {
                    const dest = getGlobalPos(step.point.x, step.point.y);
                    await new Promise<void>(r => gsap.to(ghost, { x: dest.x, y: dest.y, duration: 0.2, ease: "none", onComplete: () => r() }));

                    if (step.type === 'EAT') {
                        const targetSprite = getReelSymbol(step.point.x, step.point.y);
                        if (targetSprite) {
                            targetSprite.visible = false;
                            // ... Add your payout text logic here ...

                            await new Promise<void>(r => gsap.to(ghost.scale, { x: ghost.scale.x * 1.3, y: ghost.scale.y * 1.3, duration: 0.08, yoyo: true, repeat: 1, onComplete: () => r() }));
                        }
                    }
                }
                ghost.destroy();
                // --- VISUAL LOGIC END ---
            };

            // Add these animations to the main promise list
            eatersInCluster.forEach(eater => {
                allAnimationPromises.push(animateEaterSequence(eater));
            });
        }

        // Wait for ALL clusters to finish animating
        await Promise.all(allAnimationPromises);
    }
}
