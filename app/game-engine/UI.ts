import gsap from "gsap";
import { Assets, Sprite, ColorMatrixFilter, Container, Graphics, Text, Application, FederatedPointerEvent, Texture } from "pixi.js";
import SlotsBase from "./SlotsBase.ts";
import { GameConfig, SymbolDef } from "./types.ts"



export class UI {
    // 1. Declare class properties (Required in TS)
    public game: SlotsBase;
    public app: Application;
    public config: GameConfig;
    public stage: Container;

    public freespinContainer!: Container;
    public freespinSprite!: Sprite;
    public freespinText!: Text;
    public freespinContainerRestingY: number = 6;
    public freespinContainerOffsetY: number = 65;

    public title!: Sprite;
    public spinButton!: Sprite;

    public multiplierContainer!: Container;
    public globalMultiplier: number = 0;

    public isSpinning: boolean = false;
    private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;

    constructor(game: SlotsBase) {
        this.game = game;
        this.app = game.app;
        this.config = game.config;
        this.stage = game.stage; // Assuming stage is public in SlotsBase
    }

    init(): void {
        this.createTitle();
        this.createMultiplier();
        this.createSpinButton();
        this.createFreespins();
        this.enableKeyboard();

        let i = 0;
        this.config.symbols.forEach((s: SymbolDef) => {
            if (s.cheatWeight) {
                // We cast s.name because generic symbols might not strictly enforce unique names in types
                this.createSymbolCheat(s.name, s.cheatWeight, 20, 0 + (i * 30));
                i++;
            }
        });
    }

    enableKeyboard(): void {
        this._onKeyDown = (e: KeyboardEvent) => {
            if (e.code === "Space" && !e.repeat) {
                e.preventDefault();
                this.handleSpin();
            }
        };

        window.addEventListener("keydown", this._onKeyDown);
    }

    destroy(): void {
        if (this._onKeyDown) {
            window.removeEventListener("keydown", this._onKeyDown);
            this._onKeyDown = null;
        }
    }

    createFreespins(): void {
        this.freespinContainer = new Container();
        this.freespinContainer.visible = true;
        this.freespinContainerRestingY = 6;
        this.freespinContainerOffsetY = 65;

        const width = 200;
        this.freespinContainer.x = this.config.width - 50;
        this.freespinContainer.y = this.config.height - this.freespinContainerOffsetY;

        Assets.load('/games/ClashOfReels/free_spins_remaining.png').then((texture) => {
            this.freespinSprite = new Sprite(texture);
            const ratio = this.freespinSprite.height / this.freespinSprite.width;

            this.freespinSprite.width = width;
            this.freespinSprite.height = width * ratio;
            this.freespinSprite.anchor.set(1);

            this.freespinContainer.addChildAt(this.freespinSprite, 0);
        });

        this.freespinText = new Text({
            text: "5",
            style: {
                fontFamily: "cocFont",
                fontSize: 20,
                fill: "white",
                align: "right"
            }
        });

        this.freespinText.anchor.set(1);
        this.freespinText.x = -22;
        this.freespinText.y = -11;

        this.freespinContainer.addChildAt(this.freespinText, 0);

        this.stage.addChild(this.freespinContainer);
    }

    setFreespins(newVal: number): void {
        // 1. Determine where the container should go
        const targetY = newVal >= 0
            ? this.config.height - this.freespinContainerRestingY  // Visible Position
            : this.config.height - this.freespinContainerOffsetY;  // Hidden Position

        // 2. Animate the Container
        gsap.to(this.freespinContainer, {
            y: targetY,
            duration: 0.5,
            ease: "back.out(1.2)",
            overwrite: true
        });

        // 3. Update the text
        this.freespinText.text = newVal.toString();

        // 4. Pop animation
        if (newVal > 0) {
            gsap.fromTo(this.freespinText.scale,
                { x: 1.5, y: 1.5 },
                { x: 1, y: 1, duration: 0.3, ease: "elastic.out(1, 0.3)" }
            );
        }
    }

    createTitle(): void {
        if (!this.config.titleImage) return
        Assets.load('/games/ClashOfReels/title.png').then((texture) => {
            const centerX = this.config.width / 2;
            const posY = (this.config as any).isMobile ? 120 : 30; // Cast config if isMobile isn't on main interface

            const shadowOffset = 5;
            const shadowAlpha = 0.5;
            const scale = (this.config as any).isMobile ? .8 : .3;

            const shadow = new Sprite(texture);
            shadow.anchor.set(0.5);
            shadow.x = centerX + shadowOffset;
            shadow.y = posY + shadowOffset;

            // Pixi v7+ syntax for tint might vary (number or string), number is safest
            shadow.tint = 0x000000;
            shadow.alpha = shadowAlpha;
            this.stage.addChild(shadow);

            this.title = new Sprite(texture);
            this.title.anchor.set(0.5);
            this.title.x = centerX;
            this.title.y = posY;
            this.title.scale.set(scale);
            shadow.scale.set(scale);
            this.stage.addChild(this.title);
        });
    }

    createSpinButton(): void {
        Assets.load('/games/ClashOfReels/spin_button.png').then((texture) => {
            this.spinButton = new Sprite(texture);
            const width = 200;
            const xOffset = 50;
            const yOffset = 65;
            this.spinButton.anchor.set(1);

            const ratio = this.spinButton.height / this.spinButton.width;
            this.spinButton.width = width;
            this.spinButton.height = width * ratio;

            this.spinButton.x = this.config.width - xOffset;
            this.spinButton.y = this.config.height - yOffset;

            this.spinButton.eventMode = "static";
            this.spinButton.cursor = "pointer";

            this.stage.addChild(this.spinButton);

            this.spinButton.on("pointertap", () => this.handleSpin());
        });
    }

    createMultiplier(): void {
        this.multiplierContainer = new Container();
        this.multiplierContainer.visible = false;

        const isMobile = (this.config as any).isMobile;

        this.multiplierContainer.x = isMobile ? this.config.width / 2 : 1100;
        this.multiplierContainer.y = isMobile ? (this.config.height / 2 - this.config.rows * this.config.symbolHeight / 2 - 50) : 100;

        this.stage.addChild(this.multiplierContainer);
    }

    setMultiplier(newVal: number): void {
        this.globalMultiplier = newVal;
        if (!this.multiplierContainer) return;

        if (newVal === 0) {
            this.multiplierContainer.visible = false;
            return;
        }

        this.multiplierContainer.visible = true;
        this.multiplierContainer.removeChildren();

        const formattedVal = Number(newVal).toFixed(2);
        const textString = `x${formattedVal}`;

        let currentX = 0;
        const targetHeight = 50;
        const spacing = -7;

        for (let i = 0; i < textString.length; i++) {
            const char = textString[i];
            let textureAlias: string | null = null;

            if (char === '.') textureAlias = 'num_dot';
            else if (char === 'x') textureAlias = 'num_x';
            else if (!isNaN(Number(char))) textureAlias = `num_${char}`;

            if (textureAlias && Assets.get(textureAlias)) {
                const texture = Assets.get(textureAlias) as Texture;
                const sprite = new Sprite(texture);

                const scale = targetHeight / texture.height;
                sprite.scale.set(scale);

                sprite.x = currentX;
                sprite.anchor.set(0, 1);

                this.multiplierContainer.addChild(sprite);

                currentX += (sprite.width + spacing);
            }
        }

        this.multiplierContainer.pivot.set(this.multiplierContainer.width / 2, -targetHeight / 2);

        gsap.fromTo(this.multiplierContainer.scale,
            { x: 1.5, y: 1.5 },
            { x: 1, y: 1, duration: 0.5, ease: "elastic.out(1, 0.3)" }
        );
    }

    playBonusTransition(textString: string): Promise<void> {
        return new Promise((resolve) => {
            const overlay = new Container();
            overlay.alpha = 0;
            this.stage.addChild(overlay);

            const bg = new Graphics();
            bg.rect(0, 0, this.config.width, this.config.height).fill({ color: 0x000000, alpha: 0.7 });
            overlay.addChild(bg);

            const text = new Text({
                text: textString,
                style: {
                    fontFamily: "cocFont",
                    fontSize: 120,
                    fontWeight: "bold",
                    fill: "#FFD700",
                    stroke: { color: "#4a3c31", width: 8 },
                    dropShadow: true,
                    align: "center"
                }
            });
            text.anchor.set(0.5);
            text.x = this.config.width / 2;
            text.y = this.config.height / 2;
            text.scale.set(0);
            overlay.addChild(text);

            const tl = gsap.timeline({
                onComplete: () => {
                    overlay.destroy({ children: true });
                    resolve();
                }
            });

            tl.to(overlay, { alpha: 1, duration: 0.3 });
            tl.to(text.scale, { x: 1, y: 1, duration: 0.8, ease: "elastic.out(1, 0.3)" }, "-=0.1");
            tl.to(text.scale, { x: 1.1, y: 1.1, duration: 0.1, yoyo: true, repeat: 3 });
            tl.to(text, { duration: 0.5 });
            tl.to(text.scale, { x: 3, y: 3, duration: 0.3, ease: "power2.in" }, "exit");
            tl.to(overlay, { alpha: 0, duration: 0.3 }, "exit");
        });
    }

    async handleSpin(): Promise<void> {
        if (this.isSpinning) return;
        if (!this.spinButton) return;

        this.isSpinning = true;

        const grayFilter = new ColorMatrixFilter();
        this.spinButton.filters = [grayFilter];
        grayFilter.resolution = this.app.renderer.resolution;

        const state = { amount: 0 };

        this.spinButton.cursor = "not-allowed";

        await gsap.to(state, {
            amount: -1,
            duration: 0.3,
            ease: "power2.out",
            onUpdate: () => grayFilter.saturate(state.amount, false)
        });

        await this.game.spin();

        await gsap.to(state, {
            amount: 0,
            duration: 0.3,
            ease: "power2.inOut",
            onUpdate: () => grayFilter.saturate(state.amount, false),
            onComplete: () => {
                if (this.spinButton) {
                    this.spinButton.filters = [];
                    this.spinButton.cursor = "pointer";
                }
                grayFilter.destroy();
            }
        });

        this.isSpinning = false;
    }

    /**
     * Creates a debug toggle for a symbol with persistent storage.
     */
    createSymbolCheat(inputName: string, cheatWeight: number | number[], x: number, y: number): void {
        const symbol = this.config.symbols.find(s => s.name === inputName) as SymbolDef | undefined;

        if (!symbol) {
            console.warn(`[UI] Cheat Error: Symbol '${inputName}' not found.`);
            return;
        }

        if (symbol._originalWeight === undefined) {
            symbol._originalWeight = symbol.weight;
        }

        const storageKey = `cheat_active_${inputName}`;
        const savedState = localStorage.getItem(storageKey);
        let isToggled = savedState === "true";

        if (isToggled) {
            symbol.weight = cheatWeight || 99999;
            symbol.baseWeight = cheatWeight || 99999;
            console.log(`[CHEAT] Restored persistent cheat for ${inputName}`);
        }

        const container = new Container();
        container.x = x;
        container.y = y;
        container.zIndex = 999;

        const checkbox = new Graphics();
        container.addChild(checkbox);

        const label = new Text({
            text: inputName.toUpperCase(),
            style: {
                fontFamily: "Arial",
                fontSize: 14,
                fill: "white",
                fontWeight: "bold",
                stroke: { color: "black", width: 3 },
            }
        });
        label.x = 25;
        label.y = 2;
        container.addChild(label);

        const draw = () => {
            checkbox.clear();
            checkbox.rect(0, 0, 20, 20);

            if (isToggled) {
                // Active: Green
                checkbox.fill({ color: 0x00FF00 });
                checkbox.stroke({ width: 2, color: 0xFFFFFF });
            } else {
                // Inactive: Dark
                checkbox.fill({ color: 0x333333 });
                checkbox.stroke({ width: 1, color: 0x999999 });
            }
        };
        draw();

        container.eventMode = "static";
        container.cursor = "pointer";

        container.on("pointertap", () => {
            isToggled = !isToggled;

            if (isToggled) {
                symbol.weight = cheatWeight || 99999;
                symbol.baseWeight = cheatWeight || 99999;
                console.log(`[CHEAT] ${inputName} weight set to:`, cheatWeight);
            } else {
                symbol.weight = symbol._originalWeight!;
                symbol.baseWeight = symbol._originalWeight!;
                console.log(`[CHEAT] ${inputName} reverted to:`, symbol._originalWeight);
            }

            localStorage.setItem(storageKey, isToggled.toString());
            draw();
        });

        this.stage.addChild(container);
    }
}