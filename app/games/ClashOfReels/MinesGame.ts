import { Container, Graphics, Text, Sprite, Assets, Application, Texture } from "pixi.js";
import gsap from "gsap";

// --- Types & Interfaces ---

interface TextureConfig {
    texture: string | null;
    scale: number;
}

export interface MinesGameConfig {
    cols: number;
    rows: number;
    backgroundImage: TextureConfig;
    textureHidden: TextureConfig;
    textureBomb: TextureConfig;
    textureGem: TextureConfig;
    size: number;
    gapX: number;
    gapY: number;
    bombsCount: number;
}

// Custom type for our interactive tiles
type TileContainer = Container & {
    isRevealed: boolean;
    iconSprite: Sprite;
};

const DEFAULT_CONFIG: MinesGameConfig = {
    cols: 5,
    rows: 5,
    backgroundImage: { texture: null, scale: 1 },
    textureHidden: { texture: null, scale: 1 },
    textureBomb: { texture: null, scale: 1 },
    textureGem: { texture: null, scale: 1 },
    size: 90,
    gapX: 0,
    gapY: 0,
    bombsCount: 3
};

export class MinesGame {
    private app: Application;
    private parent: Container;
    public config: MinesGameConfig;

    private currentMultiplier: number;
    private bet: number;
    private isGameOver: boolean;
    private safeClicksLimit: number;
    private currentClicks: number;

    private container: Container;
    private tiles: TileContainer[];

    // UI Elements
    private infoText!: Text;
    private nextMultiText!: Text;
    private cashOutBtn!: Container;

    // Callback
    private onGameEnd?: (finalAmount: number) => void;

    constructor(parentContainer: Container, app: Application, config: Partial<MinesGameConfig> = {}) {
        this.app = app;
        this.parent = parentContainer;
        this.config = { ...DEFAULT_CONFIG, ...config };

        this.currentMultiplier = 1.0;
        this.bet = 0;
        this.isGameOver = false;
        this.safeClicksLimit = 0;
        this.currentClicks = 0;
        this.tiles = [];

        this.container = new Container();
        this.container.visible = false;
        this.parent.addChild(this.container);
    }

    public async play(betAmount: number, safeClicks: number): Promise<number> {
        console.log("safe clicks", safeClicks);
        this.bet = betAmount;
        this.safeClicksLimit = safeClicks;

        this.currentMultiplier = 1.0;
        this.isGameOver = false;
        this.currentClicks = 0;

        this.buildLevel();
        this.container.alpha = 0;
        this.container.visible = true;

        await gsap.to(this.container, { alpha: 1, duration: 0.5 });

        return new Promise<number>((resolve) => {
            this.onGameEnd = (finalAmount: number) => {
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

    private buildLevel(): void {
        this.container.removeChildren();
        this.tiles = [];

        // 1. Dark Overlay (Dim the slots behind)
        const bg = new Graphics();
        bg.rect(0, 0, 1280, 720).fill({ color: 0x000000, alpha: 0.9 });
        bg.interactive = true;
        this.container.addChild(bg);

        // 2. Large Background Image
        if (this.config.backgroundImage && this.config.backgroundImage.texture) {
            const bgConfig = this.config.backgroundImage;
            const tex = Assets.get(bgConfig.texture!);
            const largeBg = new Sprite(tex);

            largeBg.anchor.set(0.5);
            largeBg.x = 1280 / 2;
            largeBg.y = 720 / 2;
            largeBg.width = (this.config.cols + 1) * this.config.size * 1;
            largeBg.height = (this.config.rows + 1) * this.config.size * 1;

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
        this.nextMultiText.anchor.set(0, 0.5);
        this.nextMultiText.x = 800;
        this.nextMultiText.y = 52;
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

    private updateText(): void {
        this.infoText.text = `Multiplier: ${this.currentMultiplier.toFixed(2)}x`;
        this.nextMultiText.text = `(next: : ${this.calculateNextMultiplier().toFixed(2)}x`;
    }

    private createTile(size: number): TileContainer {
        const tileContainer = new Container() as TileContainer;
        tileContainer.isRevealed = false;

        // Create the Top Icon Sprite (Hidden / Bomb / Gem)
        const config = this.config.textureHidden;
        // The ! operator asserts the texture exists, assuming Assets are preloaded
        const texture = Assets.get(config.texture!);
        const icon = new Sprite(texture);

        icon.anchor.set(0.5);
        icon.x = size / 2;
        icon.y = size / 2;
        icon.scale.set(config.scale);

        tileContainer.iconSprite = icon;
        tileContainer.addChild(icon);

        return tileContainer;
    }

    private handleTileClick(tile: TileContainer): void {
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
            this.updateText();
            this.cashOutBtn.visible = true;
        }
    }

    private updateTileTexture(tileContainer: TileContainer, configData: TextureConfig): void {
        const icon = tileContainer.iconSprite;
        icon.texture = Assets.get(configData.texture!);
        icon.scale.set(configData.scale);
    }

    private handleCashOut(): void {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.updateText();
        this.infoText.style.fill = "#00FF00";
        if (this.onGameEnd) {
            setTimeout(() => this.onGameEnd!(this.currentMultiplier), 1000);
        }
    }

    private handleLoss(): void {
        this.isGameOver = true;
        console.log("BOOM! Limit Reached.");
        this.infoText.text = "BOOM! GAME OVER";
        this.nextMultiText.text = "";
        this.infoText.style.fill = "#FF0000";
        this.cashOutBtn.visible = false;

        if (this.onGameEnd) {
            setTimeout(() => {
                this.onGameEnd!(1);
            }, 1500);
        }
    }

    private createButton(text: string, color: number): Container {
        const cnt = new Container();
        const g = new Graphics().roundRect(0, 0, 200, 80, 20).fill(color);
        const t = new Text({ text, style: { fontSize: 30, fill: "black", fontWeight: 'bold' } });
        t.anchor.set(0.5);
        t.x = 100;
        t.y = 40;
        cnt.addChild(g, t);
        cnt.eventMode = 'static';
        cnt.cursor = 'pointer';
        return cnt;
    }

    private cleanup(): void {
        this.container.removeChildren();
        this.container.visible = false;
    }

    private calculateNextMultiplier(): number {
        const bombs = this.config.bombsCount;
        const total = this.tiles.length;
        const clicks = this.currentClicks;

        const remainingTiles = total - clicks;
        const remainingSafe = (total - bombs) - clicks;

        if (remainingSafe <= 0) return this.currentMultiplier;

        const probability = remainingSafe / remainingTiles;
        const nextMultiplier = this.currentMultiplier * (1 / probability);

        return nextMultiplier;
    }
}