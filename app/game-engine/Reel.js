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

        this.removedSymbols = []
    }

    initSymbols() {
        const bufferCount = 2;
        const totalSymbols = this.config.rows + bufferCount;

        this.slotHeight = this.config.symbolHeight + (this.config.gapY || 0);

        for (let i = 0; i < totalSymbols; i++) {
            const symbol = new PIXI.Sprite(this.getRandomTexture())// new PIXI.Sprite(this.config.symbols[0].texture); // Default texture

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
                    if (this.symbolsRotated >= this.config.symbolsBeforeStop) {
                        const newSymbol = (this.targetsShown === this.config.rows ? this.getRandomTexture() : this.config.symbols[this.targetResult[this.targetsShown]].texture)

                        this.targetsShown++
                        s.texture = newSymbol
                    }
                    else {
                        s.texture = this.getRandomTexture();
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
        const h = this.config.symbolHeight;
        // Find the offset of the first symbol from its ideal grid position
        const firstSymbol = this.symbols[0];
        const currentY = firstSymbol.y;
        const idealY = Math.round((currentY - h / 2) / this.slotHeight) * this.slotHeight + h / 2;
        const diff = idealY - currentY;

        // Shift all symbols by that tiny difference
        this.symbols.forEach(s => s.y += diff);
    }

    getRandomTexture() {
        const randomTex = this.config.symbols[Math.floor(Math.random() * this.config.symbols.length)].texture;
        return randomTex;
    }
}