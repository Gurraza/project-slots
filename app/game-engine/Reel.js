import * as PIXI from 'pixi.js';

export class Reel {
    constructor(app, index, config) {
        this.app = app;
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
        this.initSymbols();
        this.symbolsRotated = 0
        this.targetsShown = 0

        this.explodedSymbols = []

        this.cascadeResolve = null;
        this.ghosts = []
    }

    initSymbols() {
        const bufferCount = 2;
        const totalSymbols = this.config.rows + bufferCount;

        this.slotHeight = this.config.symbolHeight + (this.config.gapY || 0);

        for (let i = 0; i < totalSymbols; i++) {
            const randomData = this.getRandomSymbolData();
            const symbol = new PIXI.Sprite(randomData.texture);
            // const symbol = new PIXI.Sprite(this.getRandomTexture())// new PIXI.Sprite(this.config.symbols[0].texture); // Default texture

            symbol.symbolId = randomData.id;
            symbol.width = this.config.symbolWidth;
            symbol.height = this.config.symbolHeight;

            symbol.anchor.set(0.5);
            symbol.x = this.config.symbolWidth / 2;
            symbol.y = (i - 1) * this.slotHeight + (this.config.symbolHeight / 2);

            this.symbols.push(symbol);
            this.container.addChild(symbol);
        }
    }

    spin(resultData) {
        this.reset();
        this.state = 'ACCELERATING';
        this.targetResult = resultData;

        return new Promise((resolve) => {
            this.spinResolve = resolve;
        });
    }

    reset() {
        this.state = "IDLE"
        this.targetsShown = 0
        this.symbolsRotated = 0
    }

    update(delta) {
        if (this.state === 'IDLE') return;

        const maxSpeed = this.config.spinSpeed;
        const accel = this.config.spinAcceleration;

        if (this.state === 'ACCELERATING') {
            if (this.speed < maxSpeed) this.speed += accel * delta;
            else this.state = 'SPINNING';
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
                this.speed = 0;
                this.state = 'IDLE';
                this.realignOnGrid();
                if (this.spinResolve) {
                    this.spinResolve(this.targetResult);
                    this.spinResolve = null;
                }
                return;
            }
        }
        else if (this.state === "CASCADING") {
            // 1. Define a speed (pixels per frame)
            const speed = 20 * delta;

            let stillMoving = false;

            this.symbols.forEach((symbol) => {
                // Only move if there is distance left to travel
                if (symbol.yToMove > 0) {
                    stillMoving = true;

                    // 2. Calculate how much to move this specific frame
                    // We use Math.min to ensure we don't overshoot the target
                    const dist = Math.min(speed, symbol.yToMove);

                    symbol.y += dist;       // Move the symbol visually
                    symbol.yToMove -= dist; // Decrease the remaining distance
                }
            });

            // 3. If no symbols are "stillMoving", we are done
            if (!stillMoving) {
                this.state = "IDLE";
                // this.realignOnGrid(); // Optional: force exact integers here just in case
                if (this.cascadeResolve) {
                    this.cascadeResolve();
                    this.cascadeResolve = null;
                }
            }
            return;
        }
        else if (this.state === "CASCADINGG") {

            this.symbols.forEach((symbol, i) => {
                symbol.y += symbol.yToMove * delta
            })
            if (!this.symbols.some(symbol => Math.abs(symbol.y - symbol.yToMove) > 4)) {
                this.state = "IDLE"
            }
            // this.realignOnGrid()
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
                    if (this.symbolsRotated >= this.config.symbolsBeforeStop) {
                        const targetId = this.targetResult[this.targetsShown]
                        if (targetId !== undefined) {

                            newData = this.getSymbolDataById(targetId);
                            this.targetsShown++;
                        } else {
                            newData = this.getRandomSymbolData();
                        }
                        // const newSymbol = (this.targetsShown === this.config.rows ? this.getRandomTexture() : this.config.symbols[this.targetResult[this.targetsShown]].texture)

                        // this.targetsShown++
                        // s.texture = newSymbol
                        s.texture = newData.texture;
                        s.symbolId = newData.id; // Update ID
                    }
                    else {
                        newData = this.getRandomSymbolData();


                        s.texture = newData.texture;
                        s.symbolId = newData.id; // Update ID
                    }
                    if (this.symbolsRotated === this.config.symbolsBeforeStop + this.targetResult.length) {
                        this.state = "LANDING"
                    }
                    this.symbolsRotated++
                }
            });
        }
    }

    realignOnGrid() {
        // 1. Sort symbols from Top to Bottom (Lowest Y first)
        // This ensures symbols[0] is always the top-most symbol
        this.symbols.sort((a, b) => a.y - b.y);

        const h = this.config.symbolHeight;
        const slotHeight = this.slotHeight;

        // 2. Find the ideal grid position for the top-most symbol (symbols[0])
        const firstSymbol = this.symbols[0];
        const currentY = firstSymbol.y;

        // Calculate the nearest "snap" point for the first symbol
        const idealY = Math.round((currentY - h / 2) / slotHeight) * slotHeight + h / 2;

        // 3. Force ALL symbols to align relative to that ideal top position
        // This repairs any drift/gaps between symbols
        this.symbols.forEach((symbol, index) => {
            symbol.y = idealY + (index * slotHeight);
        });
    }

    // realignOnGrid() {
    //     const h = this.config.symbolHeight;
    //     // Find the offset of the first symbol from its ideal grid position
    //     const firstSymbol = this.symbols[0];
    //     const currentY = firstSymbol.y;
    //     const idealY = Math.round((currentY - h / 2) / this.slotHeight) * this.slotHeight + h / 2;
    //     const diff = idealY - currentY;

    //     // Shift all symbols by that tiny difference
    //     this.symbols.forEach(s => s.y += diff);
    // }

    getRandomTexture() {
        const randomTex = this.config.symbols[Math.floor(Math.random() * this.config.symbols.length)].texture;
        return randomTex;
    }

    explodeAndCascade(indexExplode, idsReplace, reelData) {
        indexExplode = indexExplode.sort((a, b) => a - b)
        console.log("replace these indexes: " + indexExplode + " with these values: " + idsReplace)
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
            }, 500);
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
                explodedSymbol.texture = this.getRandomTexture(); // Or specific if you prefer
                const topSymbol = this.symbols[this.symbols.length - 1];
                topSymbol.texture = newData.texture;
                topSymbol.symbolId = newData.id; // <--- CRITICAL: Update the ID!
                // --- FIX END ---

                const offset = this.slotHeight / 2 - this.slotHeight * (i + 2)
                explodedSymbol.y = offset
                explodedSymbol.yToMove = this.slotHeight * this.explodedSymbols.length
                //     explodedSymbol.texture = newData.texture;
                //     explodedSymbol.symbolId = newData.id; // IMPORTANT: Update the ID!
                //     this.symbols[this.symbols.length - 1].texture = this.config.symbols[idsReplace[i]].texture
                //     const offset = this.slotHeight / 2 - this.slotHeight * (i + 2)
                //     explodedSymbol.y = offset
                //     explodedSymbol.yToMove = this.slotHeight * this.explodedSymbols.length

            })
        })
    }

    // Helper
    sort() {
        this.symbols = this.symbols.sort((a, b) => a.y - b.y).reverse();
    }

    debugSquare(y) {
        const w = this.config.symbolWidth;
        const h = this.config.symbolHeight;
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

    // --- HELPER TO GET ID AND TEXTURE ---
    getRandomSymbolData() {
        const id = Math.floor(Math.random() * this.config.symbols.length);
        return {
            id: id,
            texture: this.config.symbols[id].texture
        };
    }

    // Helper to set specific symbol by ID
    getSymbolDataById(id) {
        return {
            id: id,
            texture: this.config.symbols[id].texture
        };
    }
}