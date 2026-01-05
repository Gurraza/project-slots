import SlotsBase from '../game-engine/SlotsBase.js';
import gsap from "gsap"
import { Assets, Sprite, Graphics, Text, Container, ColorMatrixFilter, FillGradient } from "pixi.js"
import { PaylineFeature } from './features/PaylineFeature.js';
const SYMBOLS = [
    // --- SPECIALS ---
    {
        name: "wild",
        // Reduced from 45 to 18. Wilds were driving the 53% winrate.
        weight: 18,
        scale: .9,
        path: "troops_icons/rage.png",
        matchesWith: ["*"],
        // Reduced 3-match payout slightly to lower base RTP
        payouts: { 3: 2.0, 4: 15.0, 5: 150.0 }
    },

    // --- HIGH TIER (The Geese) ---
    {
        name: 'pekka', // The Jackpot
        // Reduced from 12 to 8. Harder to hit, but pays huge.
        weight: 8,
        group: "high_troop",
        scale: .9,
        path: "troops_icons/pekka.png",
        // Kept 5-match exciting (150x), but lowered 3-match
        payouts: { 3: 2.0, 4: 15.0, 5: 150.0 }
    },
    {
        name: 'wizard',
        // Reduced from 25 to 20
        weight: 20,
        group: "high_troop",
        scale: .9,
        path: "troops_icons/wizard.png",
        payouts: { 3: 1.0, 4: 5.0, 5: 40.0 }
    },
    {
        name: 'hogrider',
        // Reduced from 40 to 35
        weight: 35,
        group: "high_troop",
        scale: .9,
        path: "troops_icons/hogrider.png",
        payouts: { 3: 0.8, 4: 3.0, 5: 15.0 }
    },
    {
        name: 'archer',
        weight: 60,
        group: "low_troop",
        scale: .9,
        path: "troops_icons/archer.png",
        payouts: { 3: 0.5, 4: 2.0, 5: 10.0 }
    },
    {
        name: 'barbarian',
        weight: 80,
        group: "low_troop",
        scale: .9,
        path: "troops_icons/barbarian.png",
        payouts: { 3: 0.3, 4: 1.5, 5: 6.0 }
    },

    // --- LOW TIER (Resources) ---
    // Drastically increased weights to dilute the reels
    // Drastically lowered 3-match payouts
    {
        name: 'gold',
        weight: 190, // Increased from 160
        group: "low_resource",
        scale: .9,
        path: "resource/gold.png",
        // Payout 0.05 means you need massive combos to profit
        payouts: { 3: 0.05, 4: 0.3, 5: 1.0 }
    },
    {
        name: 'elixir',
        weight: 170, // Increased from 140
        group: "low_resource",
        scale: .9,
        path: "resource/elixir.png",
        payouts: { 3: 0.05, 4: 0.4, 5: 1.2 }
    },
    {
        name: 'darkelixir',
        weight: 150, // Increased from 120
        group: "low_resource",
        scale: .9,
        path: "resource/dark_elixir.png",
        payouts: { 3: 0.1, 4: 0.5, 5: 1.5 }
    },
    {
        name: 'gem',
        weight: 120, // Increased from 100
        group: "low_resource",
        scale: .9,
        path: "resource/gem.png",
        payouts: { 3: 0.15, 4: 0.8, 5: 2.5 }
    }
];

export default class ClashLines extends SlotsBase {
    constructor(rootContainer, app, config = {}) {
        const myConfig = {
            // Layout
            width: 1280,
            height: 720,
            symbolWidth: config.isMobile ? 100 : 110,
            symbolHeight: config.isMobile ? 100 : 110,
            gapX: 0,
            gapY: 0,
            borderRadius: 0,

            // Visuals
            backgroundImage: "background",
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

            // --- EXTENDED (21-30) ---
            [0, 2, 2, 2, 0],
            [2, 0, 0, 0, 2],
            [1, 2, 0, 2, 1],
            [1, 0, 2, 0, 1],
            [0, 0, 1, 0, 0], // Top Dip
            [2, 2, 1, 2, 2], // Bottom Bump
            [0, 2, 1, 2, 0],
            [2, 0, 1, 0, 2],
            [0, 1, 2, 2, 2],
            [2, 1, 0, 0, 0],

            // --- COMPLEX (31-40) ---
            [0, 0, 1, 2, 1],
            [2, 2, 1, 0, 1],
            [1, 2, 1, 0, 1],
            [1, 0, 1, 2, 1],
            [0, 1, 1, 1, 2],
            [2, 1, 1, 1, 0],
            [0, 1, 0, 1, 2],
            [2, 1, 2, 1, 0],
            [1, 0, 0, 1, 0],
            [1, 2, 2, 1, 2],
        ]))

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