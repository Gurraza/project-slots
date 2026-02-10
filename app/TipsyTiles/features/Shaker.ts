import GameFeature from "../../game-engine/GameFeature.ts";
import gsap from "gsap";
import { Text } from "pixi.js";
import { SymbolDef, Grid, Timeline, FeatureEvent, TimelineEvent } from "../../game-engine/types.ts";
import SlotsBase from "../../game-engine/SlotsBase.ts";
import { contain } from "../../game-engine/Math.ts";

const openedShakerSymbol: SymbolDef = {
    name: "opened_shaker",
    weight: 0,
    path: "Shaker_opened.png",
}

export class ShakerFeature extends GameFeature {

    constructor(game: SlotsBase, symbol: SymbolDef) {
        // Pass null or undefined for the specific symbol if this feature manages multiple symbols
        super(game, "SHAKER", symbol);
    }

    getSymbols() {
        if (!this.featureSymbol) return []
        return [
            this.featureSymbol,
            openedShakerSymbol
        ];
    }

    onGridPreProcess(grid: Grid, timeline: Timeline): boolean {
        const shakerPos = contain(this.featureSymbol.id, grid)
        if (shakerPos.length > 0) {
            // det finns en shaker, uppgradera alla symboler
            const moves: any[] = [];
            const shakerX = shakerPos[0].x
            const shakerY = shakerPos[0].y
            grid[shakerX][shakerY] = openedShakerSymbol.id
            moves.push({
                x: shakerX,
                y: shakerY,
                newId: openedShakerSymbol.id,
                oldId: this.featureSymbol.id // Optional: useful if you want transition animations based on old symbol
            });
            let hasChanges = false;
            grid.forEach((col, i) => {
                col.forEach((row, j) => {
                    const id = grid[i][j]
                    const currentSymbol: SymbolDef = this.config.symbols.find((s: SymbolDef) => s.id === id)
                    if (!currentSymbol) return;

                    let nextLevelName = null;

                    // Check for level 1 -> 2
                    if (currentSymbol.name.endsWith("_1")) {
                        nextLevelName = currentSymbol.name.replace("_1", "_2");
                    }
                    // Check for level 2 -> 3
                    else if (currentSymbol.name.endsWith("_2")) {
                        nextLevelName = currentSymbol.name.replace("_2", "_3");
                    }

                    if (nextLevelName) {
                        // Find the definition for the next level symbol
                        const nextSymbol = this.config.symbols.find((s: SymbolDef) => s.name === nextLevelName);

                        if (nextSymbol) {
                            // Update Grid Logic
                            grid[i][j] = nextSymbol.id;

                            // Record change for visual timeline
                            moves.push({
                                x: i,
                                y: j,
                                newId: nextSymbol.id,
                                oldId: currentSymbol.id // Optional: useful if you want transition animations based on old symbol
                            });
                            hasChanges = true;
                        }
                    }
                    // then same for name with 2 in it
                })
            })
            if (hasChanges) {
                timeline.push({
                    type: this.type,
                    changes: moves,
                    grid: JSON.parse(JSON.stringify(grid)),
                    shakerPos: { x: shakerX, y: shakerY }
                });
                return true;
            }
        }

        return false
    }


    async onCustomEvent(event: FeatureEvent): Promise<void> {
        // Change type from Promise<void>[] to Promise<any>[] 
        // to accept the number returned by insertIntoGrid
        const promises: Promise<any>[] = [];
        await this.reels[event.shakerPos.x].playMatchEffects([event.shakerPos.y])
        event.changes.forEach(change => {
            promises.push(this.game.insertIntoGrid({ x: change.x, y: change.y }, change.newId));
        });

        await Promise.all(promises);
    }
}