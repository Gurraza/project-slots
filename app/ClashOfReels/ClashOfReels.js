import SlotsBase from '../game-engine/SlotsBase';
import gsap from "gsap"
import { Assets, Sprite, Graphics, Text, Container, ColorMatrixFilter, FillGradient } from "pixi.js"
import { EagleArtilleryFeature } from './features/EagleArtilleryFeature';
import { ClanCastleFeature } from './features/ClanCastleFeature';
import { WardenFeature } from './features/WardenFeature';
import { TownHallFeature } from './features/TownHallFeature';
import { MinesFeature } from './features/MinesFeature';
import { TreasureGoblinFeature } from './features/TreasureGoblinFeature';
import { SuperTroopFeature } from './features/SuperTroopFeature';

const SYMBOLS = [
    {
        name: 'barbarian',
        weight: 1000,
        group: "low_troop",
        scale: .9,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "troops_icons/barbarian.png"
    },
    {
        name: 'archer',
        weight: 1000,
        group: "low_troop",
        scale: .9,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "troops_icons/archer.png"
    },
    {
        name: 'goblin',
        weight: 1000,
        group: "low_troop",
        scale: .9,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "troops_icons/goblin.png"
    },
    {
        name: 'wizard',
        weight: 800,
        group: "high_troop",
        scale: .9,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "troops_icons/wizard.png"
    },
    {
        name: 'pekka',
        weight: 800,
        group: "high_troop",
        scale: .9,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "troops_icons/pekka.png"
    },
    {
        name: 'dragon',
        weight: 800,
        group: "high_troop",
        scale: .9,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "troops_icons/dragon.png"
    },
    {
        name: 'wallbreaker',
        weight: 0,
        scale: .9,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "troops_icons/wallbreaker.png"
    },
    {
        name: 'gold',
        weight: 1000,
        group: "low_resource",
        scale: 1,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "resource/gold.png"
    },
    {
        name: 'elixir',
        weight: 1000,
        group: "low_resource",
        scale: .8,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "resource/elixir.png"
    },
    {
        name: 'darkelixir',
        weight: 1000,
        group: "low_resource",
        scale: .8,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "resource/dark_elixir.png"
    },
    {
        name: 'gem',
        weight: 800,
        group: "low_resource",
        scale: .8,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "resource/gem.png",
    },

];

const wildCard = {
    name: "wild",
    weight: 150,
    scale: 1,
    path: "super_icon.png",
    matchesWith: ["*"],
}


const builder = {
    name: "builder",
    scale: 1,
    path: "Builder.png",
    weight: [5],
    onlyAppearOnRoll: true,
    matchEffect: "builder_match",
    explodeEffect: "builder_poof",
    clusterSize: 1,
    dontCluster: true,
    prio: true,
}



SYMBOLS.push(builder)
SYMBOLS.push(wildCard)

export default class ClashOfReels extends SlotsBase {

    static backgroundImage = "/games/ClashOfReels/background.jpg"
    constructor(rootContainer, app, config = {}) {
        const myConfig = {
            width: 1280,
            height: 720,
            cols: 7,
            rows: 7,
            pathPrefix: "/games/ClashOfReels/",
            symbolWidth: config.isMobile ? 100 : 80,
            symbolHeight: config.isMobile ? 100 : 80,
            spinSpeed: 25,
            spinAcceleration: 1,
            spinDeacceleration: 0.9,
            staggerTime: 100,
            gapX: 5,
            gapY: 5,
            symbolsBeforeStop: 12,
            symbols: SYMBOLS,
            clusterSize: 4,
            timeBeforeProcessingGrid: 400,
            delayBeforeCascading: 600,
            ghostTime: 400,
            replaceTime: .6,
            invisibleFlyby: false,
            mode: "normal",
            bounce: 0,
            bounceDuration: .5,
            windUp: -40, // pixels
            bounceUpBeforeAccelerating: 40, // pixels
            motionBlurStrength: .8,
            defaultLandingEffect: "DEFAULT_LAND",
            defaultMatchEffect: "DEFAULT_MATCH",
            defaultExplodeEffect: "DEFAULT_EXPLODE",
            extraAssets: [
                { name: "hammer", path: "Hammer.png" },
                { name: "num_dot", path: "font/dot.png" },
                { name: "num_x", path: "font/x.png" },
                { name: "rage_spell_background", path: "rage_spell_background.png" },
                ...Array.from({ length: 10 }).map((_, i) => { return { name: "num_" + i, path: "font/" + i + ".png" } })
            ],
            font: {
                family: "cocFont",
                size: 50,
                fill: "gold",
                dropShadow: true,
                stroke: { color: "black", width: 4 }
            },
            groups: [
                { name: "low_troop", count: 3 },
                { name: "high_troop", count: 3 },
                { name: "low_resource", count: 4 },
                { name: "bonus_game", count: 1 },
            ],

            ...config,
        };

        super(rootContainer, app, myConfig);

        this.treasureGoblinConfig = {
            freeSpins: 5,
            multiplierIncrease: 2,
            newSymbols: [
                { name: "gem", weight: 500 },
                { name: "gold", weight: 1500 },
                { name: "elixir", weight: 1500 },
                { name: "darkelixir", weight: 1000 },
                { name: "treasureGoblin", weight: 20, clusterSize: 1 },
                ...SYMBOLS.filter(s => s.group === "low_troop").map(s => ({ name: s.name, weight: 5400 / 6 }))
            ],
            resources: {
                "gold": { icon: "gold", current: 0, max: 20, colorTop: "rgb(246, 220, 113)", colorBot: "rgb(232, 190, 16)" },
                "elixir": { icon: "elixir", current: 0, max: 20, colorTop: "rgb(226, 145, 227)", colorBot: "rgb(193, 38, 193)" },
                "darkelixir": { icon: "darkelixir", current: 0, max: 15, colorTop: "rgb(143, 130, 150)", colorBot: "rgb(41, 11, 52)" },
                "gem": { icon: "gem", current: 0, max: 10, colorTop: "rgb(136, 237, 79)", colorBot: "rgb(23, 138, 26)" },
            }
        };
        this.registerFeature(new EagleArtilleryFeature(this))
        this.registerFeature(new ClanCastleFeature(this))
        this.registerFeature(new WardenFeature(this))
        this.registerFeature(new TownHallFeature(this))
        this.registerFeature(new MinesFeature(this))
        this.registerFeature(new TreasureGoblinFeature(this))
        this.registerFeature(new SuperTroopFeature(this))

        this.init()
    }

    // Update your spin loop to read the timeline data
    async onCascadeEvent(event) {

        if (event.totalWin > 0) {
            this.setMultiplier(event.totalWin);
        }
    }

    async onCustomEvent(event) {
        this.config.mode = "normal"
    }

    async spin(seed) {
        if (seed) this.setSeed(seed)
        console.log("This game has the seed:", this.seed)

        const result = await super.spin();

        return { grid: this.grid, totalWin: this.globalMultiplier };
    }

    calculateMoves() {
        const timeline = [];
        let currentGrid = this.generateRandomResult();

        let totalWin = 0; // Track total win for this spin

        // ... timeline initialization ...
        timeline.push({
            type: 'SPIN_START',
            grid: JSON.parse(JSON.stringify(currentGrid))
        });

        this.features.forEach(f => f.onSpinStart(currentGrid));
        const MAX_CYCLES = 50
        let cycles = 0
        while (cycles < MAX_CYCLES) {
            cycles++
            if (cycles == MAX_CYCLES) {
                console.warn("Max cycles reached, breaking loop to save browser.");
                break;
            }
            let actionOccurred = false;

            // 1. Hook: Pre-Process (Clan Castle)
            for (const feature of this.features) {
                if (feature.onGridPreProcess(currentGrid, timeline)) {
                    actionOccurred = true;
                }
            }

            // --- 2. CLUSTER SEARCH ---
            // Because Warden has clusterSize: 1, he will trigger this block even if alone
            const rawClusters = this.findClusters(currentGrid);

            if (rawClusters.length > 0) {
                // 3. Hook: Clusters Found (Super Troops)
                this.features.forEach(f => {
                    if (f.onClustersFound(rawClusters, currentGrid, timeline)) {
                        actionOccurred = true
                    }
                });
                let stepWin = 0;
                // --- 3. CALCULATE PAYOUTS ---
                rawClusters.forEach(cluster => { // [{x: 2, y: 4, value: 6}]
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
                        if (payout) stepWin += payout;
                    }
                });
                totalWin += stepWin;

                // --- 4. PREPARE EXPLOSIONS (Standard) ---
                // Convert raw clusters into the [Col][Row] format for the engine
                const clustersToProcess = Array.from({ length: this.config.cols }, () => []);
                rawClusters.flat().forEach(({ x, y }) => {
                    if (!clustersToProcess[x].includes(y)) {
                        clustersToProcess[x].push(y);
                    }
                });

                // --- 6. CASCADE GENERATION ---
                const replacements = this.generateReplacements(clustersToProcess, currentGrid);
                currentGrid = this.simulateCascade(currentGrid, clustersToProcess, replacements);

                timeline.push({
                    type: 'CASCADE',
                    clusters: clustersToProcess,
                    replacements: replacements,
                    grid: JSON.parse(JSON.stringify(currentGrid)),
                    stepWin: stepWin,
                    totalWin: totalWin,
                    explodedClusters: rawClusters,
                });
                actionOccurred = true;
            }
            else {
                // 4. Hook: Grid Idle (The Warden)
                // Only runs if no clusters were found
                for (const feature of this.features) {
                    if (feature.onGridIdle(currentGrid, timeline)) {
                        actionOccurred = true;
                        break; // Restart loop immediately if grid changed
                    }
                }
            }

            if (!actionOccurred) break;
        }
        this.features.forEach(f => f.onSpinEnd(currentGrid, timeline, totalWin));

        timeline.forEach((event, index) => {
            if (event.totalWin === undefined) {
                // If it's the first item, default to 0. 
                // Otherwise, copy the value from the previous item.
                event.totalWin = index === 0 ? 0 : timeline[index - 1].totalWin;
            }
            if (event.previousWin === undefined) {
                event.previousWin = index === 0 ? 0 : timeline[index - 1].totalWin
            }
        });
        return timeline
    }

    async handleSymbolLand(effect, sprite) {
        for (let i = 0; i < this.features.length; i++) {
            if (effect === this.features[i].type) {
                const symbolDef = this.config.symbols.find(s => sprite.symbolId === s.id)
                const p = await this.features[i].onSymbolLand(sprite, symbolDef);
                if (p) return p;
            }
        }

        if (effect === "DEFAULT_LAND") {
            gsap.killTweensOf(sprite.scale);
            await gsap.fromTo(sprite, { y: sprite.y - 10 }, { y: sprite.y, duration: 0.2, ease: "bounce.out" });
        }
    }

    async handleSymbolMatch(effect, sprite) {
        for (let i = 0; i < this.features.length; i++) {
            if (effect === this.features[i].type) {
                const symbolDef = this.config.symbols.find(s => sprite.symbolId === s.id)
                const p = await this.features[i].onSymbolMatch(sprite, symbolDef);
                if (p) return p;
            }
        }

        if (effect === "DEFAULT_MATCH") {
            const colorMatrix = new ColorMatrixFilter();
            sprite.filters = [colorMatrix];
            const originalZIndex = sprite.zIndex;
            sprite.parent.sortableChildren = true;
            sprite.zIndex = 100;

            const tl = gsap.timeline({
                onComplete: () => {
                    // Cleanup: Reset filters and Z-Index
                    sprite.filters = null;
                    sprite.zIndex = originalZIndex;
                    return
                }
            });

            tl.to(sprite.scale, {
                x: sprite.scale.x * 1.2,
                y: sprite.scale.y * 1.2,
                duration: 0.2,
                yoyo: true,
                repeat: 3,
                ease: "sine.inOut"
            });
            const flash = { intensity: 1 };
            tl.to(flash, {
                intensity: 1.8,
                duration: 0.2,
                yoyo: true,
                repeat: 3,
                ease: "sine.inOut",
                onUpdate: () => {
                    colorMatrix.brightness(flash.intensity, false);
                }
            }, "<");
            await tl
        }
        else if (effect === "TREASURE_GOBLIN_MATCH") {
            const tl = gsap.timeline({});
            tl.to(sprite.scale, { x: sprite.scale.x * 1.2, y: sprite.scale.y * 1.2, duration: 0.1, yoyo: true, repeat: 3 })
            tl.to(sprite, { pixi: { tint: 0xFFD700 }, duration: 0.1, yoyo: true, repeat: 3 }, "<");
            await tl
        }
        else if (effect === "PULSE_GOLD") {
            // Flash white and scale up
            const tl = gsap.timeline({});
            tl.to(sprite.scale, { x: sprite.scale.x * 1.2, y: sprite.scale.y * 1.2, duration: 0.1, yoyo: true, repeat: 3 })
            //.to(sprite, { pixi: { tint: 0xFFD700 }, duration: 0.1, yoyo: true, repeat: 3 }, "<");
            await tl
        }
        else if (effect === "VIDEO_PLAY") {
            // We find the symbol ID attached to the sprite to get the name
            const symbolConfig = this.config.symbols.find(s => s.id === sprite.symbolId);
            const videoAlias = symbolConfig.name + "_anim";

            await this.playSymbolVideo(sprite, videoAlias);
        }
        else if (effect === "builder_match") {
            const hammerTexture = Assets.get("hammer");
            const hammer = new Sprite(hammerTexture);

            this.stage.addChild(hammer);

            const globalPos = this.stage.toLocal(sprite.getGlobalPosition());
            hammer.anchor.set(0.5, 1);
            hammer.x = -100;
            hammer.y = globalPos.y + (sprite.height / 2);
            hammer.scale.set(.1);

            // 3. Animation Timeline
            const tl = gsap.timeline({
                onComplete: () => {
                    hammer.destroy();
                }
            });

            // Glide In
            tl.to(hammer, {
                x: globalPos.x,
                duration: 0.4,
                ease: "back.out(1)"
            });

            // Smash Down
            tl.to(hammer, {
                rotation: -0.5, // Cock back
                duration: 0.1
            })
                .to(hammer, {
                    rotation: 0.5, // BAM!
                    duration: 0.1,
                    ease: "power1.in",
                    onComplete: () => {
                        // Optional: Shake the Builder symbol
                        gsap.to(sprite, { x: sprite.x + 5, yoyo: true, repeat: 3, duration: 0.05 });
                    }
                });

            // Wait a beat
            tl.to(hammer, { duration: 0.2 });

            // Fly Out Right
            tl.to(hammer, {
                x: this.config.width + 200,
                duration: 0.4,
                ease: "power1.in"
            });
            await tl
        }
    }

    async handleSymbolExplode(effect, sprite) {

        for (let i = 0; i < this.features.length; i++) {
            if (effect === this.features[i].type) {
                const symbolDef = this.config.symbols.find(s => sprite.symbolId === s.id)
                const p = await this.features[i].onSymbolExplode(sprite, symbolDef);
                if (p) return p;
            }
        }

        if (effect === "DEFAULT_EXPLODE") {
            const ghost = this.spawnGhost(sprite)
            const tl = gsap.timeline({})
            tl.to(ghost.scale, { x: 0, y: 0, duration: .4 })
            tl.to(ghost, {
                rotation: 5, alpha: 0, duration: .4, onComplete: () => {
                    // ghost.destroy()
                }
            }, "<");
            await tl
        }
        else if (effect === "CAMERA_SHAKE") {
            const whatToMove = this.stage
            const startX = whatToMove.x
            const startY = whatToMove.y
            const duration = 0.5;   // Total time
            const shakes = 15;      // How many rapid movements
            const intensity = 5;    // Max pixel offset (Amplitutde)
            const keyframes = [];

            for (let i = 0; i < shakes; i++) {
                const decay = 1 - (i / shakes);
                const x = (Math.random() * intensity * 2 - intensity) * decay;
                const y = (Math.random() * intensity * 2 - intensity) * decay;

                keyframes.push({
                    x: startX + x,
                    y: startY + y,
                    duration: duration / shakes
                });
            }

            keyframes.push({ x: startX, y: startY, rotation: 0, duration: 0.1, ease: "power2.out" });


            await gsap.to(this.stage, {
                keyframes: keyframes,
            });
        }
    }
}