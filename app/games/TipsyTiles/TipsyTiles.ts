import SlotsBase from '../../game-engine/SlotsBase.ts';
import { Container, Application, Assets, Sprite } from "pixi.js"
import { glowFlashAnimation, landingEffect, matchEffect, shake } from '../../game-engine/effects/Effects.ts';
import { GameConfig, SymbolDef } from "../../game-engine/types.ts"
import { ClusterEngineFeature } from '../ClashOfReels/features/ClusterFeature.ts';
import { EatEngineFeature } from './features/EatEngine.ts';
import { ShakerFeature } from './features/Shaker.ts';
import { DrunkMeterFeature } from './features/DrunkMeter.ts';
import { BlurredBackgroundFeature } from './features/BlurredBackground.ts';

// Define the groups so they all link together
const BEER_GROUP = ['patreon_regular', 'beer_1', 'beer_2', 'beer_3'];
const BUBBLE_GROUP = ['patreon_granny', 'bubble_1', 'bubble_2', 'bubble_3'];
const DRINK_GROUP = ['patreon_fancy', 'drink_1', 'drink_2', 'drink_3'];
const SHOT_GROUP = ['patreon_party', 'shot_1', 'shot_2', 'shot_3'];


interface conf {
    width: number
    height: number
    isMobile: boolean
    mode: string
}

export default class TipsyTiles extends SlotsBase {
    constructor(rootContainer: Container, app: Application, config: Partial<conf> = {}) {
        const myConfig: GameConfig = {
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

            symbolsBeforeStop: 6,
            reelLandSymbolsDelay: 5,
            invisibleFlyby: true,
            motionBlurStrength: .8,
            font: {
                family: "Arial",
                size: 50,
                fill: "gold",
                dropShadow: true,
                stroke: { color: "black", width: 4 }
            },
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
            groups: [
                // { name: "low_troop", count: 3 },
                // { name: "high_troop", count: 2 },
                // { name: "low_resource", count: 3 },
                // { name: "bonus_game", count: 1 },
            ],

            /* UI */
            ui: {
                title: {
                    asset: "tipsy_title.png",
                    position: config.isMobile ? {
                        top: 70,
                        left: 720 / 2
                    } : {
                        top: 50,
                        left: 640
                    },
                    scale: config.isMobile ? .2 : .1
                },
                spinButton: {
                    asset: "tipsy_spin.png",
                    position: config.isMobile ? {
                        bottom: 140,
                        left: 720 / 2
                    } : {
                        bottom: 125,
                        right: 190,
                    },
                    scale: config.isMobile ? 1.35 : .75
                }
            },

            // Behind The Scenes
            pathPrefix: "/games/TipsyTiles/",
            symbols: [
                {
                    name: 'beer_1',
                    weight: 1750,
                    payouts: { 1: 0.1 },
                    // path: "Beer_1.png",
                    path: "_0005_Beer_1.png",
                    matchesWith: BEER_GROUP,
                    scale: .6,
                },
                {
                    name: 'beer_2',
                    weight: 125,
                    payouts: { 1: 0.25 },
                    path: "_0004_Beer_2.png",
                    matchesWith: BEER_GROUP,
                    scale: .6,
                },
                {
                    name: 'beer_3',
                    weight: 25,
                    payouts: { 1: 0.4 },
                    path: "_0003_Beer_3.png",
                    matchesWith: BEER_GROUP,
                    scale: .6,
                },
                {
                    name: 'bubble_1',
                    weight: 1750,
                    payouts: { 1: 0.1 },
                    path: "_0020_Bubble_1.png",
                    matchesWith: BUBBLE_GROUP,
                    scale: .6,
                },
                {
                    name: 'bubble_2',
                    weight: 125,
                    payouts: { 1: 0.25 },
                    path: "_0021_Bubble_2.png",
                    matchesWith: BUBBLE_GROUP,
                    scale: .6,
                },
                {
                    name: 'bubble_3',
                    weight: 25,
                    payouts: { 1: 0.4 },
                    path: "_0022_Bubble_3.png",
                    matchesWith: BUBBLE_GROUP,
                    scale: .6,
                },
                {
                    name: 'drink_1',
                    weight: 1750,
                    payouts: { 1: 0.1 },
                    path: "_0023_Drink_1.png",
                    matchesWith: DRINK_GROUP,
                    scale: .6,
                },
                {
                    name: 'drink_2',
                    weight: 125,
                    payouts: { 1: 0.25 },
                    path: "_0024_Drink_2.png",
                    matchesWith: DRINK_GROUP,
                    scale: .6,
                },
                {
                    name: 'drink_3',
                    weight: 25,
                    payouts: { 1: 0.4 },
                    path: "_0025_Drink_3.png",
                    matchesWith: DRINK_GROUP,
                    scale: .6,
                },
                {
                    name: 'shot_1',
                    weight: 1750,
                    payouts: { 1: 0.1 },
                    path: "_0006_Shot_1.png",
                    matchesWith: SHOT_GROUP,
                    scale: .6,
                },
                {
                    name: 'shot_2',
                    weight: 125,
                    payouts: { 1: 0.25 },
                    path: "_0007_Shot_2.png",
                    matchesWith: SHOT_GROUP,
                    scale: .6,
                },
                {
                    name: 'shot_3',
                    weight: 25,
                    payouts: { 1: 0.4 },
                    path: "_0008_Shot_3.png",
                    matchesWith: SHOT_GROUP,
                    scale: .6,
                },
                {
                    name: "patreon_regular",
                    weight: [99999999],
                    path: "_0009_Patreon_regular.png",
                    isEater: true,
                    matchesWith: BEER_GROUP,
                    scale: 1.3,
                },
                {
                    name: "patreon_party",
                    weight: [99999999],
                    path: "_0012_Patreon_party.png",
                    isEater: true,
                    matchesWith: SHOT_GROUP,
                    scale: 1.3,
                },
                {
                    name: "patreon_granny",
                    weight: [99999999],
                    path: "_0011_Patreon_granny.png",
                    isEater: true,
                    matchesWith: BUBBLE_GROUP,
                    scale: 1.3,
                },
                {
                    name: "patreon_fancy",
                    weight: [99999999],
                    path: "_0010_Patreon_fancy.png",
                    isEater: true,
                    matchesWith: DRINK_GROUP,
                    scale: 1.3,
                },
                {
                    name: "wild",
                    weight: 250,
                    path: "_0015_Water_wild.png",
                    matchesWith: ["*"],
                    scale: .85,
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
            ],
            mode: "normal",
            defaultLandingEffect: "DEFAULT_LAND",
            defaultMatchEffect: "DEFAULT_MATCH",
            defaultExplodeEffect: "DEFAULT_EXPLODE",
            ...config,
        };

        super(rootContainer, app, myConfig);

        // this.registerFeature(new ClusterEngineFeature(this))
        this.registerFeature(new EatEngineFeature(this, {
            dispalyWinUnderEater: true
        }))
        this.registerFeature(new ShakerFeature(this, {
            name: "shaker",
            dontCluster: true,
            weight: [25],
            scale: 1,
            path: "_0014_Shaker.png",
            // landingEffect: "shake",
            matchEffect: "shake",
            clusterSize: 1,
        }))
        this.registerFeature(new DrunkMeterFeature(this))
        this.registerFeature(new BlurredBackgroundFeature(this))

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

    async handleSymbolMatch(effect: string, sprite) {
        if (effect === "DEFAULT_MATCH") {
            await matchEffect(sprite)
        }
        else if (effect === "shake") {
            await shake(sprite, 20, .5);
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