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
    {
        name: "wild",
        weight: 150,
        scale: 1,
        path: "super_icon.png",
        matchesWith: ["*"],
    }

];

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

        this.registerFeature(new EagleArtilleryFeature(this))
        this.registerFeature(new ClanCastleFeature(this))
        this.registerFeature(new WardenFeature(this))
        this.registerFeature(new TownHallFeature(this))
        this.registerFeature(new MinesFeature(this))
        this.registerFeature(new TreasureGoblinFeature(this))
        this.registerFeature(new SuperTroopFeature(this))

        this.init()
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
                const clustersToProcess = Array.from({ length: this.config.cols }, () => []);
                rawClusters.flat().forEach(({ x, y }) => {
                    if (!clustersToProcess[x].includes(y)) {
                        clustersToProcess[x].push(y);
                    }
                });
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
            if (this.features[i].effects.find(s => s == effect)) {
                const symbolDef = this.config.symbols.find(s => sprite.symbolId === s.id)
                const p = await this.features[i].onSymbolLand(sprite, symbolDef);
                if (p) return p;
            }
        }

        if (effect === "DEFAULT_LAND") {
            const baseX = sprite.scale.x;
            const baseY = sprite.scale.y;
            const restingY = sprite.y;

            const tl = gsap.timeline();
            tl.to(sprite, {
                y: restingY + 6,
                duration: 0.1,
                ease: "power2.in"
            })
            tl.to(sprite, {
                y: restingY,
                duration: 0.1,
                ease: "power1.out"
            });
            await tl
        }
    }

    async handleSymbolMatch(effect, sprite) {
        for (let i = 0; i < this.features.length; i++) {
            if (this.features[i].effects.find(s => s == effect)) {
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
    }

    async handleSymbolExplode(effect, sprite) {

        for (let i = 0; i < this.features.length; i++) {
            if (this.features[i].effects.find(s => s == effect)) {
                const symbolDef = this.config.symbols.find(s => sprite.symbolId === s.id)
                const p = await this.features[i].onSymbolExplode(effect, sprite, symbolDef);
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
    }
}