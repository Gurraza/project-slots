import SlotsBase from '../game-engine/SlotsBase.ts';
import { Container, Application, Assets, Sprite } from "pixi.js"
import { glowFlashAnimation, landingEffect, matchEffect, shake } from '../game-engine/effects/Effects.ts';
import { SymbolDef } from "../game-engine/types.ts"
import { ClusterEngineFeature } from '../ClashOfReels/features/ClusterFeature.ts';
import { EatEngineFeature } from './features/EatEngine.ts';
import { ShakerFeature } from './features/Shaker.ts';

// Define the groups so they all link together
const BEER_GROUP = ['patreon_regular', 'beer_1', 'beer_2', 'beer_3'];
const BUBBLE_GROUP = ['patreon_granny', 'bubble_1', 'bubble_2', 'bubble_3'];
const DRINK_GROUP = ['patreon_fancy', 'drink_1', 'drink_2', 'drink_3'];
const SHOT_GROUP = ['patreon_part', 'shot_1', 'shot_2', 'shot_3'];

const SYMBOLS: SymbolDef[] = [
    {
        name: 'beer_1',
        weight: 1750,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15 },
        // path: "Beer_1.png",
        path: "_0005_Beer_1.png",
        matchesWith: BEER_GROUP,
    },
    {
        name: 'beer_2',
        weight: 125,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15 },
        path: "_0004_Beer_2.png",
        matchesWith: BEER_GROUP,
    },
    {
        name: 'beer_3',
        weight: 25,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15 },
        path: "_0003_Beer_3.png",
        matchesWith: BEER_GROUP,
    },
    {
        name: 'bubble_1',
        weight: 1750,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15 },
        path: "_0020_Bubble_1.png",
        matchesWith: BUBBLE_GROUP,
    },
    {
        name: 'bubble_2',
        weight: 125,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15 },
        path: "_0021_Bubble_2.png",
        matchesWith: BUBBLE_GROUP,
    },
    {
        name: 'bubble_3',
        weight: 25,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15 },
        path: "_0022_Bubble_3.png",
        matchesWith: BUBBLE_GROUP,
    },
    {
        name: 'drink_1',
        weight: 1750,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15 },
        path: "_0023_Drink_1.png",
        matchesWith: DRINK_GROUP,
    },
    {
        name: 'drink_2',
        weight: 125,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15 },
        path: "_0024_Drink_2.png",
        matchesWith: DRINK_GROUP,
    },
    {
        name: 'drink_3',
        weight: 25,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15 },
        path: "_0025_Drink_3.png",
        matchesWith: DRINK_GROUP,
    },
    {
        name: 'shot_1',
        weight: 1750,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15 },
        path: "_0006_Shot_1.png",
        matchesWith: SHOT_GROUP,
    },
    {
        name: 'shot_2',
        weight: 125,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15 },
        path: "_0007_Shot_2.png",
        matchesWith: SHOT_GROUP,
    },
    {
        name: 'shot_3',
        weight: 25,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15 },
        path: "_0008_Shot_3.png",
        matchesWith: SHOT_GROUP,
    },
    {
        name: "patreon_regular",
        weight: [300],
        path: "_0009_Patreon_regular.png",
        isEater: true,
        matchesWith: BEER_GROUP,
    },
    {
        name: "patreon_party",
        weight: [300],
        path: "_0012_Patreon_party.png",
        isEater: true,
        matchesWith: SHOT_GROUP,
    },
    {
        name: "patreon_granny",
        weight: [300],
        path: "_0011_Patreon_granny.png",
        isEater: true,
        matchesWith: BUBBLE_GROUP,
    },
    {
        name: "patreon_fancy",
        weight: [300],
        path: "_0010_Patreon_fancy.png",
        isEater: true,
        matchesWith: DRINK_GROUP,
    },
    {
        name: "wild",
        weight: 250,
        path: "_0015_Water_wild.png",
        matchesWith: "*",
    },
    // {
    //     name: "upgrade",
    //     weight: [150],
    //     path: "Shaker.png",
    // },
    // {
    //     name: "multiplier",
    //     weight: [50],
    //     path: "Mat.png",
    // },
    // {
    //     name: "scatter",
    //     weight: [100, 100, 100],
    //     path: "Disco.png",
    // }
];

interface conf {
    width: number
    height: number
    isMobile: boolean
    mode: string
}

export default class TipsyTiles extends SlotsBase {
    constructor(rootContainer: Container, app: Application, config: Partial<conf> = {}) {
        const myConfig = {
            // Layout
            width: 1280,
            height: 720,
            symbolWidth: config.isMobile ? 100 : 80,
            symbolHeight: config.isMobile ? 100 : 80,
            gapX: 0,
            gapY: 0,
            borderRadius: 15,
            titleImage: "",
            // Visuals
            backgroundImage: "background",
            reelBackgroundImage: "",//"/games/TipsyTiles/ReelBackground.png",
            reelBackgroundScale: .95,
            reelBackgroundOffset: { x: 80, y: 35 },

            symbolsBeforeStop: 15,
            reelLandSymbolsDelay: 5,
            invisibleFlyby: true,
            motionBlurStrength: .8,
            // font: {
            //     family: "cocFont",
            //     size: 50,
            //     fill: "gold",
            //     dropShadow: true,
            //     stroke: { color: "black", width: 4 }
            // },
            extraAssets: [
                { alias: "background", src: "Background.png" },
                { alias: "tipsy_sheet", src: "texture.json" }
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

            // Game Logic
            cols: 6,
            rows: 6,
            clusterSize: 5,
            // groups: [
            //     { name: "low_troop", count: 3 },
            //     { name: "high_troop", count: 2 },
            //     { name: "low_resource", count: 3 },
            //     { name: "bonus_game", count: 1 },
            // ],

            // Behind The Scenes
            pathPrefix: "/games/TipsyTiles/",
            symbols: SYMBOLS,
            mode: "normal",
            defaultLandingEffect: "DEFAULT_LAND",
            defaultMatchEffect: "DEFAULT_MATCH",
            defaultExplodeEffect: "DEFAULT_EXPLODE",
            ...config,
        };

        super(rootContainer, app, myConfig);

        // this.registerFeature(new ClusterEngineFeature(this))
        this.registerFeature(new EatEngineFeature(this))
        this.registerFeature(new ShakerFeature(this, {
            name: "shaker",
            dontCluster: true,
            weight: [100],
            scale: 1,
            path: "_0014_Shaker.png",
            landingEffect: "shake",
            clusterSize: 1,
        }))

        this.init()
    }

    async handleSymbolLand(effect, sprite) {
        if (effect === "DEFAULT_LAND") {
            await landingEffect(sprite)
        }
        else if (effect === "shake") {
            await shake(sprite, 20, 1);
        }
        else {
            super.handleSymbolLand(effect, sprite)
        }
    }

    async handleSymbolMatch(effect: string, sprite) {

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
            // const ghost = this.spawnGhost(sprite)
            // await glowFlashAnimation(ghost)
        }
        else {
            super.handleSymbolExplode(effect, sprite)
        }
    }

}