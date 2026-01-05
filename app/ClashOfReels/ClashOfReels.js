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
import { BuilderFeature } from './features/BuilderFeature';
import { ClusterEngineFeature } from './features/ClusterFeature';

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
    constructor(rootContainer, app, config = {}) {
        const myConfig = {
            // Layout
            width: 1280,
            height: 720,
            symbolWidth: config.isMobile ? 100 : 80,
            symbolHeight: config.isMobile ? 100 : 80,
            gapX: 5,
            gapY: 5,

            // Visuals
            backgroundImage: "background",
            symbolsBeforeStop: 15,
            invisibleFlyby: true,
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
            cols: 7,
            rows: 7,
            clusterSize: 5,
            groups: [
                { name: "low_troop", count: 2 },
                { name: "high_troop", count: 2 },
                { name: "low_resource", count: 2 },
                { name: "bonus_game", count: 2 },
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

        this.registerFeature(new ClusterEngineFeature(this))
        this.registerFeature(new EagleArtilleryFeature(this))
        this.registerFeature(new ClanCastleFeature(this))
        this.registerFeature(new WardenFeature(this))
        this.registerFeature(new TownHallFeature(this))
        this.registerFeature(new MinesFeature(this))
        this.registerFeature(new TreasureGoblinFeature(this))
        this.registerFeature(new SuperTroopFeature(this))
        this.registerFeature(new BuilderFeature(this))

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
                duration: 0.1,
                yoyo: true,
                repeat: 3,
                ease: "sine.inOut"
            });
            const flash = { intensity: 1 };
            tl.to(flash, {
                intensity: 1.8,
                duration: 0.1,
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