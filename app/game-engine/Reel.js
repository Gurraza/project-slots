import * as PIXI from 'pixi.js';
import gsap from "gsap"
import { PixiPlugin } from "gsap/PixiPlugin"; // 1. Import Plugin
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

export class Reel {
    constructor(app, index, config, game) {
        this.app = app;
        this.game = game;
        this.index = index;
        this.config = config;

        this.container = new PIXI.Container();
        this.container.x = index * (config.symbolWidth + config.gapX);
        this.container.y = 0;

        this.symbols = [];
        this.state = 'IDLE'; // IDLE, SPINNING, STOPPING
        this.speed = 0;
        this.targetResult = null;
        this.stopDelay = 0;
        this.symbolsRotated = 0
        this.targetsShown = 0
        this.symbolsBeforeStop = this.config.symbolsBeforeStop


        this.explodedSymbols = []

        this.cascadeResolve = null;
        this.ghostContainer = new PIXI.Container();
        this.container.addChild(this.ghostContainer)
        this.initSymbols();

        this.blurFilter = new PIXI.BlurFilter();
        this.blurFilter.strength = 0;
        this.blurFilter.strengthX = 0; // Ensure no horizontal blur
        this.blurFilter.strengthY = 0;
        this.blurFilter.resolution = this.app.renderer.resolution;

        // Apply the filter to the entire reel container
        this.container.filters = [this.blurFilter];
    }

    initSymbols() {
        const bufferCount = 2;
        const totalSymbols = this.config.rows + bufferCount;

        this.slotHeight = this.config.symbolHeight + (this.config.gapY || 0);

        for (let i = 0; i < totalSymbols; i++) {
            const randomData = this.getRandomSymbolData(false);
            const symbol = new PIXI.Sprite(randomData.texture);

            symbol.symbolId = randomData.id;
            this.applySymbolStyle(symbol, randomData.id);
            // symbol.width = this.config.symbolWidth;
            // symbol.height = this.config.symbolHeight;

            // symbol.anchor.set(0.5);
            // symbol.x = this.config.symbolWidth / 2;
            symbol.y = (i - 1) * this.slotHeight + (this.config.symbolHeight / 2);

            this.symbols.push(symbol);
            this.container.addChild(symbol);
        }
    }

    spin(resultData) {
        this.reset();
        this.state = 'ACCELERATING';
        gsap.to(this, {
            speed: this.config.spinSpeed,
            duration: .5,
            ease: "power2.out",
            onStart: () => this.state = "SPINNING"
        });
        this.targetResult = resultData;

        return new Promise((resolve) => {
            this.spinResolve = () => {
                this.blurFilter.strengthY = 0;
                if (this.index !== this.config.cols - 1) {
                    this.anticipation()
                }
                resolve()
            }
        });
    }

    reset() {
        this.state = "IDLE"
        this.targetsShown = 0
        this.symbolsRotated = 0
        this.ghostContainer.removeChildren();
    }

    update(delta) {
        if (this.state === 'IDLE') {
            // Optimization: Remove the filter completely when not needed
            if (this.container.filters !== null) {
                this.container.filters = null;
            }
            return;
        }
        const blurAmount = Math.abs(this.speed) * (this.config.motionBlurStrength);
        if (this.state !== 'IDLE' && !this.container.filters) {
            this.container.filters = [this.blurFilter];
        }
        // Apply purely vertical blur
        const maxSpeed = this.config.spinSpeed;
        const accel = this.config.spinAcceleration;

        if (this.state === 'ACCELERATING') {
            this.blurFilter.strengthY = blurAmount;
        }
        else if (this.state === 'LANDING') {
            this.blurFilter.strengthY = blurAmount;
            const h = this.config.symbolHeight;
            const symbolY = this.symbols[0].y;
            const error = (symbolY - h / 2) % this.slotHeight;
            let distance = Math.abs(error);

            const currentOffset = (symbolY - (h / 2)) % this.slotHeight;
            let distanceRemaining = 0;
            if (currentOffset > 0) {
                distanceRemaining = this.slotHeight - currentOffset;
            } else {
                distanceRemaining = Math.abs(currentOffset);
            }
            let targetSpeed = distanceRemaining * this.config.spinDeacceleration
            if (targetSpeed < 2) targetSpeed = 2;
            this.speed = targetSpeed;
            if (distance < 4) {
                this.blurFilter.strengthY = 0; // Turn off blur explicitly on stop
                this.speed = 0;
                this.realignOnGrid();
                // 1. Trigger Custom Effects and get their Promise
                const effectsPromise = this.triggerLandingEffects();

                // 2. Handle Bounce Logic
                let bouncePromise = Promise.resolve(); // Default to instant resolve
                if (this.config.bounce && this.config.bounce > 0) {
                    // We modify performLandingBounce to return a Promise
                    bouncePromise = this.performLandingBounce();
                } else {
                    this.state = 'IDLE';
                    // Ensure y is perfect if not bouncing
                    this.container.y = 0;
                }

                // 3. WAIT for BOTH (Bounce + Custom Effects) before finishing the spin
                Promise.all([effectsPromise, bouncePromise]).then(() => {
                    if (this.spinResolve) {
                        this.spinResolve(this.targetResult);
                        this.spinResolve = null;
                    }
                });
                return;
            }
        }
        else if (this.state === "CASCADING") {
            const speed = 20 * delta;

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
            return;
        }

        // 2. Move Symbols
        for (let i = 0; i < this.symbols.length; i++) {
            const s = this.symbols[i];
            s.y += this.speed * delta;
        }

        if (this.state !== 'CASCADING' && this.state !== 'IDLE') {
            this.blurFilter.strengthY = blurAmount;
            // 3. Infinite Loop Logic (The "Treadmill")
            const totalH = this.slotHeight * this.symbols.length;
            const viewBottom = (this.config.rows + 1) * this.slotHeight;

            this.symbols.forEach((s) => {
                // If symbol goes below the bottom buffer
                if (s.y > viewBottom) {
                    // Teleport to top
                    s.y -= totalH;
                    let newData;
                    if (this.symbolsRotated >= this.symbolsBeforeStop) {
                        const targetId = this.targetResult[this.targetsShown]
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
                    s.texture = newData.texture;
                    s.symbolId = newData.id;
                    this.applySymbolStyle(s, newData.id);
                    if (this.symbolsRotated === this.symbolsBeforeStop + this.targetResult.length) {
                        this.state = "LANDING"
                    }
                    this.symbolsRotated++
                }
            });
        }
    }


    realignOnGrid() {
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

    getRandomTexture() {
        // const randomTex = this.config.symbols[Math.floor(Math.random() * this.config.symbols.length)].texture;
        const randomTex = this.config.symbols[this.game.getRandomSymbolId()].texture
        return randomTex;
    }

    explodeAndCascade(indexExplode, idsReplace, reelData) {
        indexExplode = indexExplode.sort((a, b) => a - b)
        return new Promise((resolve) => {
            this.cascadeResolve = () => resolve([...reelData.filter((symbolId, index) => !indexExplode.includes(index)), ...idsReplace])


            // resets
            this.symbols.forEach(symbol => {
                symbol.yToMove = 0;
                symbol.explode = 0;
            })
            this.explodedSymbols = [];
            this.sort()

            setTimeout(() => {
                this.state = "CASCADING"
            }, this.config.delayBeforeCascading);

            for (let i = 0; i < indexExplode.length; i++) {
                const symbolToExplode = this.symbols[indexExplode[i] + 1]
                // remove current one
                this.explodedSymbols.push(symbolToExplode)

                const config = this.config.symbols[symbolToExplode.symbolId];
                if (this.game.handleSymbolExplode) {
                    // Trigger fire/particles/fade
                    const effectName = config.explodeEffect
                    this.game.handleSymbolExplode(effectName, symbolToExplode, this.index);
                } else {
                    // Fallback to your old default ghost logic if no handler exists
                    // this.spawnGhost(symbolToExplode);
                }
            }

            // goes through all exploded symbols and sets every symbol above it to move down one
            this.explodedSymbols.forEach((explodedSymbol, i) => {
                this.symbols.forEach((symbol, j) => {
                    if (explodedSymbol.y >= symbol.y) {
                        symbol.yToMove += this.slotHeight
                    }
                })
            })

            this.explodedSymbols.forEach((explodedSymbol, i) => {
                this.sort()
                const newId = idsReplace[i];
                const newData = this.getSymbolDataById(newId);
                // this.spawnGhost(explodedSymbol)

                const randomFillData = this.getRandomSymbolData();
                explodedSymbol.texture = randomFillData.texture;
                explodedSymbol.symbolId = randomFillData.id;       // <--- CRITICAL UPDATE
                this.applySymbolStyle(explodedSymbol, randomFillData.id);


                const topSymbol = this.symbols[this.symbols.length - 1];
                topSymbol.texture = newData.texture;
                topSymbol.symbolId = newData.id;
                this.applySymbolStyle(topSymbol, newData.id);      // <--- RE-APPLY SCALE
                const offset = this.slotHeight / 2 - this.slotHeight * (i + 2)
                explodedSymbol.y = offset
                explodedSymbol.yToMove = this.slotHeight * this.explodedSymbols.length
            })
        })
    }
    sort() {
        this.symbols = this.symbols.sort((a, b) => a.y - b.y).reverse();
    }

    debugSquare(y) {
        const w = this.config.symbolWidth / 3;
        const h = this.config.symbolHeight / 3;
        const container = new PIXI.Container();
        container.x = 0
        container.y = y - this.slotHeight / 2
        const bg = new PIXI.Graphics();
        bg.roundRect(0, 0, w, h, 15);
        bg.fill("red");
        bg.stroke({ width: 3, color: 0xcfb972 });
        container.addChild(bg);
        this.container.addChild(container)
    }

    getRandomSymbolData(invisibleFlyby) {
        if (invisibleFlyby && !this.forceVisible) {
            return {
                id: -1,
                texture: null
            }
        }
        const id = this.game.getRandomSymbolId({ firstSpin: false })
        return {
            id: id,
            texture: this.config.symbols[id].texture
        };
    }

    getSymbolDataById(id) {
        return {
            id: id,
            texture: this.config.symbols[id].texture
        };
    }

    spawnGhost(originalSymbol) {
        const ghost = new PIXI.Sprite(originalSymbol.texture);
        ghost.anchor.set(0.5);
        ghost.width = originalSymbol.width;
        ghost.height = originalSymbol.height;
        ghost.x = originalSymbol.x;
        ghost.y = originalSymbol.y;

        // Start visible
        ghost.alpha = 1;

        this.ghostContainer.addChild(ghost);

        // Convert ms to seconds for GSAP
        // const duration = this.config.ghostTime / 1000;
        // gsap.to(ghost.scale, {
        //     x: ghost.scale.x * 1.3, // Expand bigger (2.5x)
        //     y: ghost.scale.y * 1.3,
        //     duration: duration,
        //     ease: "expo.out"

        // });
        // gsap.to(ghost, {
        //     alpha: 0,
        //     duration: duration * 0.5,
        //     delay: duration * 0.3, // Keep it visible for the first 30% of the movement
        //     ease: "power2.in",     // Fade out accelerates
        //     onComplete: () => {
        //         ghost.destroy();
        //     }
        // });
        return ghost
    }

    // 1. New Helper: Applies size while respecting aspect ratio + custom scale
    applySymbolStyle(sprite, symbolId) {
        // Find the specific config for this symbol ID
        // (Assuming this.config.symbols corresponds to your SYMBOLS array)
        const symbolConfig = this.config.symbols.find(s => s.id === symbolId);
        const customScale = symbolConfig?.scale || 1;

        // Reset scale to 1 before measuring
        sprite.scale.set(1);

        // 1. Calculate the ratio to fit the sprite INSIDE the cell box
        //    (Like CSS 'object-fit: contain')
        const ratioX = this.config.symbolWidth / sprite.texture.width;
        const ratioY = this.config.symbolHeight / sprite.texture.height;
        const baseScale = Math.min(ratioX, ratioY);

        // 2. Apply that base fit * your custom modifier
        const finalScale = baseScale * customScale;

        sprite.scale.set(finalScale);

        // 3. Center it
        sprite.anchor.set(0.5);
        sprite.x = this.config.symbolWidth / 2;
    }

    // In Reel.js

    async animateSymbolReplacement(rowIndex, newSymbolId) {
        return new Promise((resolve) => {
            this.sort()

            // 1. Find the correct sprite. 
            // NOTE: If you have buffer symbols (invisible ones at top), 
            // you might need to add an offset: this.symbols[rowIndex + 1]
            const symbolSprite = this.symbols[rowIndex + 1]; // +1 assuming 1 top buffer

            if (!symbolSprite) {
                resolve();
                return;
            }
            // --- FUTURE ANIMATION START ---
            // Example: symbolSprite.alpha = 0;
            // -----------------------------
            const newData = this.getSymbolDataById(newSymbolId);
            let targetScale = 1;
            // --- FUTURE ANIMATION END ---
            // Example: Tween back to alpha 1, then resolve()
            // setTimeout(() => { symbolSprite.alpha = 1; resolve() }, 500); 
            // ---------------------------

            const tl = gsap.timeline({
                onComplete: () => {
                    resolve();
                }
            });
            tl.to(symbolSprite.scale, {
                x: 0,
                y: 0,
                duration: this.config.replaceTime,    // Adjust speed (0.25 seconds)
                ease: "back.in(2)" // A little "pull back" anticipation before shrinking
            });
            tl.call(() => {
                // 2a. Swap Texture and Data
                symbolSprite.texture = newData.texture;
                symbolSprite.symbolId = newData.id;

                // 2b. Apply style to calculate the correct scale for the NEW symbol.
                // This sets the scale instantly to the final size.
                this.applySymbolStyle(symbolSprite, newData.id);

                // 2c. Capture that calculated scale.
                targetScale = symbolSprite.scale.x;

                // 2d. Reset scale back to 0 instantly so it can grow in the next step.
                symbolSprite.scale.set(0);
            });


            // --- Sequence Step 3: Expand In ---
            // Animate from 0 to the target scale we captured
            tl.to(symbolSprite.scale, {
                x: () => targetScale, // Use a function to ensure it uses the value captured in the previous step
                y: () => targetScale,
                duration: 0.35,      // Adjust speed (should be slightly slower than shrink for impact)
                ease: "back.out(2)"  // A nice bouncy "pop" in
            });
            // For now, resolve immediately
            // resolve();
        });
    }

    performLandingBounce() {
        this.state = 'BOUNCING';
        const bounceAmount = this.config.bounce || 30;
        const duration = this.config.bounceDuration || 0.5;

        return new Promise((resolve) => {
            const tl = gsap.timeline({
                onComplete: () => {
                    this.state = 'IDLE';
                    this.container.y = 0;
                    resolve(); // Resolve the promise when bounce is done
                }
            });

            tl.to(this.container, {
                y: bounceAmount,
                duration: duration * 0.4,
                ease: "power2.out"
            })
                .to(this.container, {
                    y: 0,
                    duration: duration * 0.6,
                    ease: "back.out(1.2)"
                });
        });
    }
    // --------------------------------------------------------
    // ANTICIPATION VISUALS
    // --------------------------------------------------------

    anticipation() {
        if (this.index === this.config.cols - 1) return
        if (this.symbols.some(symb => this.config.symbols[symb.symbolId].anticipation)) {
            this.game.reels.forEach((reel, index) => {
                if (reel.state == "IDLE") {
                    reel.symbols.forEach(symbol => {
                        if (this.config.symbols[symbol.symbolId].anticipation) {
                            // A. Make it bright (remove any previous tint)
                            // symbol.tint = 0xFFFFFF;

                            // B. Handle Expansion Animation
                            // First, kill any existing animations on the scale to prevent conflicts
                            gsap.killTweensOf(symbol.scale);

                            // Reset the symbol to its "perfect fit" size first so we have a clean starting point
                            this.applySymbolStyle(symbol, symbol.symbolId);

                            // Capture that base scale
                            const baseScaleX = symbol.scale.x;
                            const baseScaleY = symbol.scale.y;

                            // Create a "breathing" pulse animation
                            // expanding to 120% of its original size
                            gsap.to(symbol.scale, {
                                x: baseScaleX * 1.2,
                                y: baseScaleY * 1.2,
                                duration: 0.6,
                                yoyo: true,     // Go back and forth
                                repeat: -1,     // Infinite loop
                                ease: "sine.inOut"
                            });

                        } else {
                            // 2. Not the target? Darken it.
                            // symbol.tint = 0x555555; // Dark Grey

                            // gsap.to(symbol, {
                            //     tint: 0x555555,
                            //     duration: 0.3,
                            //     ease: "power2.out"
                            // });
                            gsap.to(symbol, {
                                pixi: { tint: 0x555555 }, // Use the 'pixi' wrapper
                                duration: 0.3,
                                ease: "power2.out"
                            });

                            // Ensure no residual animations are running on non-targets
                            gsap.killTweensOf(symbol.scale);

                            // Reset size to normal if it was previously animating
                            if (symbol.symbolId !== undefined) {
                                this.applySymbolStyle(symbol, symbol.symbolId);
                            }
                        }
                    })
                }
                else {
                    // reel.speed = this.config.spinSpeed / 2
                    gsap.to(reel, {
                        speed: this.config.spinSpeed / 2,
                        duration: 1,
                        ease: "power2.out"
                    });
                }
            })
        }
    }

    clearAnticipation() {
        this.symbols.forEach(symbol => {
            // 1. Reset Tint to pure white (normal)

            // 2. Kill the pulsing animation
            gsap.killTweensOf(symbol.scale);
            gsap.killTweensOf(symbol);

            gsap.to(symbol, {
                pixi: { tint: 0xFFFFFF }, // Use the 'pixi' wrapper
                duration: 0.3,
                ease: "power2.out"
            });

            // 3. Reset the scale back to the correct fit
            if (symbol.symbolId !== undefined) {
                this.applySymbolStyle(symbol, symbol.symbolId);
            }
        });
    }

    triggerLandingEffects() {
        const promises = [];

        // Loop through visible rows (assuming index 0 is top buffer)
        for (let i = 1; i <= this.config.rows; i++) {
            const symbolSprite = this.symbols[i];
            if (!symbolSprite) continue;

            const symbolConfig = this.config.symbols[symbolSprite.symbolId];

            if (symbolConfig && symbolConfig.landingEffect) {
                // If the game class handles this, it must return a Promise
                if (this.game.handleSymbolLand) {
                    const p = this.game.handleSymbolLand(symbolConfig.landingEffect, symbolSprite, i);
                    if (p) promises.push(p);
                }
            }
        }

        // Return a master promise that waits for all effects on this reel
        return Promise.all(promises);
    }

    playMatchEffects(rowIndices) {
        const promises = [];

        // Robustly map a row index to the visible sprite by comparing Y positions.
        // This avoids relying on array ordering which can change during cascades.
        rowIndices.forEach(rowIndex => {
            // Expected Y position for this row (0 = top row).
            // The grid's row indexing is bottom-up in the game logic, so invert
            // to match display coordinates (top-down).
            const targetY = ((this.config.rows - 1 - rowIndex) * this.slotHeight) + (this.config.symbolHeight / 2);

            // Find the sprite whose y is closest to targetY
            let best = null;
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
                const config = this.config.symbols[symbol.symbolId];

                // If Game class has the hook, call it
                if (this.game.handleSymbolMatch) {
                    const effectName = config.matchEffect
                    const p = this.game.handleSymbolMatch(effectName, symbol);
                    if (p) promises.push(p);
                }
            }
        });

        // Wait for all symbols in this reel to finish celebrating
        return Promise.all(promises);
    }
}