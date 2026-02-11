import GameFeature from "../../../game-engine/GameFeature.ts"
import { contain, explode } from "../../../game-engine/Math.ts"
import SlotsBase from "../../../game-engine/SlotsBase.ts";
import { Grid, Point, SymbolDef, Timeline, TimelineEvent } from "../../../game-engine/types.ts";
import * as PIXI from "pixi.js"
import gsap from "gsap"
import { findClusters } from "../../../game-engine/Math.ts";

export class EatEngineFeature extends GameFeature {
    constructor(game: SlotsBase) {
        super(game, "EAT_SEQUENCE", null);
    }

    onClustersFound(initialClusters, grid, timeline) {
        // --- 0. SETUP SIMULATION ---
        // We need a deep copy of the grid to simulate the sequence step-by-step
        // so 'Eater 2' can see what 'Eater 1' changed.
        let workingGrid = JSON.parse(JSON.stringify(grid));

        // We will accumulate ALL cells that were eaten to trigger ONE big explosion at the end
        const allClustersToProcess = Array.from({ length: this.config.cols }, () => []);
        let totalWin = 0;
        let hasAction = false;

        // --- 1. THE GAME LOOP (Sequential Logic) ---
        while (true) {
            // A. Scan the CURRENT working grid state
            // You need a way to find clusters on the dynamic 'workingGrid', 
            // not the static 'clusters' passed in arguments.
            // Assuming this.engine.getClusters(grid) exists, or you reuse your finding logic:
            const currentClusters = this.findClustersOnGrid(workingGrid);

            // B. Filter for Eaters only
            const validEaterClusters = currentClusters.filter(cluster => {
                return cluster.some(node => {
                    const symbolDef = this.config.symbols[node.value];
                    return symbolDef && symbolDef.isEater === true;
                });
            });

            // If no eaters are left to act, break the loop
            if (validEaterClusters.length === 0) break;

            // C. Pick ONE Cluster to execute (Priority)
            // Currently picking the first one. You could sort this by size or priority.
            const activeCluster = validEaterClusters[0];
            hasAction = true;

            // --- 2. CALCULATE PAYOUT (For this specific step) ---
            // (Your existing payout logic, applied to 'activeCluster')
            const baseNode = activeCluster.find(node => !this.config.symbols[node.value].isSuper);
            const payoutId = baseNode ? baseNode.value : activeCluster[0].value;
            const config = this.config.symbols[payoutId];
            const count = activeCluster.length;

            if (config.payouts && !config.dontCluster) {
                let payout = config.payouts[count];
                if (payout === undefined) {
                    const maxKey = Math.max(...Object.keys(config.payouts).map(Number));
                    if (count > maxKey) payout = config.payouts[maxKey];
                }
                if (payout) totalWin += payout;
            }

            // --- 3. PUSH TIMELINE EVENT (Single Event) ---
            // We push an event for JUST this eater. The frontend will play this, then the next.
            const groupedCluster = [activeCluster.map(node => ({ x: node.x, y: node.y }))];

            timeline.push({
                type: this.type, // "EAT_SEQUENCE"
                groupedClusters: groupedCluster,
                grid: JSON.parse(JSON.stringify(workingGrid)), // Pass the state BEFORE the move
            });

            // --- 4. UPDATE SIMULATION (The "Reveal" Logic) ---
            // This is the crucial step. We must update 'workingGrid' so the next loop sees new symbols.
            this.updateSimulationGrid(workingGrid, activeCluster);

            // Add these points to the final explosion list
            activeCluster.forEach(node => {
                // Don't explode the Eater itself if you want it to stay, 
                // otherwise remove this check if Eater also disappears.
                const symbolDef = this.config.symbols[node.value];
                if (symbolDef && symbolDef.isEater) return;

                if (!allClustersToProcess[node.x].includes(node.y)) {
                    allClustersToProcess[node.x].push(node.y);
                }
            });
        }

        if (!hasAction) return false;

        // --- 5. FINAL EXPLOSION ---
        // Now we tell the engine to physically remove all the symbols we ate
        // This triggers the standard gravity/cascade for the NEXT turn.
        explode(this.engine, grid, allClustersToProcess, timeline, totalWin, this.config.symbols);

        return true;
    }

    // --- HELPER: Modify Grid State ---
    updateSimulationGrid(grid, cluster) {
        cluster.forEach(node => {
            // 1. Mark the cell as "Empty" or "Eaten" (-1)
            // specific logic depends on your engine's empty state

            // 2. CHECK FOR REVEAL
            // "When nmr one is played... it might reveal new symbols"
            // You need to implement your specific logic here.
            // Example:
            // if (grid[node.x][node.y] === HIDDEN_BLOCK) {
            //     grid[node.x][node.y] = NEW_SYMBOL_ID; 
            // } else {
            //     grid[node.x][node.y] = -1; // Standard removal
            // }

            // For now, I will assume simple removal, but this is where you
            // insert the logic to spawn the symbol for Eater #2.
            grid[node.x][node.y] = -1;
        });

        // OPTIONAL: If your game has "Instant Gravity" (symbols fall immediately 
        // between eaters), you must implement a simple gravity shift on 'grid' here.
    }

    // --- HELPER: You likely need to port your cluster finding logic here ---
    findClustersOnGrid(grid) {
        // You can likely call your main engine's cluster finder if it accepts a grid argument.
        // If your engine only checks "this.grid", you might need to temporarily swap it 
        // or duplicate the find logic.
        return findClusters(grid, this.config.symbols)
    }

    async onCustomEvent(event: any): Promise<void> {
        //     // get position of eater
        //     // remove its sprite
        //     // spawn a ghost of it
        //     // have the ghost animate toward something in the cluster that hasn't been eaten
        //     // When it is on something to eat, remove its sprite, and continue to next thing to eat
        //     // It will move like a king, i.e. one step at a time, but not diagonal.
        //     // When done, return true
        const { groupedClusters, grid } = event; // Destructure the NEW property
        console.log(groupedClusters)
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

                originSprite.visible = true;
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
