import * as PIXI from 'pixi.js';
import gsap from "gsap"

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
        this.blurFilter.blurX = 0; // Ensure no horizontal blur
        this.blurFilter.blurY = 0;

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
                this.blurFilter.blurY = 0;
                this.anticipation()
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

        // for (let i = this.ghostContainer.children.length - 1; i >= 0; i--) {
        //     const ghost = this.ghostContainer.children[i];

        //     ghost.age += delta;
        //     const progress = ghost.age / ghost.duration;
        //     if (progress >= 1) {
        //         this.ghostContainer.removeChild(ghost); // Remove from memory
        //         continue;
        //     }
        //     const explosionFactor = 1 + (progress * 1);

        //     // Multiply the base scale by the explosion factor
        //     ghost.scale.set(ghost.startScale * explosionFactor);
        //     // ghost.scale.set(targetScale); // <--- CORRECT SYNTAX

        //     // Alpha: fade from 1.0 to 0.0
        //     ghost.alpha = 1 - progress
        // }
        if (this.state === 'IDLE') {
            // Ensure blur is off when idle
            if (this.blurFilter.blurY !== 0) this.blurFilter.blurY = 0;
            return;
        }
        const blurAmount = Math.abs(this.speed) * (this.config.motionBlurStrength);

        // Apply purely vertical blur
        this.blurFilter.blurY = blurAmount;
        const maxSpeed = this.config.spinSpeed;
        const accel = this.config.spinAcceleration;

        if (this.state === 'ACCELERATING') {
            // if (this.speed < maxSpeed) this.speed += accel * delta;
            // else this.state = 'SPINNING';
        }
        else if (this.state === 'LANDING') {
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
                this.blurFilter.blurY = 0; // Turn off blur explicitly on stop
                this.speed = 0;
                this.realignOnGrid();
                this.state = 'IDLE';
                // Check if bounce is configured
                if (this.config.bounce && this.config.bounce > 0) {
                    this.performLandingBounce();
                } else {
                    // No bounce, just stop
                    this.state = 'IDLE';
                    if (this.spinResolve) {
                        this.blurr = 0
                        this.spinResolve(this.targetResult);
                        this.spinResolve = null;
                    }
                }
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
                this.spawnGhost(explodedSymbol)

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
        const duration = this.config.ghostTime / 1000;
        gsap.to(ghost.scale, {
            x: ghost.scale.x * 1.3, // Expand bigger (2.5x)
            y: ghost.scale.y * 1.3,
            duration: duration,
            ease: "expo.out"

        });
        gsap.to(ghost, {
            alpha: 0,
            duration: duration * 0.5,
            delay: duration * 0.3, // Keep it visible for the first 30% of the movement
            ease: "power2.in",     // Fade out accelerates
            onComplete: () => {
                ghost.destroy();
            }
        });
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
        // Increase duration slightly for a smoother feel (0.5s - 0.6s is the sweet spot)
        const duration = this.config.bounceDuration || 0.5;

        const tl = gsap.timeline({
            onComplete: () => {
                this.state = 'IDLE';
                // Ensure we are perfectly at 0 at the end
                this.container.y = 0;

                if (this.spinResolve) {
                    this.spinResolve(this.targetResult);
                    this.spinResolve = null;
                }
            }
        });

        // STEP 1: The "Sink" (Overshoot)
        // We use 'circ.out' or 'power2.out' to simulate the reel fighting tension
        tl.to(this.container, {
            y: bounceAmount,
            duration: duration * 0.4,
            ease: "power2.out"
        })

            // STEP 2: The "Recover" (Return to 0)
            // 'back.out(1.2)' creates a very soft settling motion, going slightly past 0 and returning
            .to(this.container, {
                y: 0,
                duration: duration * 0.6,
                ease: "back.out(1.2)"
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
                            symbol.tint = 0xFFFFFF;

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
                            symbol.tint = 0x555555; // Dark Grey

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
            gsap.killTweensOf(symbol.tint);
            symbol.tint = 0xFFFFFF;

            // 3. Reset the scale back to the correct fit
            if (symbol.symbolId !== undefined) {
                this.applySymbolStyle(symbol, symbol.symbolId);
            }
        });
    }
}