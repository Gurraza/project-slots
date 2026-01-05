import GameFeature from "@/app/game-engine/GameFeature";
import gsap from "gsap"
import { Sprite, Assets, Container, Text, Graphics, FillGradient } from "pixi.js"

const featureSymbol = {
    name: "treasureGoblin",
    weight: [150, 75, 25],
    scale: 1.4,
    group: "bonus_game",
    onlyAppearOnRoll: true,
    path: "treasure_goblin.png",
    anticipation: {
        after: 2,
        count: 15,
    },
    onePerReel: true,
    dontCluster: true,
    explodeMatch: "TREASURE_GOBLIN_MATCH"
}

export class TreasureGoblinFeature extends GameFeature {
    constructor(game) {
        super(game, "TREASURE_GOBLIN_FEATURE", featureSymbol)

        this.bonusConfig = {
            freeSpins: 5,
            newSymbols: [
                { name: "gem", weight: 500, explodeEffect: "RESOURCE_TRAVEL_TO_UI" },
                { name: "gold", weight: 1500, explodeEffect: "RESOURCE_TRAVEL_TO_UI" },
                { name: "elixir", weight: 1500, explodeEffect: "RESOURCE_TRAVEL_TO_UI" },
                { name: "darkelixir", weight: 1000, explodeEffect: "RESOURCE_TRAVEL_TO_UI" },
                { name: "treasureGoblin", weight: 20, clusterSize: 1 },
                ...this.config.symbols.filter(s => s.group === "low_troop").map(s => ({ name: s.name, weight: 5400 / 6 }))
            ],
            resources: {
                "gold": { icon: "gold", current: 0, max: 20, colorTop: "rgb(246, 220, 113)", colorBot: "rgb(232, 190, 16)" },
                "elixir": { icon: "elixir", current: 0, max: 20, colorTop: "rgb(226, 145, 227)", colorBot: "rgb(193, 38, 193)" },
                "darkelixir": { icon: "darkelixir", current: 0, max: 15, colorTop: "rgb(143, 130, 150)", colorBot: "rgb(41, 11, 52)" },
                "gem": { icon: "gem", current: 0, max: 10, colorTop: "rgb(136, 237, 79)", colorBot: "rgb(23, 138, 26)" },
            }
        };

        this.effects = [
            "TREASURE_GOBLIN_MATCH",
            "RESOURCE_TRAVEL_TO_UI"
        ]
    }

    onSpinEnd(grid, timeline, totalWin) {
        const treasureGoblinCount = this.game.contain(this.id, grid).length
        if (this.config.mode === "normal" && treasureGoblinCount === 3) {
            timeline.push({
                type: this.type,
                grid: JSON.parse(JSON.stringify(grid)),
                totalWin: totalWin
            })
            return true
        }
        else if (this.config.mode === this.type && treasureGoblinCount) {
            this.freeSpins += treasureGoblinCount.length
        }
        return false
    }

    async onCustomEvent(event) {
        this.config.mode = event.type

        this.treasureGoblinWin = 0;
        this.createResourceUI()
        console.log("!!! ENTERING TREASURE GOBLIN BONUS !!!");
        await this.game.playBonusTransition("BONUS ROUND\nTREASURE GOBLIN");

        this.game.drawBackgroundCells("green")

        this.freeSpins = this.bonusConfig.freeSpins
        const original = this.config.symbols.map(s => {
            return {
                weight: s.weight,
                anticipation: s.anticipation,
                group: s.group,
                explodeEffect: s.explodeEffect
            }
        });
        this.config.symbols.forEach(s => {
            s.weight = 0
            s.group = undefined
            s.anticipation = {
                after: 999999
            }
        })
        this.bonusConfig.newSymbols.forEach(newSymbol => {
            const symbolToUpdate = this.config.symbols.find(s => s.name === newSymbol.name);

            if (symbolToUpdate) {
                symbolToUpdate.weight = newSymbol.weight;
                symbolToUpdate.anticipation = undefined
                symbolToUpdate.group = undefined
                if (newSymbol.clusterSize) {
                    symbolToUpdate.clusterSize = newSymbol.clusterSize;
                }
                if (newSymbol.explodeEffect) {
                    symbolToUpdate.explodeEffect = newSymbol.explodeEffect
                }
            }
        });
        // --- EMIT INITIAL COUNT ---

        this.game.emitEvent({ type: 'FREE_SPINS_UPDATE', count: this.freeSpins, open: true });

        await new Promise(r => setTimeout(r, 1000))

        while (this.freeSpins > 0) {
            this.freeSpins--

            this.game.emitEvent({ type: 'FREE_SPINS_UPDATE', count: this.freeSpins, open: true });

            const res = await this.game.spin()
            if (this.freeSpins === 0) {

                this.game.emitEvent({ type: 'FREE_SPINS_UPDATE', count: this.freeSpins, open: false });

            }
            await new Promise(r => setTimeout(r, 500));
        }
        this.config.symbols.forEach((s, index) => {
            s.weight = original[index].weight;
            s.anticipation = original[index].anticipation
            s.group = original[index].group
            s.explodeEffect = original[index].explodeEffect
        });

        this.game.drawBackgroundCells("black")
        await this.game.playBonusTransition(`TOTAL WIN\n${this.treasureGoblinWin.toFixed(2)}x`);
        this.resourceContainer.destroy()

    }



    createResourceUI() {
        this.resourceContainer = new Container();

        // Position Logic
        const marginX = this.config.isMobile ? 20 : 10;
        const marginY = this.config.isMobile ? 60 : 40;
        this.resourceContainer.x = this.config.width - marginX;
        this.resourceContainer.y = marginY;
        this.stage.addChild(this.resourceContainer);

        this.resourceTexts = {};
        this.resourceBars = {};

        // Convert the config object keys into an array to iterate
        const resourceKeys = Object.keys(this.bonusConfig.resources);
        resourceKeys.forEach((key, index) => {
            const resourceData = this.bonusConfig.resources[key];

            this.createResourceBar({
                type: key, // "gold", "elixir", etc.
                icon: resourceData.icon,
                colorTop: resourceData.colorTop,
                colorBot: resourceData.colorBot,
                y: index * 70,
                initialVal: resourceData.current, // Read from Source of Truth
                maxVal: resourceData.max          // Read from Source of Truth
            });
        });
    }

    createResourceBar({ type, icon, colorTop, colorBot, y, initialVal, maxVal }) {
        const container = new Container();
        container.y = y;

        const barWidth = 250;
        const barHeight = 35;
        const radius = 5;
        const gradient = new FillGradient({
            start: { x: 0, y: 0 },
            end: { x: 0, y: 1 },
            textureSpace: 'local',
            type: "linear",
            colorStops: [
                { offset: 0, color: colorTop },
                { offset: .45, color: colorTop },
                { offset: .55, color: colorBot },
                { offset: 1, color: colorBot },
            ],
        });

        // B. Background Bar
        const bgBar = new Graphics();
        bgBar.roundRect(-barWidth, 0, barWidth, barHeight, radius);
        bgBar.fill({ color: 0x4a4a4a, alpha: 0.4 });
        bgBar.stroke({ color: 0x000000, width: 2 });
        container.addChild(bgBar);

        // C. Fill Bar
        const fillBar = new Graphics();

        // --- MODULO CHANGE HERE ---
        const safeMax = maxVal || 1;
        // Use modulo to wrap the value. 
        // e.g. if current is 25 and max is 20, percent is 0.25 (5/20)
        const percent = (initialVal % safeMax) / safeMax;

        const currentWidth = barWidth * percent;

        if (currentWidth > 0) {
            fillBar.roundRect(-currentWidth, 0, currentWidth, barHeight, radius).fill(gradient);
        }

        container.addChild(fillBar);

        const maxText = new Text({
            text: maxVal.toString(),
            style: {
                fontFamily: "cocFont",
                fontSize: 12,
                fill: "white",
                stroke: { color: "black", width: 1 }
            }
        });

        maxText.anchor.set(0, 0);
        maxText.x = -barWidth + 5;
        maxText.y = 2;
        container.addChild(maxText);

        // SAVE REFERENCE
        this.resourceBars[type] = {
            graphics: fillBar,
            maxWidth: barWidth,
            maxVal: maxVal,
            fillStyle: gradient
        };

        // D. Value Text
        const valueText = new Text({
            text: initialVal.toLocaleString().replace(/,/g, " "),
            style: {
                fontFamily: "cocFont",
                fontSize: 24,
                fill: "white",
                stroke: { color: "black", width: 3 },
            }
        });
        valueText.anchor.set(1, 0.5);
        valueText.x = -50;
        valueText.y = barHeight / 2;
        container.addChild(valueText);
        this.resourceTexts[type] = valueText;

        // E. Icon
        if (Assets.get(icon)) {
            const iconSprite = new Sprite(Assets.get(icon));
            iconSprite.anchor.set(0.5);
            iconSprite.x = -25;
            iconSprite.y = barHeight / 2;
            const scale = 50 / iconSprite.height;
            iconSprite.scale.set(scale);
            container.addChild(iconSprite);
        }

        this.resourceContainer.addChild(container);
    }

    updateResource(type, amountToAdd) {
        const resourceData = this.bonusConfig.resources[type];

        if (!resourceData || !this.resourceTexts[type]) {
            return;
        }

        const startValue = resourceData.current;
        const maxVal = resourceData.max;

        // 1. Calculate "Level" BEFORE update
        // e.g. 18/20 = Level 0.    25/20 = Level 1.
        const startLevel = Math.floor(startValue / maxVal);

        // 2. Update Source of Truth
        resourceData.current += amountToAdd;
        const endValue = resourceData.current;

        // 3. Calculate "Level" AFTER update
        const endLevel = Math.floor(endValue / maxVal);

        // 4. Determine how many times we crossed the threshold
        const levelDiff = endLevel - startLevel;

        if (levelDiff > 0) {
            const winToAdd = levelDiff * 5; // 5x per bar completion
            this.treasureGoblinWin += winToAdd;

            console.log(`Resource ${type} leveled up! +${winToAdd}x`);

            // Trigger Visual Feedback for the win
            this.showFloatingText(`+${winToAdd}x`, this.resourceBars[type].graphics);
        }

        // 5. GSAP Animation (Same as before)
        const animProxy = { value: startValue };

        gsap.to(animProxy, {
            value: endValue,
            duration: 0.8,
            ease: "power1.out",
            onUpdate: () => {
                const currentVal = animProxy.value;
                this.resourceTexts[type].text = Math.floor(currentVal).toLocaleString().replace(/,/g, " ");

                if (this.resourceBars[type]) {
                    const barData = this.resourceBars[type];
                    // Modulo logic for the bar
                    const remainder = currentVal % barData.maxVal;
                    const percent = remainder / barData.maxVal;
                    const currentWidth = barData.maxWidth * percent;

                    barData.graphics.clear();
                    if (currentWidth > 0.5) {
                        barData.graphics
                            .roundRect(-currentWidth, 0, currentWidth, 35, 5)
                            .fill(barData.fillStyle);
                    }
                }
            },
            onComplete: () => {
                this.resourceTexts[type].text = endValue.toLocaleString().replace(/,/g, " ");
                // Final clean render to fix float inaccuracies
                if (this.resourceBars[type]) {
                    const barData = this.resourceBars[type];
                    const remainder = endValue % barData.maxVal;
                    const percent = remainder / barData.maxVal;
                    const currentWidth = barData.maxWidth * percent;
                    barData.graphics.clear();
                    if (currentWidth > 0.5) {
                        barData.graphics
                            .roundRect(-currentWidth, 0, currentWidth, 35, 5)
                            .fill(barData.fillStyle);
                    }
                }
            }
        });
    }

    showFloatingText(textStr, targetObject) {
        const text = new Text({
            text: textStr,
            style: {
                fontFamily: "cocFont",
                fontSize: 40,
                fill: "#FFFF00", // Bright Yellow
                stroke: { color: "#000000", width: 4 },
                dropShadow: true,
                dropShadowDistance: 2
            }
        });

        // Convert target position to global, then local to stage, or just parent it to the container
        // Since resourceBars are inside resourceContainer, we can add this to resourceContainer too
        const pos = targetObject.position;

        text.anchor.set(0.5);
        // Position it slightly to the left of the bar
        text.x = pos.x - 280;
        text.y = targetObject.parent.y + 17; // Align with bar center

        this.resourceContainer.addChild(text);

        // Animate: Pop up and fade out
        gsap.timeline({ onComplete: () => text.destroy() })
            .fromTo(text.scale, { x: 0, y: 0 }, { x: 1, y: 1, duration: 0.4, ease: "back.out(1.7)" })
            .to(text, { y: text.y - 50, duration: 1, ease: "power1.out" }, "<")
            .to(text, { alpha: 0, duration: 0.3 }, ">-0.3");
    }


    async playEffect(effect, sprite, symbol) {
        console.log("effect", effect)
        if (effect === "TREASURE_GOBLIN_MATCH") {
            const tl = gsap.timeline({});
            tl.to(sprite.scale, { x: sprite.scale.x * 1.2, y: sprite.scale.y * 1.2, duration: 0.1, yoyo: true, repeat: 3 })
            tl.to(sprite, { pixi: { tint: 0xFFD700 }, duration: 0.1, yoyo: true, repeat: 3 }, "<");
            await tl
        }
        else if (effect === "RESOURCE_TRAVEL_TO_UI") {
            const resourceType = symbol.name
            const targetElement = this.resourceTexts[resourceType]
            if (!targetElement) {
                return;
            }
            const ghost = this.game.spawnGhost(sprite)
            const to = this.stage.toLocal(targetElement.getGlobalPosition())

            const tl = gsap.timeline({
                onComplete: () => {
                    ghost.destroy();
                    console.log(resourceType)
                    this.updateResource(resourceType, 1);
                    gsap.fromTo(targetElement.scale, { x: 1.5, y: 1.5 }, { x: 1, y: 1, duration: 0.2 });
                }
            })
            tl.to(ghost, {
                x: to.x,
                y: to.y,
                rotation: Math.random() * 5,
                duration: 0.6,
                ease: "back.in(1.2)"
            })
            tl.to(ghost, { alpha: 0, duration: 0.1 }, ">-0.1");
            await tl
        }
    }
}