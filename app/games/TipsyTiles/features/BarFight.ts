import GameFeature from "../../../game-engine/GameFeature.ts";
import gsap from "gsap";
import { Text } from "pixi.js";
import { SymbolDef, Grid, Timeline, FeatureEvent, TimelineEvent, Point } from "../../../game-engine/types.ts";
import SlotsBase from "../../../game-engine/SlotsBase.ts";
import { contain, explodePoints, getRandomSymbolId, insertPoints } from "../../../game-engine/Math.ts";
import { playBarFight } from "./BarFightEffect.ts";

export class BarFightFeature extends GameFeature {
    private dirs = [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }]

    constructor(game: SlotsBase) {
        super(game, "BAR_FIGHT", null);
    }

    onGridIdle(grid: Grid, timeline: Timeline): boolean {

        const clusters = this.findEaterClusters(grid)
            .filter(c => c.length >= 3)


        if (!clusters.length) return false

        const fighters: Point[] = clusters[0]

        const eaterIds = fighters.map(fighter => grid[fighter.x][fighter.y])
        console.log(this.config.symbols.filter(s => eaterIds.includes(s.id)).map(s => s.name))

        // Use maps to guarantee uniqueness
        const collateralMap = new Map<string, Point>()
        const explodeMap = new Map<string, Point>()

        const keyOf = (p: Point) => `${p.x},${p.y}`

        // Add fighters first
        fighters.forEach(p => explodeMap.set(keyOf(p), p))

        // Collect collateral uniquely
        fighters.forEach(pos => {
            const neighbours = this.symbolsInArea(pos, this.config.symbols, grid)

            neighbours.forEach(p => {
                const key = keyOf(p)
                collateralMap.set(key, p)
                explodeMap.set(key, p) // union directly
            })
        })

        const collateral = Array.from(collateralMap.values())
        const toExplode = Array.from(explodeMap.values())

        timeline.push({
            type: this.type,
            grid: structuredClone(grid),
            fighters,
            collateral
        })

        explodePoints(this.engine, grid, toExplode, timeline, 0, this.config.symbols)

        if (eaterIds.length > 0) {
            const replacements: { x: number, y: number, symbolId: number }[] = [];
            const takenPositions = new Set<string>();
            let attempts = 0;
            const MAX_ATTEMPTS = 50; // Prevent infinite loops

            // We want exactly 4 new symbols
            while (replacements.length < 4 && attempts < MAX_ATTEMPTS) {
                attempts++;

                // B. Pick Random Coordinates
                const rx = Math.floor(this.engine.random() * this.config.cols);
                const ry = Math.floor(this.engine.random() * this.config.rows);
                const key = `${rx},${ry}`;

                // C. Validation
                // 1. Don't pick the same spot twice in this batch
                if (takenPositions.has(key)) continue;

                // 2. Optional: Don't overwrite an existing Eater (if desired)
                // if (eaterIds.includes(grid[rx][ry])) continue; 

                // D. Select Random Eater ID
                // Use engine.random() to keep it seeded/deterministic
                const randomEaterId = eaterIds[Math.floor(this.engine.random() * eaterIds.length)];

                takenPositions.add(key);
                replacements.push({
                    x: rx,
                    y: ry,
                    symbolId: randomEaterId
                });
            }

            // E. Call the helper to update Grid + Timeline
            if (replacements.length > 0) {
                insertPoints(grid, replacements, timeline);
            }
        }

        return true
    }




    async onCustomEvent(event: FeatureEvent): Promise<void> {
        await playBarFight(event, this.game, this.game.reelContainer);
    }

    symbolsInArea(pos: Point, symbols: SymbolDef[], grid: Grid): Point[] {
        const positionsFound: Point[] = []
        this.dirs.forEach(dir => {
            if (pos.x + dir.x < this.config.cols && pos.x + dir.x >= 0 &&
                pos.y + dir.y < this.config.rows && pos.y + dir.y >= 0
            ) {
                if (symbols.some(s => s.id == grid[pos.x + dir.x][pos.y + dir.y])) {
                    positionsFound.push({ x: pos.x + dir.x, y: pos.y + dir.y })
                }

            }
        })
        return positionsFound
    }

    private findEaterClusters(grid: Grid): Point[][] {
        const visited = new Set<string>()
        const clusters: Point[][] = []
        const eaterIds = new Set(this.config.symbols.filter(s => s.isEater).map(s => s.id))

        for (let x = 0; x < this.config.cols; x++) {
            for (let y = 0; y < this.config.rows; y++) {

                const key = `${x},${y}`
                if (visited.has(key)) continue
                if (!eaterIds.has(grid[x][y])) continue

                // --- flood fill ---
                const stack = [{ x, y }]
                const cluster: Point[] = []
                visited.add(key)

                while (stack.length) {
                    const p = stack.pop()!
                    cluster.push(p)

                    for (const d of this.dirs) {
                        const nx = p.x + d.x
                        const ny = p.y + d.y
                        const nk = `${nx},${ny}`

                        if (
                            nx >= 0 && nx < this.config.cols &&
                            ny >= 0 && ny < this.config.rows &&
                            !visited.has(nk) &&
                            eaterIds.has(grid[nx][ny])
                        ) {
                            visited.add(nk)
                            stack.push({ x: nx, y: ny })
                        }
                    }
                }

                clusters.push(cluster)
            }
        }

        return clusters
    }

}