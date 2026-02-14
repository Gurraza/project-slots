import SlotsBase from '../../game-engine/SlotsBase.ts';
import gsap from "gsap"
import { Container, ColorMatrixFilter, Application, Assets, Sprite, Text, Graphics, BlurFilter } from "pixi.js"
import { PaylineEngine } from './features/PaylineEngine.ts';
import { Scatter } from './features/Scatter.ts';
import { GameConfig, SymbolDef } from '../../game-engine/types.ts';
import { getPos } from '../../game-engine/UI.ts';
import { ExpandingWildsFeature } from './features/ExpandingWilds.ts';
// const SYMBOLS: SymbolDef[] = [
//     {
//         name: "wild",
//         weight: 20,
//         path: "_0002_Layer-2.png",
//         matchesWith: ["*"],
//         payouts: { 3: 5.0, 4: 50.0, 5: 1000.0 }
//     },
//     {
//         name: 'strawberry',
//         weight: 15,
//         path: "_0007_Layer-7.png",
//         payouts: { 3: 5.0, 4: 50.0, 5: 500.0 }
//     },
//     {
//         name: 'bar1',
//         weight: 28,
//         path: "_0005_Layer-5.png",
//         matchesWith: ["bar1", "bar2", "bar3"],
//         payouts: { 3: 3.0, 4: 25.0, 5: 200.0 }
//     },
//     {
//         name: 'bar2',
//         weight: 28,
//         path: "_0004_Layer-4.png",
//         matchesWith: ["bar1", "bar2", "bar3"],
//         payouts: { 3: 3.0, 4: 25.0, 5: 200.0 }
//     },
//     {
//         name: 'bar3',
//         weight: 28,
//         path: "_0003_Layer-3.png",
//         matchesWith: ["bar1", "bar2", "bar3"],
//         payouts: { 3: 3.0, 4: 25.0, 5: 200.0 }
//     },
//     {
//         name: 'cherry',
//         weight: 60,
//         path: "_0014_Layer-13.png",
//         payouts: { 3: 1.0, 4: 8.0, 5: 40.0 }
//     },
//     {
//         name: 'citrus',
//         weight: 75,
//         path: "_0013_Layer-12.png",
//         payouts: { 3: 0.8, 4: 5.0, 5: 25.0 }
//     },
//     {
//         name: 'orange',
//         weight: 140,
//         path: "_0012_Layer-11.png",
//         payouts: { 3: 0.6, 4: 2.5, 5: 12.0 }
//     },
//     {
//         name: 'plum',
//         weight: 130,
//         path: "_0011_Layer-10.png",
//         payouts: { 3: 0.6, 4: 2.5, 5: 12.0 }
//     },
//     {
//         name: 'bell',
//         weight: 120,
//         path: "_0006_Layer-6.png",
//         payouts: { 3: 0.5, 4: 2.0, 5: 10.0 }
//     },
//     {
//         name: 'grapes',
//         weight: 110,
//         path: "_0009_Layer-9.png",
//         payouts: { 3: 0.5, 4: 2.0, 5: 10.0 }
//     }
// ];



interface clashConf {
    width: number
    height: number
    isMobile: boolean
    mode?: string
}

export default class Lines extends SlotsBase {
    constructor(rootContainer: Container, app: Application, config: Partial<clashConf> = {}) {
        const myConfig: GameConfig = {
            // Layout
            width: 1280,
            height: 720,
            symbolWidth: config.isMobile ? 100 : 110,
            symbolHeight: config.isMobile ? 100 : 110,
            borderRadius: 0,
            titleImage: "",
            gapX: 10,
            gapY: 8,
            foregroundOffset: {
                top: 28
            },
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
                { alias: "background", src: "background.png" },
                { alias: "sprite_sheet", src: "lines.json" }
            ],

            ui: {
                spinButton: {
                    asset: "_0023_Layer-20.png",
                    position: {
                        right: 394,
                        bottom: 101,
                    },
                    scale: .48
                },
                bet: {
                    betSymbol: {
                        asset: "_0022_Layer-19.png",
                        position: {
                            left: 413,
                            bottom: 125
                        },
                        scale: .3
                    },
                    incrementBtn: {
                        asset: "_0021_Layer-18.png",
                        position: {
                            left: 475,
                            bottom: 100
                        },
                        scale: .2
                    },
                    decrementBtn: {
                        asset: "_0020_Layer-17.png",
                        position: {
                            left: 410,
                            bottom: 100
                        },
                        scale: .2
                    },
                    textPos: {
                        left: 438,
                        bottom: 97
                    },
                    textStyle: {
                        fontSize: 18,
                        fontFamily: "Arial",
                        fill: 0xffffff,
                        align: "left"
                    }
                },
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
            pathPrefix: "/games/Lines/",
            symbols: [
                {
                    "name": "wild",
                    "weight": [15, 15, 15, 10, 5, 2],
                    "cheatWeight": [99999, 99999],
                    "path": "_0002_Layer-2.png",
                    "matchesWith": ["*"],
                    "payouts": { 3: 10.0, "4": 100.0, "5": 2500.0 }
                },
                {
                    "name": "strawberry",
                    "weight": 20,
                    "path": "_0007_Layer-7.png",
                    "payouts": { "3": 4.0, "4": 40.0, "5": 800.0 }
                },
                {
                    "name": "bar3",
                    "weight": 35,
                    "path": "_0003_Layer-3.png",
                    "matchesWith": ["bar1", "bar2", "bar3"],
                    "payouts": { "3": 2.5, "4": 25.0, "5": 400.0 }
                },
                {
                    "name": "bar2",
                    "weight": 40,
                    "path": "_0004_Layer-4.png",
                    "matchesWith": ["bar1", "bar2", "bar3"],
                    "payouts": { "3": 2.0, "4": 15.0, "5": 250.0 }
                },
                {
                    "name": "bar1",
                    "weight": 45,
                    "path": "_0005_Layer-5.png",
                    "matchesWith": ["bar1", "bar2", "bar3"],
                    "payouts": { "3": 1.5, "4": 10.0, "5": 150.0 }
                },
                {
                    name: "mixed_bar",
                    weight: 0, // Should not appear on reels naturally
                    path: "",  // No texture needed if only used for payout lookup
                    payouts: { 3: 0.5, 4: 2.0, 5: 10.0 } // Your desired lower payout
                },
                {
                    "name": "bell",
                    "weight": 60,
                    "path": "_0006_Layer-6.png",
                    "payouts": { "3": 1.0, "4": 8.0, "5": 100.0 }
                },
                {
                    "name": "grapes",
                    "weight": 65,
                    "path": "_0009_Layer-9.png",
                    "payouts": { "3": 0.8, "4": 5.0, "5": 60.0 }
                },
                {
                    "name": "citrus",
                    "weight": 90,
                    "path": "_0013_Layer-12.png",
                    "payouts": { "3": 0.5, "4": 3.0, "5": 40.0 }
                },
                {
                    "name": "orange",
                    "weight": 110,
                    "path": "_0012_Layer-11.png",
                    "payouts": { "3": 0.4, "4": 2.0, "5": 25.0 }
                },
                {
                    "name": "plum",
                    "weight": 120,
                    "path": "_0011_Layer-10.png",
                    "payouts": { "3": 0.4, "4": 2.0, "5": 25.0 }
                },
                {
                    "name": "cherry",
                    "weight": 140,
                    "path": "_0014_Layer-13.png",
                    "payouts": { "3": 0.2, "4": 1.5, "5": 15.0 }
                }
            ],
            mode: "normal",
            defaultLandingEffect: "DEFAULT_LAND",
            defaultMatchEffect: "DEFAULT_MATCH",
            defaultExplodeEffect: "DEFAULT_EXPLODE",
            ...config,
        };

        super(rootContainer, app, myConfig);
        this.registerFeature(new Scatter(this, {
            name: "scatter",
            weight: [50, 30, 5, 2, 1],
            cheatWeight: [99999, 99999, 99999],
            onlyAppearOnRoll: true,
            path: "_0001_Layer-1.png",
            anticipation: {
                after: 2,
                count: 15,
            },
            onePerReel: true,
        }))
        this.registerFeature(new ExpandingWildsFeature(this))
        this.registerFeature(new PaylineEngine(this,
            {
                left: config.width / 2 - 110,
                bottom: 113
            },
            [
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


            ]))


        this.init().then(() => {
            this.ui.place((() => {
                const gap = 5
                const size = 50
                const gp = 10
                const scale = .9
                const cont = new Container()
                const g = new Graphics()
                g.rect(-gp, -gp, 125 + gp * 2, (this.config.symbols.length - 1) * (size + gap) + gp * 2).fill("black")
                g.alpha = .8

                const blurFilter = new BlurFilter();
                blurFilter.strength = 8;
                blurFilter.resolution = this.app.renderer ? this.app.renderer.resolution : 1;

                g.filters = [blurFilter];
                cont.addChild(g)
                this.config.symbols.forEach((symbol: SymbolDef, index: number) => {
                    if (symbol.payouts) {
                        const p = getPos({ right: 0, top: (size + gap) * index }, this.config)
                        if (symbol.name == "mixed_bar") {
                            cont.addChild(new Text({ text: "Any\nBar", x: p.x + 7, y: p.y, style: { fontSize: 20, align: "center", fill: 0xffffff } }))
                        }
                        else {
                            const texture = Assets.get(symbol.path)
                            const ratio = texture.height / texture.width

                            const spriteWidth = size * scale
                            const spriteHeight = size * ratio * scale

                            // Calculate centered position: Cell Start + (Cell Size - Sprite Size) / 2
                            const centeredX = p.x + (size - spriteWidth) / 2
                            const centeredY = p.y + (size - spriteHeight) / 2

                            cont.addChild(new Sprite({
                                texture: texture,
                                x: centeredX,
                                y: centeredY,
                                width: spriteWidth,
                                height: spriteHeight
                            }))
                        }
                        cont.addChild(new Text({ text: "3: " + symbol.payouts[3], x: p.x + size + gap, y: p.y, style: { fontSize: 18, fill: 0xffffff } }))
                        cont.addChild(new Text({ text: "4: " + symbol.payouts[4], x: p.x + size + gap, y: p.y + size / 3, style: { fontSize: 18, fill: 0xffffff } }))
                        cont.addChild(new Text({ text: "5: " + symbol.payouts[5], x: p.x + size + gap, y: p.y + size / 3 * 2, style: { fontSize: 18, fill: 0xffffff } }))
                    }

                })
                return cont
            })(), {
                position: {
                    right: 175,
                    top: 25
                }
            })

            const scatter = new Sprite(this.config.symbols.find(s => s.name == "scatter").texture)
            const wild = new Sprite(this.config.symbols.find(s => s.name == "wild").texture)
            this.ui.place(scatter, {
                position: {
                    top: 127,
                    right: 405
                },
                scale: {
                    x: .2,
                    y: .2
                }
            })
            this.ui.place(wild, {
                position: {
                    top: 130,
                    right: 470
                },
                scale: {
                    x: .25,
                    y: .25
                }
            })
        })
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