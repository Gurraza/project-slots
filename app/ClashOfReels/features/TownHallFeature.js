import GameFeature from "@/app/game-engine/GameFeature";
import gsap from "gsap"
import { Text } from "pixi.js"

const featureSymbols = [
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
    constructor(game) {
        super(game, "TOWNHALL_FEATURE", null)
    }

    getSymbols() {
        return featureSymbols
    }
    init() {
        this.townHallIdMap = {}; // Maps ID -> Multiplier

        featureSymbols.forEach(sym => {
            const registeredSymbol = this.config.symbols.find(s => s.name === sym.name);
            if (registeredSymbol) {
                this.townHallIdMap[registeredSymbol.id] = registeredSymbol.multiplier;
            }
        });
    }

    onSpinEnd(grid, timeline) {
        let multiplierSum = 0;

        for (let c = 0; c < this.config.cols; c++) {
            for (let r = 0; r < this.config.rows; r++) {
                const id = grid[c][r];
                if (this.townHallIdMap[id]) {
                    multiplierSum += this.townHallIdMap[id];
                }
            }
        }

        if (multiplierSum > 0) {
            timeline.push({
                type: this.type, // Unique identifier for the frontend
                grid: JSON.parse(JSON.stringify(grid)), // Maintain grid state
                multiplier: multiplierSum,
                win: multiplierSum
            });
            return true
        }
        return false
    }

    async onCustomEvent(event) {
        if (event.type === this.type) {
            // 1. Identify all Town Hall instances on the grid first
            const targets = [];
            for (let c = 0; c < this.config.cols; c++) {
                this.reels[c].sort()
                for (let r = 0; r < this.config.rows; r++) {
                    const symbolId = event.grid[c][r];
                    const symbolDef = this.config.symbols.find(s => s.id === symbolId);

                    if (symbolDef && symbolDef.name.includes("townhall")) {
                        // Ensure the sprite actually exists in the view
                        if (this.reels[c] && this.reels[c].symbols[r + 1]) {
                            targets.push({
                                sprite: this.reels[c].symbols[r + 1],
                                multiplier: symbolDef.multiplier // Use the specific multiplier for this TH level
                            });
                        }
                    }
                }
            }
            let sum = 0
            // 2. Iterate and animate them SEQUENTIALLY
            // We use a for...of loop here because standard .forEach does not support await
            for (const target of targets) {
                const { sprite, multiplier } = target;
                const globalPos = this.stage.toLocal(sprite.getGlobalPosition());
                sum += multiplier
                // --- A. WOBBLE ANIMATION (Visual only, runs parallel to text start) ---
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
                        dropShadowBlur: 4,
                        dropShadowDistance: 4,
                    }
                });

                bonusText.anchor.set(0.5);
                bonusText.position.set(globalPos.x, globalPos.y);
                bonusText.scale.set(0);
                this.stage.addChild(bonusText);

                const destX = this.game.multiplierText ? this.stage.toLocal(this.multiplierText.getGlobalPosition()).x : this.config.width - 100;
                const destY = this.game.multiplierText ? this.stage.toLocal(this.multiplierText.getGlobalPosition()).y : 100;

                // --- C. AWAIT COMPLETION ---
                // The loop pauses here until this specific text flies and destroys itself
                await new Promise(resolve => {
                    const tl = gsap.timeline({
                        onComplete: () => {
                            bonusText.destroy();
                            resolve(); // Signals the loop to continue to the next Town Hall
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

                // 3. Final Update (Only happens after all Town Halls are done)
                this.game.setMultiplier(event.previousWin * sum)
            }

            this.game.setMultiplier(event.totalWin);
        }
    }
}