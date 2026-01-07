import SlotsBase from '../game-engine/SlotsBase.js';
import gsap from "gsap"
import { Assets, Sprite, Graphics, Text, Container, ColorMatrixFilter, FillGradient } from "pixi.js"
import { EagleArtilleryFeature } from './features/EagleArtilleryFeature.js';
import { ClanCastleFeature } from './features/ClanCastleFeature.js';
import { WardenFeature } from './features/WardenFeature.js';
import { TownHallFeature } from './features/TownHallFeature.js';
import { MinesFeature } from './features/MinesFeature.js';
import { TreasureGoblinFeature } from './features/TreasureGoblinFeature.js';
import { SuperTroopFeature } from './features/SuperTroopFeature.js';
import { BuilderFeature } from './features/BuilderFeature.js';
import { ClusterEngineFeature } from './features/ClusterFeature.js';
import { shake, popAnimation, glowFlashAnimation, implodeAnimation, fragmentPopAnimation, landingEffect, matchEffect } from '../game-engine/effects/Effects.js';

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
            borderRadius: 15,
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
            timeBeforeProcessingGrid: 200,
            delayBeforeCascading: 200,
            replaceTime: .2,
            windUp: -5, // pixels
            staggerTime: 0,
            reelLandSymbolsDelay: 10,

            // Game Logic
            cols: 7,
            rows: 7,
            clusterSize: 4,
            groups: [
                { name: "low_troop", count: 3 },
                { name: "high_troop", count: 2 },
                { name: "low_resource", count: 3 },
                { name: "bonus_game", count: 1 },
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
        if (effect === "DEFAULT_LAND") {
            await landingEffect(sprite)
        }
        else {
            super.handleSymbolLand(effect, sprite)
        }
    }

    async handleSymbolMatch(effect, sprite) {

        if (effect === "DEFAULT_MATCH") {
            await matchEffect(sprite)
        }
        else {
            super.handleSymbolMatch(effect, sprite)
        }
    }

    async handleSymbolExplode(effect, sprite) {
        // glowFlashAnimation, implodeAnimation, fragmentPopAnimation popAnimation
        if (effect === "DEFAULT_EXPLODE") {
            const ghost = this.spawnGhost(sprite)
            await glowFlashAnimation(ghost)
        }
        else {
            super.handleSymbolExplode(effect, sprite)
        }
    }

}