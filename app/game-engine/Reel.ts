import * as PIXI from 'pixi.js';
import gsap from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import { getRandomSymbolId } from "./Math"; // .ts extension is implied in imports
import { SymbolDef } from "./types"

// Register Plugins
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

// --- 1. Custom Interface for your Symbols ---
// Since you attach custom data (symbolId, yToMove) to PIXI Sprites, we extend the type.
interface ReelSymbol extends PIXI.Sprite {
    symbolId: number;
    yToMove: number;
    explode?: number;
    textureScale?: number;
}

// --- 3. Interface for the Reel Configuration ---
interface ReelConfig {
    symbolWidth: number;
    symbolHeight: number;
    gapX: number;
    gapY: number;
    cols: number;
    rows: number;
    symbolsBeforeStop: number;
    reelLandSymbolsDelay: number;
    spinSpeed: number;
    spinAcceleration: number;
    windUp: number; // e.g. -50
    invisibleFlyby: boolean;
    motionBlurStrength: number;
    delayBeforeCascading: number;
    replaceTime: number;
    symbols: SymbolDef[]; // Array of symbol definitions
    [key: string]: any; // Allow loose config props
}

// --- 4. Interface for the Game Class ---
// This prevents using 'any' for the game instance
interface IGame {
    engine: any;
    config: ReelConfig;
    initialGrid: any; // Or Grid type if you have it
    reels: Reel[];
    handleSymbolExplode: (effect: string, sprite: ReelSymbol, reelIndex: number) => void;
    handleSymbolLand: (effect: string | undefined, sprite: ReelSymbol, index: number) => Promise<any> | void;
    handleSymbolMatch: (effect: string | undefined, sprite: ReelSymbol) => Promise<any> | void;
}

// --- 5. Return type for symbol data helpers ---
interface SymbolData {
    id: number;
    texture: PIXI.Texture | null; // Nullable for invisible flyby
}

export class Reel {
    public app: PIXI.Application;
    public game: IGame;
    public index: number;
    public config: ReelConfig;

    public container: PIXI.Container;
    public symbols: ReelSymbol[] = [];

    // State management
    public state: 'IDLE' | 'SPINNING' | 'ACCELERATING' | 'STOPPING' | 'DROPPING' | 'LANDING' | 'CASCADING';
    public speed: number = 0;

    // Logic vars
    public targetResult: number[] | null = null;
    public stopDelay: number = 0;
    public symbolsRotated: number = 0;
    public targetsShown: number = 0;
    public symbolsBeforeStop: number;

    public explodedSymbols: ReelSymbol[] = [];
    public cascadeResolve: ((value?: any) => void) | null = null;
    public spinResolve: ((value?: any) => void) | null = null;

    // Visuals
    public blurFilter: PIXI.BlurFilter;
    public slotHeight: number = 0;

    // Anticipation flags
    public shouldTriggerAnticipation: boolean = false;
    public anticipationSymbolId: number = -1;
    public forceVisible: boolean = false; // Added based on usage in getRandomSymbolData

    constructor(app: PIXI.Application, index: number, config: ReelConfig, game: IGame) {
        this.app = app;
        this.game = game;
        this.index = index;
        this.config = config;

        this.container = new PIXI.Container();
        this.container.x = index * (config.symbolWidth + config.gapX);
        this.container.y = 0;

        this.state = 'IDLE';
        this.symbolsBeforeStop = this.config.symbolsBeforeStop + (this.config.reelLandSymbolsDelay * index);

        this.initSymbols();

        this.blurFilter = new PIXI.BlurFilter();
        this.blurFilter.strength = 0;
        this.blurFilter.strengthX = 0; // Ensure no horizontal blur
        this.blurFilter.strengthY = 0;
        this.blurFilter.resolution = this.app.renderer ? this.app.renderer.resolution : 1;

        // Apply the filter to the entire reel container
        this.container.filters = [this.blurFilter];
    }

    initSymbols(): void {
        const bufferCount = 2;
        const totalSymbols = this.config.rows + bufferCount;

        this.slotHeight = this.config.symbolHeight + (this.config.gapY || 0);

        for (let i = 0; i < totalSymbols; i++) {
            const randomData = this.getRandomSymbolData(false);

            // TS check: ensure texture exists before creating sprite
            if (!randomData.texture) continue;

            const symbol = new PIXI.Sprite(randomData.texture) as ReelSymbol;

            symbol.symbolId = randomData.id;
            symbol.yToMove = 0; // Init custom prop

            this.applySymbolStyle(symbol, randomData.id);
            symbol.y = (i - 1) * this.slotHeight + (this.config.symbolHeight / 2);

            this.symbols.push(symbol);
            this.container.addChild(symbol);
        }
    }

    async spin(resultData: number[]): Promise<void> {
        this.reset();
        this.state = 'ACCELERATING';

        await new Promise<void>(resolve => {
            // Move the container UP (negative y)
            gsap.to(this.container, {
                y: this.game.config.windUp,
                duration: 0.25,
                ease: "back.out(1.5)",
                onComplete: () => {
                    // Snap back
                    gsap.to(this.container, {
                        y: 0,
                        duration: 0.15,
                        ease: "power1.in"
                    });
                    resolve();
                }
            });
        });

        gsap.to(this, {
            speed: this.config.spinSpeed,
            duration: this.config.spinAcceleration,
            ease: "power2.out",
            onStart: () => { this.state = "SPINNING"; }
        });

        this.targetResult = resultData;

        return new Promise((resolve) => {
            this.spinResolve = () => {
                this.blurFilter.strengthY = 0;
                if (this.index !== this.config.cols - 1) {
                    this.anticipation();
                }
                resolve();
            };
        });
    }

    reset(): void {
        this.state = "IDLE";
        this.targetsShown = 0;
        this.symbolsRotated = 0;
    }

    update(delta: number): void {
        if (this.state === "IDLE") {
            this.container.filters = null;
            return;
        }

        if (this.state === "CASCADING") {
            this.updateCascade(delta);
            return;
        }

        // Apply Blur
        if (this.state === 'SPINNING' || this.state === 'ACCELERATING') {
            if (!this.container.filters) this.container.filters = [this.blurFilter];
            this.blurFilter.strengthY = Math.abs(this.speed) * this.config.motionBlurStrength;
        }

        if (this.state === "SPINNING" || this.state === "ACCELERATING") {
            // Logic for Invisible Flyby (currently disabled via false check in original code)
            if (this.config.invisibleFlyby && this.targetResult && false) {
                this.state = "DROPPING";
                this.symbols.forEach((symbol, index) => {
                    symbol.y = -this.config.symbolHeight * index;

                    if (!this.targetResult) return;

                    const targetId = this.targetResult[index - 1];
                    let newData: SymbolData;

                    if (targetId !== undefined) {
                        newData = this.getSymbolDataById(targetId);
                        this.targetsShown++;
                    } else {
                        newData = this.getRandomSymbolData();
                    }

                    const targetY = this.slotHeight * (index - 1);

                    if (newData.texture) {
                        symbol.texture = newData.texture;
                        symbol.symbolId = newData.id;
                    }

                    gsap.to(symbol, {
                        y: targetY,
                        ease: "power1.in",
                        duration: .5,
                        delay: (index - 1) * .1,
                        onComplete: () => {
                            if (index === this.config.rows + 1) {
                                this.state = "IDLE";
                                if (this.spinResolve) this.spinResolve(this.targetResult);
                            }
                        }
                    });
                });
            }
            else {
                // Standard Rolling Logic
                const totalH = this.slotHeight * this.symbols.length;
                const viewBottom = (this.config.rows + 1) * this.slotHeight;

                this.symbols.forEach((s) => {
                    s.y += this.speed * delta;

                    if (s.y > viewBottom) {
                        s.y -= totalH;
                        let newData: SymbolData;

                        if (this.targetResult && this.symbolsRotated >= this.symbolsBeforeStop) {
                            const targetId = this.targetResult[this.targetsShown];
                            if (targetId !== undefined) {
                                newData = this.getSymbolDataById(targetId);
                                this.targetsShown++;
                            } else {
                                newData = this.getRandomSymbolData();
                            }
                        }
                        else {
                            newData = this.getRandomSymbolData(this.config.invisibleFlyby);
                        }

                        // Apply new data
                        if (newData.texture) {
                            s.texture = newData.texture;
                            s.symbolId = newData.id;
                            this.applySymbolStyle(s, newData.id);
                        }

                        if (this.targetResult && this.symbolsRotated === this.symbolsBeforeStop + this.targetResult.length) {
                            this.state = "LANDING";
                            this.triggerLanding();
                        }
                        this.symbolsRotated++;
                    }
                });
            }
        }
    }

    realignOnGrid(): void {
        this.symbols.sort((a, b) => a.y - b.y);

        const h = this.config.symbolHeight;
        const slotHeight = this.slotHeight;
        const firstSymbol = this.symbols[0];
        const currentY = firstSymbol.y;

        const idealY = Math.round((currentY - h / 2) / slotHeight) * slotHeight + h / 2;

        this.symbols.forEach((symbol, index) => {
            symbol.y = idealY + (index * slotHeight);
        });
    }

    explodeAndCascade(indexExplode: number[], idsReplace: number[], reelData: number[]): Promise<number[]> {
        indexExplode = indexExplode.sort((a, b) => a - b);

        return new Promise((resolve) => {
            this.cascadeResolve = () => {
                resolve([
                    ...reelData.filter((_, index) => !indexExplode.includes(index)),
                    ...idsReplace
                ]);
            };

            // Resets
            this.symbols.forEach(symbol => {
                symbol.yToMove = 0;
                symbol.explode = 0;
            });
            this.explodedSymbols = [];
            this.sort();

            setTimeout(() => {
                this.state = "CASCADING";
            }, this.config.delayBeforeCascading);

            for (let i = 0; i < indexExplode.length; i++) {
                const symbolToExplode = this.symbols[indexExplode[i] + 1];
                // remove current one
                this.explodedSymbols.push(symbolToExplode);

                const config = this.config.symbols.find(s => s.id === symbolToExplode.symbolId);

                // Trigger fire/particles/fade
                if (config && config.explodeEffect) {
                    this.game.handleSymbolExplode(config.explodeEffect, symbolToExplode, this.index);
                }
            }

            // Calculate movement needed
            this.explodedSymbols.forEach((explodedSymbol) => {
                this.symbols.forEach((symbol) => {
                    if (explodedSymbol.y >= symbol.y) {
                        symbol.yToMove += this.slotHeight;
                    }
                });
            });

            this.explodedSymbols.forEach((explodedSymbol, i) => {
                this.sort();
                const newId = idsReplace[i];
                const newData = this.getSymbolDataById(newId);

                // Fill exploded symbol with random buffer data to reuse it
                const randomFillData = this.getRandomSymbolData();
                if (randomFillData.texture) {
                    explodedSymbol.texture = randomFillData.texture;
                    explodedSymbol.symbolId = randomFillData.id;
                    this.applySymbolStyle(explodedSymbol, randomFillData.id);
                }

                // Setup the NEW incoming symbol at the top
                const topSymbol = this.symbols[this.symbols.length - 1];
                if (newData.texture) {
                    topSymbol.texture = newData.texture;
                    topSymbol.symbolId = newData.id;
                    this.applySymbolStyle(topSymbol, newData.id);
                }

                const offset = this.slotHeight / 2 - this.slotHeight * (i + 2);
                explodedSymbol.y = offset;
                explodedSymbol.yToMove = this.slotHeight * this.explodedSymbols.length;
            });
        });
    }

    sort(): void {
        this.symbols = this.symbols.sort((a, b) => a.y - b.y).reverse();
    }

    sortReverse(): void {
        this.symbols = this.symbols.sort((a, b) => a.y - b.y);
    }

    getRandomSymbolData(invisibleFlyby: boolean = false): SymbolData {
        if (invisibleFlyby && !this.forceVisible) {
            return {
                id: -1,
                texture: null
            };
        }

        // Ensure you have valid imports for types in Math.ts if needed
        const id = getRandomSymbolId(this.game.engine, {
            firstSpin: false,
            gridToCheck: this.game.initialGrid,
            colIndex: this.index, // Fixed typo: 'coldIndex' -> 'colIndex'
            allSymbols: this.config.symbols
        });

        const symbolDef = this.config.symbols.find(s => s.id === id);
        return {
            id: id,
            texture: symbolDef ? symbolDef.texture : PIXI.Texture.EMPTY // Fallback
        };
    }

    getSymbolDataById(id: number): SymbolData {
        const symbolDef = this.config.symbols.find(s => s.id === id);
        return {
            id: id,
            texture: symbolDef ? symbolDef.texture : PIXI.Texture.EMPTY
        };
    }

    applySymbolStyle(sprite: ReelSymbol, symbolId: number): void {
        const symbolConfig = this.config.symbols.find(s => s.id === symbolId);
        const customScale = symbolConfig?.scale || 1;

        if (!sprite.texture) return;

        // Reset scale to 1 before measuring
        sprite.scale.set(1);

        const ratioX = this.config.symbolWidth / sprite.texture.width;
        const ratioY = this.config.symbolHeight / sprite.texture.height;
        const baseScale = Math.min(ratioX, ratioY);

        const finalScale = baseScale * customScale;

        sprite.scale.set(finalScale);
        sprite.textureScale = finalScale; // Now valid due to interface

        sprite.anchor.set(0.5);
        sprite.x = this.config.symbolWidth / 2;
    }

    async animateSymbolReplacement(rowIndex: number, newSymbolId: number): Promise<void> {
        return new Promise((resolve) => {
            this.sort();

            const symbolSprite = this.symbols[rowIndex + 1];

            if (!symbolSprite) {
                resolve();
                return;
            }

            const newData = this.getSymbolDataById(newSymbolId);
            let targetScale = 1;

            const tl = gsap.timeline({
                onComplete: () => {
                    resolve();
                }
            });
            tl.to(symbolSprite.scale, {
                x: 0,
                y: 0,
                duration: this.config.replaceTime,
                ease: "back.in(2)"
            });
            tl.call(() => {
                if (newData.texture) {
                    symbolSprite.texture = newData.texture;
                    symbolSprite.symbolId = newData.id;

                    this.applySymbolStyle(symbolSprite, newData.id);
                    targetScale = symbolSprite.scale.x;
                    symbolSprite.scale.set(0);
                }
            });

            tl.to(symbolSprite.scale, {
                x: () => targetScale,
                y: () => targetScale,
                duration: 0.35,
                ease: "back.out(2)"
            });
        });
    }

    anticipation(): void {
        if (!this.shouldTriggerAnticipation) return;
        if (this.index === this.config.cols - 1) return;

        this.game.reels.forEach((reel) => {
            if (reel.state == "IDLE") {
                reel.symbols.forEach(symbol => {
                    if (symbol.symbolId === this.anticipationSymbolId) {
                        if (!gsap.isTweening(symbol.scale)) {
                            this.applySymbolStyle(symbol, symbol.symbolId);
                            const baseScaleX = symbol.scale.x;
                            const baseScaleY = symbol.scale.y;

                            gsap.to(symbol.scale, {
                                x: baseScaleX * 1.2,
                                y: baseScaleY * 1.2,
                                duration: 0.6,
                                yoyo: true,
                                repeat: -1,
                                ease: "sine.inOut"
                            });
                        }
                    } else {
                        if (symbol.alpha !== 0.5) {
                            gsap.to(symbol, {
                                pixi: { tint: 0x555555 },
                                duration: 0.3,
                                ease: "power2.out"
                            });
                        }
                    }
                });
            }
            else {
                if (reel.speed > this.config.spinSpeed / 2) {
                    gsap.to(reel, {
                        speed: this.config.spinSpeed / 2,
                        duration: 1,
                        ease: "power2.out"
                    });
                }
            }
        });
    }

    clearAnticipation(): void {
        this.symbols.forEach(symbol => {
            gsap.killTweensOf(symbol.scale);
            gsap.killTweensOf(symbol);

            gsap.to(symbol, {
                pixi: { tint: 0xFFFFFF },
                duration: 0.3,
                ease: "power2.out"
            });

            if (symbol.symbolId !== undefined) {
                this.applySymbolStyle(symbol, symbol.symbolId);
            }
        });
    }

    triggerLandingEffects(): Promise<any[]> {
        const promises: Promise<any>[] = [];

        for (let i = 1; i <= this.config.rows; i++) {
            const symbolSprite = this.symbols[i];
            if (!symbolSprite) continue;

            const symbolConfig = this.config.symbols.find(s => s.id === symbolSprite.symbolId);

            if (symbolConfig && symbolConfig.landingEffect) {
                if (this.game.handleSymbolLand) {
                    const p = this.game.handleSymbolLand(symbolConfig.landingEffect, symbolSprite, i);
                    if (p) promises.push(p);
                }
            }
        }
        return Promise.all(promises);
    }

    playMatchEffects(rowIndices: number[]): Promise<any[]> {
        const promises: Promise<any>[] = [];

        rowIndices.forEach(rowIndex => {
            const targetY = ((this.config.rows - 1 - rowIndex) * this.slotHeight) + (this.config.symbolHeight / 2);

            let best: ReelSymbol | null = null;
            let bestDist = Infinity;

            for (let i = 0; i < this.symbols.length; i++) {
                const s = this.symbols[i];
                const d = Math.abs(s.y - targetY);
                if (d < bestDist) {
                    bestDist = d;
                    best = s;
                }
            }

            const symbol = best;

            if (symbol) {
                const config = this.config.symbols.find(s => s.id === symbol.symbolId);

                if (this.game.handleSymbolMatch) {
                    const effectName = config?.matchEffect;
                    const p = this.game.handleSymbolMatch(effectName, symbol);
                    if (p) promises.push(p);
                }
            }
        });
        return Promise.all(promises);
    }

    destroy(): void {
        gsap.killTweensOf(this.container);
        gsap.killTweensOf(this);

        // Correct destroy call for PIXI v7/v8
        this.container.destroy({ children: true });

        this.symbols = [];
        // @ts-ignore
        this.app = null;
    }

    updateCascade(delta: number): void {
        const speed = 20 * delta; // You might want to make '20' a config variable
        let stillMoving = false;

        this.symbols.forEach((symbol) => {
            if (symbol.yToMove > 0) {
                stillMoving = true;
                const dist = Math.min(speed, symbol.yToMove);

                symbol.y += dist;
                symbol.yToMove -= dist;
            }
        });

        if (!stillMoving) {
            this.state = "IDLE";
            if (this.cascadeResolve) {
                this.cascadeResolve();
                this.cascadeResolve = null;
            }
        }
    }

    triggerLanding(): void {
        this.symbols.sort((a, b) => a.y - b.y);

        this.symbols.forEach((symbol, index) => {
            const destY = ((index - 1) * this.slotHeight) + (this.config.symbolHeight / 2);

            gsap.to(symbol, {
                y: destY,
                ease: "power1.in(1.7)",
                duration: 0.01,
                onStart: () => {
                    if (index === this.config.rows + 1) {
                        this.state = "IDLE";
                    }
                },
                onComplete: () => {
                    if (symbol.symbolId === -1) {
                        return;
                    }
                    const symbolDef = this.config.symbols.find(s => s.id === symbol.symbolId);

                    if (symbolDef && this.game.handleSymbolLand) {
                        this.game.handleSymbolLand(symbolDef.landingEffect, symbol, index);
                    }

                    if (index === this.config.rows - 1) {
                        if (this.spinResolve) {
                            this.spinResolve(this.targetResult);
                            this.spinResolve = null;
                        }
                    }
                }
            });
        });
    }
}