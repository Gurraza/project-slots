import SlotsBase from '../game-engine/SlotsBase.ts';
import gsap from "gsap"
import { Container, ColorMatrixFilter, Application } from "pixi.js"
import { PaylineFeature } from './features/PaylineFeature.ts';
import { Scatter } from './features/Scatter.ts';
import { GameConfig, SymbolDef } from '../game-engine/types.ts';
import { BlurredBackgroundFeature } from '../TipsyTiles/features/BlurredBackground.ts';

const SYMBOLS: SymbolDef[] = [
    // --- SPECIALS ---
    {
        name: "wild",
        weight: 20, // Rare, but powerful
        scale: .9,
        path: "super_icon.png",
        matchesWith: ["*"],
        // Payouts: 5-match is now a "Super Win" (1000x)
        payouts: { 3: 5.0, 4: 50.0, 5: 1000.0 }
    },

    // --- HIGH TIER (The Chasers) ---
    {
        name: 'pekka',
        weight: 15, // Very Rare
        group: "high_troop",
        scale: .9,
        path: "troops_icons/pekka.png",
        // 5-match Pekka is the dream hit
        payouts: { 3: 5.0, 4: 50.0, 5: 500.0 }
    },
    {
        name: 'wizard',
        weight: 28,
        group: "high_troop",
        scale: .9,
        path: "troops_icons/wizard.png",
        payouts: { 3: 3.0, 4: 25.0, 5: 200.0 }
    },
    {
        name: 'hogrider',
        weight: 45,
        group: "high_troop",
        scale: .9,
        path: "troops_icons/hogrider.png",
        payouts: { 3: 2.0, 4: 15.0, 5: 100.0 }
    },

    // --- MID TIER (The Sustainers) ---
    {
        name: 'archer',
        weight: 60,
        group: "low_troop",
        scale: .9,
        path: "troops_icons/archer.png",
        // 3-match pays money back (1x)
        payouts: { 3: 1.0, 4: 8.0, 5: 40.0 }
    },
    {
        name: 'barbarian',
        weight: 75,
        group: "low_troop",
        scale: .9,
        path: "troops_icons/barbarian.png",
        payouts: { 3: 0.8, 4: 5.0, 5: 25.0 }
    },

    // --- LOW TIER (The Floor) ---
    // CRITICAL FIX: 3-matches now pay significantly better 
    // to recover the RTP lost by cutting paylines.
    {
        name: 'gold',
        weight: 140, // Reduced weight slightly to allow more high symbols
        group: "low_resource",
        scale: .9,
        path: "resource/gold.png",
        // 0.6x is much better than 0.4x for the most common hit
        payouts: { 3: 0.6, 4: 2.5, 5: 12.0 }
    },
    {
        name: 'elixir',
        weight: 130,
        group: "low_resource",
        scale: .9,
        path: "resource/elixir.png",
        payouts: { 3: 0.6, 4: 2.5, 5: 12.0 }
    },
    {
        name: 'darkelixir',
        weight: 120,
        group: "low_resource",
        scale: .9,
        path: "resource/dark_elixir.png",
        payouts: { 3: 0.5, 4: 2.0, 5: 10.0 }
    },
    {
        name: 'gem',
        weight: 110,
        group: "low_resource",
        scale: .9,
        path: "resource/gem.png",
        payouts: { 3: 0.5, 4: 2.0, 5: 10.0 }
    }
];


interface clashConf {
    width: number
    height: number
    isMobile: boolean
    mode?: string
}

export default class ClashLines extends SlotsBase {
    constructor(rootContainer: Container, app: Application, config: Partial<clashConf> = {}) {
        const myConfig: GameConfig = {
            // Layout
            width: 1280,
            height: 720,
            symbolWidth: config.isMobile ? 100 : 110,
            symbolHeight: config.isMobile ? 100 : 110,
            gapX: 0,
            gapY: 0,
            borderRadius: 0,
            titleImage: "",
            // Visuals
            backgroundImage: "background",
            reelBackgroundImage: "",//"/games/ClashOfReels/ClashLineBackgroundBorder.png",
            reelBackgroundScale: 1,
            reelBackgroundOffset: { x: 0, y: 0 },
            reelLandSymbolsDelay: 0,
            symbolsBeforeStop: 15,
            invisibleFlyby: false,
            motionBlurStrength: .8,
            font: {
                family: "cocFont",
                size: 50,
                fill: "gold",
                dropShadow: true,
                stroke: { color: "black", width: 4 }
            },
            extraAssets: [
                { alias: "background", src: "background.jpg" },
                { alias: "num_dot", src: "font/dot.png" },
                { alias: "num_x", src: "font/x.png" },
                { alias: "rage_spell_background", src: "rage_spell_background.png" },
                ...Array.from({ length: 10 }).map((_, i) => { return { alias: "num_" + i, src: "font/" + i + ".png" } })
            ],

            ui: {
                spinButton: {
                    asset: "spin_button.png",
                    position: {
                        right: 150,
                        bottom: 110
                    },
                    scale: 1
                },
                title: {
                    asset: "title.png",
                    position: {
                        left: 640,
                        top: 25
                    },
                    scale: .3
                }
            },

            // Speed
            spinSpeed: 35,
            spinAcceleration: .5,
            spinDeacceleration: 0.9,
            staggerTime: 100,
            timeBeforeProcessingGrid: 200,
            delayBeforeCascading: 200,
            replaceTime: .2,
            windUp: -5, // pixels

            // Game Logic
            cols: 5,
            rows: 3,
            clusterSize: 5555,
            groups: [
                // { name: "low_troop", count: 2 },
                // { name: "high_troop", count: 2 },
                // { name: "low_resource", count: 2 },
                // { name: "bonus_game", count: 2 },
            ],

            // Behind The Scenes
            pathPrefix: "/games/ClashOfReels/",
            symbols: SYMBOLS,
            mode: "normal",
            defaultLandingEffect: "DEFAULT_LAND",
            defaultMatchEffect: "DEFAULT_MATCH",
            defaultExplodeEffect: "DEFAULT_EXPLODE",
            ...config,
        };

        super(rootContainer, app, myConfig);

        // this.registerFeature(new ClanCastleFeature(this))
        // this.registerFeature(new SuperTroopFeature(this))
        this.registerFeature(new PaylineFeature(this, [
            // --- BASIC (1-5) ---
            [1, 1, 1, 1, 1], // Middle
            [0, 0, 0, 0, 0], // Top
            [2, 2, 2, 2, 2], // Bottom
            [0, 1, 2, 1, 0], // V
            [2, 1, 0, 1, 2], // Inverted V

            // --- ZIG ZAGS (6-10) ---
            [0, 0, 1, 2, 2],
            [2, 2, 1, 0, 0],
            [1, 2, 2, 2, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0],

            // --- SQUIGGLES (11-15) ---
            [2, 1, 1, 1, 2],
            [0, 1, 0, 1, 0],
            [2, 1, 2, 1, 2],
            [1, 0, 1, 0, 1],
            [1, 2, 1, 2, 1],

            // --- STEPPERS (16-20) ---
            [1, 1, 0, 1, 1],
            [1, 1, 2, 1, 1],
            [0, 0, 2, 0, 0],
            [2, 2, 0, 2, 2],
            [0, 2, 0, 2, 0],

            // ... (The rest are ignored)
        ]))
        this.registerFeature(new Scatter(this, {
            name: "scatter",
            weight: [20, 10, 1],
            cheatWeight: [99999, 99999, 99999],
            scale: 1,
            group: "bonus_game",
            onlyAppearOnRoll: true,
            path: "Builder.png",
            anticipation: {
                after: 2,
                count: 15,
            },
            onePerReel: true,
            dontCluster: true,
        }))
        this.registerFeature(new BlurredBackgroundFeature(this))

        this.init()
    }

    async handleSymbolLand(effect, sprite) {
        super.handleSymbolLand(effect, sprite)
        if (effect === "DEFAULT_LAND") {
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
        super.handleSymbolMatch(effect, sprite)

        if (effect === "DEFAULT_MATCH") {
            const colorMatrix = new ColorMatrixFilter();
            sprite.filters = [colorMatrix];
            const originalZIndex = sprite.zIndex;
            sprite.parent.sortableChildren = true;
            sprite.zIndex = 100;

            const tl = gsap.timeline({
                onComplete: () => {
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
        super.handleSymbolExplode(effect, sprite)

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