import * as PIXI from 'pixi.js';

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
        this.initSymbols();
        this.symbolsRotated = 0
        this.targetsShown = 0
        this.symbolsBeforeStop = this.config.symbolsBeforeStop


        this.explodedSymbols = []

        this.cascadeResolve = null;
        this.ghostContainer = new PIXI.Container();
        this.container.addChild(this.ghostContainer)
    }

    initSymbols() {
        const bufferCount = 2;
        const totalSymbols = this.config.rows + bufferCount;

        this.slotHeight = this.config.symbolHeight + (this.config.gapY || 0);

        for (let i = 0; i < totalSymbols; i++) {
            const randomData = this.getRandomSymbolData();
            const symbol = new PIXI.Sprite(randomData.texture);

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
        this.ghostContainer.removeChildren();
    }

    update(delta) {

        for (let i = this.ghostContainer.children.length - 1; i >= 0; i--) {
            const ghost = this.ghostContainer.children[i];

            ghost.age += delta;
            const progress = ghost.age / ghost.duration;
            if (progress >= 1) {
                this.ghostContainer.removeChild(ghost); // Remove from memory
                continue;
            }
            const explosionFactor = 1 + (progress * 1);

            // Multiply the base scale by the explosion factor
            ghost.scale.set(ghost.startScale * explosionFactor);
            // ghost.scale.set(targetScale); // <--- CORRECT SYNTAX

            // Alpha: fade from 1.0 to 0.0
            ghost.alpha = 1 - progress
        }
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
        else if (this.state === "CASCADINGG") {

            this.symbols.forEach((symbol, i) => {
                symbol.y += symbol.yToMove * delta
            })
            if (!this.symbols.some(symbol => Math.abs(symbol.y - symbol.yToMove) > 4)) {
                this.state = "IDLE"
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
                        s.texture = newData.texture;
                        s.symbolId = newData.id;
                    }
                    else {
                        newData = this.getRandomSymbolData();
                        s.texture = newData.texture;
                        s.symbolId = newData.id;
                    }
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
                explodedSymbol.texture = this.getRandomTexture();
                const topSymbol = this.symbols[this.symbols.length - 1];
                topSymbol.texture = newData.texture;
                topSymbol.symbolId = newData.id;
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

    getRandomSymbolData() {
        // const id = Math.floor(Math.random() * this.config.symbols.length);
        const id = this.game.getRandomSymbolId()
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
        ghost.alpha = 1;
        ghost.startScale = ghost.scale.x;
        // ghost.scale.set(1);
        ghost.age = 0;
        ghost.duration = this.config.ghostTime / 16.66


        this.ghostContainer.addChild(ghost);
    }
}