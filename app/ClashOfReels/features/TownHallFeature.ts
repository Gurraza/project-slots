import GameFeature from "../../game-engine/GameFeature.ts";
import gsap from "gsap";
import { Text } from "pixi.js";
import { SymbolDef, Grid, Timeline, FeatureEvent, TimelineEvent } from "../../game-engine/types.ts";
import SlotsBase from "../../game-engine/SlotsBase.ts";

// 1. Extend the Symbol definition to include the custom 'multiplier' property
interface TownHallSymbol extends SymbolDef {
    multiplier: number;
}

// 2. Define the Custom Event shape
interface TownHallEvent extends FeatureEvent {
    multiplier: number;
}

const featureSymbols: TownHallSymbol[] = [
    "Building_HV_Town_Hall_level_1.png",
    "Building_HV_Town_Hall_level_2.png",
    "Building_HV_Town_Hall_level_3.png",
    "Building_HV_Town_Hall_level_4.png",
    "Building_HV_Town_Hall_level_5.png",
    "Building_HV_Town_Hall_level_6.png",
    "Building_HV_Town_Hall_level_7.png",
    "Building_HV_Town_Hall_level_8.png",
    "Building_HV_Town_Hall_level_9.png",
    "Building_HV_Town_Hall_level_10.png",
].map((fileName, index) => {
    return {
        name: `townhall_${index + 1}`,
        group: "townhall",
        weight: 5,
        scale: 0.8,
        dontCluster: true,
        path: `TH/${fileName}`,
        multiplier: index + 1
    };
});

export class TownHallFeature extends GameFeature {
    // 3. Define the map with a strict record type
    private townHallIdMap: Record<number, number> = {};

    constructor(game: SlotsBase) {
        // Pass null or undefined for the specific symbol if this feature manages multiple symbols
        super(game, "TOWNHALL_FEATURE", undefined as any);
    }

    getSymbols(): SymbolDef[] {
        return featureSymbols;
    }

    init() {
        this.townHallIdMap = {};

        featureSymbols.forEach(sym => {
            const registeredSymbol = this.game.config.symbols.find(s => s.name === sym.name);
            if (registeredSymbol && registeredSymbol.id !== undefined) {
                this.townHallIdMap[registeredSymbol.id] = sym.multiplier;
            }
        });
    }

    onSpinEnd(grid: Grid, timeline: Timeline): boolean {
        let multiplierSum = 0;

        for (let c = 0; c < this.game.config.cols; c++) {
            for (let r = 0; r < this.game.config.rows; r++) {
                const id = grid[c][r];
                if (this.townHallIdMap[id]) {
                    multiplierSum += this.townHallIdMap[id];
                }
            }
        }

        if (multiplierSum > 0) {
            timeline.push({
                type: this.type,
                grid: JSON.parse(JSON.stringify(grid)),
                multiplier: multiplierSum,
                win: multiplierSum
            } as TownHallEvent); // Cast to allow custom prop 'multiplier'

            return true;
        }
        return false;
    }

    async onCustomEvent(event: TimelineEvent): Promise<void> {
        if (event.type !== this.type) return

        // Cast to our specific event type to access 'multiplier' and 'previousWin'
        const thEvent = event as TownHallEvent;

        // 1. Identify all Town Hall instances on the grid first
        const targets: { sprite: any, multiplier: number }[] = [];
        const cols = this.game.config.cols;
        const rows = this.game.config.rows;

        // Note: Using this.game.reels instead of this.reels
        for (let c = 0; c < cols; c++) {
            // Sort to ensure display order if needed (assuming public method exists)
            this.game.reels[c].sort();

            for (let r = 0; r < rows; r++) {
                // Safe check for grid existence
                if (!thEvent.grid) continue;

                const symbolId = thEvent.grid[c][r];

                // Check if this ID is in our TownHall map
                const multiplier = this.townHallIdMap[symbolId];

                if (multiplier) {
                    // Ensure the sprite actually exists in the view
                    // Using r + 1 to account for buffer, as per original logic
                    const reel = this.game.reels[c];
                    if (reel && reel.symbols[r + 1]) {
                        targets.push({
                            sprite: reel.symbols[r + 1],
                            multiplier: multiplier
                        });
                    }
                }
            }
        }

        let currentSum = 0;

        // 2. Iterate and animate them SEQUENTIALLY
        for (const target of targets) {
            const { sprite, multiplier } = target;
            const globalPos = this.game.stage.toLocal(sprite.getGlobalPosition());

            currentSum += multiplier;

            // --- A. WOBBLE ANIMATION ---
            const baseScale = sprite.scale.x;
            gsap.timeline()
                .to(sprite.scale, { x: baseScale * 1.15, y: baseScale * 1.15, duration: 0.1 })
                .to(sprite.scale, { x: baseScale * 0.9, y: baseScale * 0.9, duration: 0.1 })
                .to(sprite.scale, { x: baseScale * 1.1, y: baseScale * 1.1, duration: 0.1 })
                .to(sprite.scale, { x: baseScale, y: baseScale, duration: 0.1, ease: "elastic.out(1, 0.3)" });

            // --- B. FLYING TEXT ANIMATION ---
            const bonusText = new Text({
                text: `+${multiplier}x`,
                style: {
                    fontFamily: "cocFont",
                    fontSize: 80,
                    fontWeight: "bold",
                    fill: "#FFD700",
                    stroke: { color: "#000000", width: 6 },
                    dropShadow: true,
                }
            });

            bonusText.anchor.set(0.5);
            bonusText.position.set(globalPos.x, globalPos.y);
            bonusText.scale.set(0);
            this.game.stage.addChild(bonusText);

            // Determine Destination (Fallback if UI element is missing)
            // Using this.game.ui.multiplierContainer as target
            const targetObj = this.game.ui.multiplierContainer;
            let destX = this.game.config.width - 100;
            let destY = 100;

            if (targetObj && targetObj.visible) {
                const pos = this.game.stage.toLocal(targetObj.getGlobalPosition());
                destX = pos.x;
                destY = pos.y;
            }

            // --- C. AWAIT COMPLETION ---
            await new Promise<void>(resolve => {
                const tl = gsap.timeline({
                    onComplete: () => {
                        bonusText.destroy();
                        resolve();
                    }
                });

                // 1. Pop In
                tl.to(bonusText.scale, { x: 1, y: 1, duration: 0.3, ease: "back.out(1.7)" });

                // 2. Fly to corner
                tl.to(bonusText, {
                    x: destX,
                    y: destY,
                    duration: 0.6,
                    ease: "power2.inOut"
                }, ">0.1");

                // 3. Shrink/Fade at destination
                tl.to(bonusText.scale, { x: 0.5, y: 0.5, duration: 0.2 }, ">-0.15");
                tl.to(bonusText, { alpha: 0, duration: 0.2 }, "<");
            });

            // 3. Progressive Update
            const prevWin = thEvent.previousWin || 0;
            this.game.ui.setMultiplier(prevWin * currentSum);
        }

        // Final set to total win from event to ensure accuracy
        if (thEvent.totalWin !== undefined) {
            this.game.ui.setMultiplier(thEvent.totalWin);
        }

        return
    }
}