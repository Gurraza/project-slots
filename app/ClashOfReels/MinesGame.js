import { Container, Graphics, Text, Sprite, Assets } from "pixi.js";
import gsap from "gsap";

const DEFAULT_CONFIG = {
    cols: 5,
    rows: 5,
    // Configuration for the single large background
    backgroundImage: { texture: null, scale: 1 },

    // Texture states for the individual tiles
    textureHidden: { texture: null, scale: 1 },
    textureBomb: { texture: null, scale: 1 },
    textureGem: { texture: null, scale: 1 },

    size: 90,
    gapX: 0,
    gapY: 0,
    bombsCount: 3
}

export class MinesGame {

    constructor(parentContainer, app, config = {}) {
        this.app = app;
        this.parent = parentContainer;
        this.config = { ...DEFAULT_CONFIG, ...config };

        this.currentMultiplier = 1.0;
        this.bet = 0;
        this.isGameOver = false;
        this.safeClicksLimit = 0;
        this.currentClicks = 0;

        this.container = new Container();
        this.container.visible = false;
        this.parent.addChild(this.container);
        this.currentMultiplier = 1.0;
        this.tiles = [];
    }

    async play(betAmount, safeClicks) {
        console.log("safe clicks", safeClicks)
        this.bet = betAmount;
        this.safeClicksLimit = safeClicks;

        this.currentMultiplier = 1.0;
        this.isGameOver = false;
        this.currentClicks = 0;

        this.buildLevel();
        this.container.alpha = 0;
        this.container.visible = true;

        await gsap.to(this.container, { alpha: 1, duration: 0.5 });

        return new Promise((resolve) => {
            this.onGameEnd = (finalAmount) => {
                gsap.to(this.container, {
                    alpha: 0,
                    duration: 0.5,
                    onComplete: () => {
                        this.cleanup();
                        resolve(finalAmount);
                    }
                });
            };
        });
    }

    buildLevel() {
        this.container.removeChildren();
        this.tiles = [];

        // 1. Dark Overlay (Dim the slots behind)
        const bg = new Graphics();
        bg.rect(0, 0, 1280, 720).fill({ color: 0x000000, alpha: 0.9 });
        bg.interactive = true;
        this.container.addChild(bg);

        // 2. [NEW] Large Background Image
        if (this.config.backgroundImage && this.config.backgroundImage.texture) {
            const bgConfig = this.config.backgroundImage;
            const tex = Assets.get(bgConfig.texture);
            const largeBg = new Sprite(tex);

            // Center it on the screen
            largeBg.anchor.set(0.5);
            largeBg.x = 1280 / 2;
            largeBg.y = 720 / 2;
            largeBg.width = (this.config.cols + 1) * this.config.size * 1
            largeBg.height = (this.config.rows + 1) * this.config.size * 1
            // largeBg.scale.set(bgConfig.scale);

            this.container.addChild(largeBg);
        }

        // 3. Info Text
        this.infoText = new Text({
            text: "Multiplier: 1.0x",
            style: { fontFamily: 'cocFont', fontSize: 30, fill: '#FFD700' }
        });
        this.infoText.anchor.set(0.5);
        this.infoText.x = 640;
        this.infoText.y = 50;
        this.container.addChild(this.infoText);


        this.nextMultiText = new Text({
            text: "(next: 1.25x)",
            style: { fontFamily: 'cocFont', fontSize: 20, fill: '#FFD700' }
        });
        this.nextMultiText.anchor.set(0, 0.5); // Anchor left
        this.nextMultiText.x = 800; // To the right of the main text
        this.nextMultiText.y = 52; // Align vertically
        this.container.addChild(this.nextMultiText);

        // 4. Grid Generation
        const startX = 420;
        const startY = 140;

        for (let row = 0; row < this.config.rows; row++) {
            for (let col = 0; col < this.config.cols; col++) {

                const tile = this.createTile(this.config.size);

                tile.x = startX + col * (this.config.size + this.config.gapX);
                tile.y = startY + row * (this.config.size + this.config.gapY);

                tile.eventMode = 'static';
                tile.cursor = 'pointer';
                tile.on('pointerdown', () => this.handleTileClick(tile));

                this.container.addChild(tile);
                this.tiles.push(tile);
            }
        }

        // 5. Cash Out Button
        this.cashOutBtn = this.createButton("CASH OUT", 0x00FF00);
        this.cashOutBtn.x = 950;
        this.cashOutBtn.y = 350;
        this.cashOutBtn.visible = false;
        this.cashOutBtn.on('pointerdown', () => this.handleCashOut());
        this.container.addChild(this.cashOutBtn);
    }

    updateText() {
        this.infoText.text = `Multiplier: ${this.currentMultiplier.toFixed(2)}x`;
        this.nextMultiText.text = `(next: : ${this.calculateNextMultiplier().toFixed(2)}x`;
    }

    createTile(size) {
        const tileContainer = new Container();
        tileContainer.isRevealed = false;

        // NOTE: We removed the individual background sprite here.
        // If you want a placeholder box behind the grass so it's not transparent 
        // if the grass has alpha, you can uncomment the Graphics lines below.

        // const placeholder = new Graphics();
        // placeholder.rect(0,0, size, size).fill({ color: 0x000000, alpha: 0.01 }); // Almost invisible hit area
        // tileContainer.addChild(placeholder);

        // Create the Top Icon Sprite (Hidden / Bomb / Gem)
        const config = this.config.textureHidden;
        const texture = Assets.get(config.texture);
        const icon = new Sprite(texture);

        icon.anchor.set(0.5);
        icon.x = size / 2;
        icon.y = size / 2;
        icon.scale.set(config.scale);

        tileContainer.iconSprite = icon;
        tileContainer.addChild(icon);

        return tileContainer;
    }

    handleTileClick(tile) {
        if (this.isGameOver || tile.isRevealed) return;
        const nextMult = this.calculateNextMultiplier();
        this.currentClicks++;
        tile.isRevealed = true;

        if (this.currentClicks > this.safeClicksLimit) {
            // --- LOSE / BOMB ---
            this.updateTileTexture(tile, this.config.textureBomb);
            this.handleLoss();
        } else {
            // --- WIN / GEM ---
            this.updateTileTexture(tile, this.config.textureGem);
            this.currentMultiplier = nextMult;
            this.updateText()
            this.cashOutBtn.visible = true;
        }
    }

    updateTileTexture(tileContainer, configData) {
        const icon = tileContainer.iconSprite;
        icon.texture = Assets.get(configData.texture);
        icon.scale.set(configData.scale);
    }

    // ... rest of methods (handleCashOut, handleLoss, createButton, cleanup) ...
    handleCashOut() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.updateText()
        this.infoText.style.fill = "#00FF00";
        setTimeout(() => this.onGameEnd(this.currentMultiplier), 1000);
    }

    handleLoss() {
        this.isGameOver = true;
        console.log("BOOM! Limit Reached.");
        this.infoText.text = "BOOM! GAME OVER";
        this.nextMultiText.text = ""
        this.infoText.style.fill = "#FF0000";
        this.cashOutBtn.visible = false;
        setTimeout(() => {
            this.onGameEnd(1);
        }, 1500);
    }

    createButton(text, color) {
        const cnt = new Container();
        const g = new Graphics().roundRect(0, 0, 200, 80, 20).fill(color);
        const t = new Text({ text, style: { fontSize: 30, fill: "black", fontWeight: 'bold' } });
        t.anchor.set(0.5);
        t.x = 100; t.y = 40;
        cnt.addChild(g, t);
        cnt.eventMode = 'static';
        cnt.cursor = 'pointer';
        return cnt;
    }

    cleanup() {
        this.container.removeChildren();
        this.container.visible = false;
    }

    // --- NEW MATH HELPER ---
    calculateNextMultiplier() {
        const bombs = this.config.bombsCount;
        const total = this.tiles.length;
        const clicks = this.currentClicks;

        // How many tiles are left to pick from? (e.g. 25 - 0 = 25)
        const remainingTiles = total - clicks;

        // How many of those are safe? (e.g. 25 - 5 - 0 = 20)
        const remainingSafe = (total - bombs) - clicks;

        // Safety check
        if (remainingSafe <= 0) return this.currentMultiplier;

        // Probability of picking a safe tile: e.g. 20 / 25 = 0.8 (80%)
        const probability = remainingSafe / remainingTiles;

        // The Fair Multiplier increases by the inverse of the probability
        // e.g. 1.0 * (1 / 0.8) = 1.25x
        const nextMultiplier = this.currentMultiplier * (1 / probability);

        // Apply House Edge (RTP) if desired, otherwise strictly fair
        // We usually apply RTP only to the base multiplier or at the end, 
        // but applying it iteratively creates a deeper curve.
        // For standard "Fair" games, usually keep it raw here and tax the cashout.
        return nextMultiplier;
    }
}