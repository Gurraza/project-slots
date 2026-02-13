import GameFeature from "../../../game-engine/GameFeature.ts";
import { contain, explode } from "../../../game-engine/Math.ts";
import SlotsBase from "../../../game-engine/SlotsBase.ts";
import { Grid, Point, SymbolDef, Timeline, TimelineEvent } from "../../../game-engine/types.ts";
import gsap from "gsap";
import * as PIXI from "pixi.js"

interface EatEngineConfig {
    dispalyWinUnderEater: boolean;
}

export class EatEngineFeature extends GameFeature {
    public eatEngineConfig: EatEngineConfig
    private displayWinText: PIXI.Text
    constructor(game: SlotsBase, eatEngineConfig: EatEngineConfig) {
        super(game, "EAT_SEQUENCE", null);
        this.eatEngineConfig = eatEngineConfig
        this.displayWinText = new PIXI.Text()
        this.displayWinText.style = {
            fontFamily: "Arial",
            fontSize: 36,
            fontWeight: "bold",
            fill: "#ffffff",
            stroke: "#000000",
            align: "center"
        }
    }


    onGridIdle(grid: Grid, timeline: Timeline): boolean {
        let actionHappened = false;
        const eaters = this.config.symbols.filter((s: SymbolDef) => s.isEater === true);
        // We loop until no birds can move anymore (State Machine)
        let movementPossible = true;
        while (movementPossible) {
            movementPossible = false;

            // Sort eaters by priority (e.g., Red first, or Top-Left first)
            // This prevents race conditions where two birds want the same candy
            const activeEaters = eaters.map(def => {
                const positions = contain(def.id, grid); // Find all instances of this bird
                return positions.map(pos => ({ def, pos }));
            }).flat();

            // Check every bird on the current grid state
            for (const { def, pos } of activeEaters) {
                // 1. Calculate the longest valid WALK path from current position
                const walkPath = this.calculateWalkPath(grid, pos, def);

                if (walkPath.length > 0) {
                    actionHappened = true;
                    movementPossible = true; // We moved, so we need to check again after

                    const endPos = walkPath[walkPath.length - 1];

                    let pathWin = 0;
                    walkPath.forEach((step: any) => {
                        if (step.action === 'EAT') {
                            let stepWin = 0
                            const symbolId = grid[step.x][step.y];
                            const symbolDef = this.game.config.symbols.find((s: SymbolDef) => s.id === symbolId);
                            if (symbolDef.name === "wild") {
                                const firstNonWild = walkPath.find((s) => { // find first that is not a wild and plus its win
                                    const i = grid[step.x][step.y];
                                    symbolDef.id != i
                                })
                                if (firstNonWild) {
                                    stepWin += this.config.symbols.find(s => s.id === grid[firstNonWild.x][firstNonWild.y]).payouts[1]
                                }
                                else {
                                    stepWin += .1
                                }
                            }
                            else {
                                console.log(symbolDef)
                                stepWin += symbolDef.payouts[1];
                            }
                            pathWin = stepWin
                            step.win = stepWin
                        }
                    });
                    // 2. Add to Timeline
                    timeline.push({
                        type: this.type,
                        eaterId: def.id,
                        startPos: pos,
                        path: walkPath, // This is now an ordered list: [Step1, Step2, Step3]
                        grid: JSON.parse(JSON.stringify(grid)), // Snapshot before mutation
                        win: pathWin
                    });

                    // 3. UPDATE THE GRID (Crucial!)
                    // A. Clear the path (set eaten symbols to -1)
                    walkPath.forEach(p => {
                        grid[p.x][p.y] = -1;
                    });

                    // B. Move the Bird
                    grid[pos.x][pos.y] = -1; // Remove bird from old spot
                    grid[endPos.x][endPos.y] = def.id; // Place bird at new spot

                    // Break the loop to restart the scan with the updated grid state
                    // This ensures birds don't cross paths incorrectly
                    break;
                }
            }
        }

        if (actionHappened) {
            // 1. Initialize cluster structure (Array of arrays for each column)
            const clustersToProcess = Array.from({ length: this.game.config.cols }, () => [] as number[]);

            // 2. Find all points marked as -1 (eaten)
            const eatenPoints = contain(-1, grid);

            if (eatenPoints) {
                eatenPoints.forEach((p: Point) => {
                    // map the flat points to the column-based structure
                    clustersToProcess[p.x].push(p.y);
                });

                // 3. Call explode once with the aggregated data
                explode(
                    this.game.engine,
                    grid,
                    clustersToProcess,
                    timeline,
                    0,
                    this.game.config.symbols
                );
            }
        }

        console.log("actionHappened", actionHappened)
        return actionHappened;
    }

    /**
     * "Harvester" Logic:
     * 1. Finds ALL connected symbols (The Cluster).
     * 2. Walks a path to collect them all.
     * 3. Backtracks over empty cells if necessary to reach other branches.
     * 4. Ends at the last collected symbol (doesn't return to start needlessly).
     */
    calculateWalkPath(grid: number[][], start: Point, eaterSymbol: SymbolDef) {
        // Step 1: Survey phase - Identify the entire cluster of targets
        const targets = this.findCluster(grid, start, eaterSymbol);

        if (targets.size === 0) return [];

        const path: { x: number, y: number, action: 'EAT' | 'WALK' }[] = [];
        const visitedForTraversal = new Set<string>(); // Tracks where we are currently standing to prevent infinite loops
        visitedForTraversal.add(`${start.x},${start.y}`);

        // Step 2: Harvest phase - Recursive DFS
        this.harvestRecursively(grid, start, targets, visitedForTraversal, path);

        return path;
    }

    /**
     * Recursive function to walk the graph.
     * Returns TRUE if we should stop completely (all targets found).
     */
    private harvestRecursively(
        grid: number[][],
        current: Point,
        targets: Set<string>,
        visited: Set<string>,
        path: { x: number, y: number, action: 'EAT' | 'WALK' }[]
    ): boolean {
        // Priority order: Up, Down, Left, Right
        const directions = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

        // We need to explore neighbors that are in our "Target List"
        for (const dir of directions) {
            const next = { x: current.x + dir.x, y: current.y + dir.y };
            const key = `${next.x},${next.y}`;

            // Is this neighbor a valid target we haven't eaten yet?
            if (targets.has(key)) {

                // 1. EXECUTE MOVE (Eat)
                path.push({ ...next, action: 'EAT' }); // <--- Mark as EAT Add step to animation
                targets.delete(key);   // Remove from To-Do list
                visited.add(key);      // Mark as occupied

                // 2. CHECK IF DONE
                if (targets.size === 0) return true; // Mission Accomplished! Stop here.

                // 3. RECURSE (Keep going deeper)
                const finished = this.harvestRecursively(grid, next, targets, visited, path);
                if (finished) return true; // Propagate the stop signal up the chain

                // 4. BACKTRACK (Walk back)
                // If we are here, it means we hit a dead end, but 'targets' is not empty.
                // We must walk back to 'current' to check other neighbors.
                path.push({ ...current, action: 'WALK' }); // <--- Mark as WALK
            }
        }

        return false; // This branch is done, but targets still exist elsewhere
    }

    /** * Standard FloodFill to find all symbols matching the eater 
     * Returns a Set of "x,y" strings
     */
    private findCluster(grid: number[][], start: Point, eaterSymbol: SymbolDef): Set<string> {
        const targets = new Set<string>();
        const queue = [start];
        const visited = new Set<string>();
        visited.add(`${start.x},${start.y}`);

        while (queue.length > 0) {
            const curr = queue.shift()!;
            const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

            for (const dir of dirs) {
                const next = { x: curr.x + dir.x, y: curr.y + dir.y };
                const key = `${next.x},${next.y}`;

                if (next.x >= 0 && next.x < grid.length && next.y >= 0 && next.y < grid[0].length && !visited.has(key)) {
                    const val = grid[next.x][next.y];

                    // Logic: We can traverse empty space (-1) to find targets, 
                    // OR we found a target
                    if (val === -1) {
                        // It's a gap, we can't eat it, but we might need to look past it?
                        // Usually in Pirots you only look for adjacent MATCHES.
                        // If you want to span gaps, add logic here.
                        // For now, assuming standard adjacency:
                    } else {
                        const symbol = this.config.symbols.find(s => s.id === val);
                        if (this.isMatch(eaterSymbol, symbol)) {
                            visited.add(key);
                            targets.add(key); // Add to To-Do list
                            queue.push(next); // Continue searching from here
                        }
                    }
                }
            }
        }
        return targets;
    }

    isMatch(eater: SymbolDef, target: SymbolDef): boolean {
        if (!target) return false;
        // Example matching logic
        return target.matchesWith && (
            target.matchesWith.includes(eater.name) ||
            target.matchesWith.includes("*")
        );
    }


    getGlobalPos(x: number, y: number) {
        const s = this.game.getSymbol(x, y);
        if (!s) return { x: 0, y: 0 };

        // If symbols are inside a Reel Container that moves, use the parent:
        const g = s.parent.toGlobal(new PIXI.Point(s.x, s.y));
        return this.game.app.stage.toLocal(g);
    }


    async onCustomEvent(event: any): Promise<void> {
        const path = event.path; // Expecting [{x,y, action}, ...]
        const startPos = event.startPos;
        const eaterSprite = this.game.getSymbol(startPos.x, startPos.y);

        const ghost = this.game.spawnGhost(eaterSprite, 99999);
        eaterSprite.visible = false;

        this.displayWinText.text = "0.00"; // Start at 0
        // this.displayWinText.anchor.set(0.5); // Center the text
        this.displayWinText.visible = this.eatEngineConfig.dispalyWinUnderEater;

        // Add to stage so it sits above the grid/ghost
        this.stage.addChild(this.displayWinText);

        // Initial position
        const startGlobal = this.game.getSymbol(startPos.x, startPos.y).getGlobalPosition();
        const startLocal = this.game.stage.toLocal(startGlobal);
        this.displayWinText.x = startLocal.x - this.config.symbolWidth / 3;
        this.displayWinText.y = startLocal.y + this.config.symbolHeight / 2; // Offset above the eater

        const targets = Array.from({ length: this.game.config.cols }, () => [] as number[]);
        path.forEach(p => {
            // Skip start position and duplicates
            if ((p.x === startPos.x && p.y === startPos.y) || targets[p.x].includes(p.y)) return;
            targets[p.x].push(p.y);
        });

        // Map over columns: if rows exist, call effect (returns Promise), else return 0 (ignored)
        // Promise.all waits for all effect promises to resolve in parallel
        await Promise.all(targets.map((rows, col) => rows.length && this.reels[col].playMatchEffects(rows)));

        let currentPathWin = 0
        for await (const step of path) {
            const dest = this.game.stage.toLocal(this.game.getSymbol(step.x, step.y).getGlobalPosition());

            await new Promise<void>(r => gsap.to(ghost, {
                x: dest.x,
                y: dest.y,
                duration: 0.2,
                ease: "power4.inOut",
                onUpdate: () => {
                    // Keep text attached to ghost position during tween
                    if (this.eatEngineConfig.dispalyWinUnderEater) {
                        this.displayWinText.x = ghost.x - this.config.symbolWidth / 3;
                        this.displayWinText.y = ghost.y + this.config.symbolHeight / 2;
                    }
                },
                onComplete: () => r()
            }));
            if (step.action === 'EAT') {
                currentPathWin += step.win
                const targetSprite = this.game.getSymbol(step.x, step.y);
                if (targetSprite) {
                    targetSprite.visible = false;
                    if (this.eatEngineConfig.dispalyWinUnderEater) {
                        this.displayWinText.text = currentPathWin.toFixed(2)
                    }
                }
            }
        }

        const end = path[path.length - 1]
        this.game.getSymbol(path[path.length - 1].x, path[path.length - 1].y).visible = true
        this.game.getSymbol(end.x, end.y).texture = eaterSprite.texture
        this.reels[end.x].applySymbolStyle(this.game.getSymbol(end.x, end.y), event.eaterId)
        ghost.destroy();
        setTimeout(() => {
            this.displayWinText.visible = false

        }, this.config.delayBeforeCascading);
    }
}