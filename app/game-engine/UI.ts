import gsap from "gsap";
import { Assets, Sprite, ColorMatrixFilter, Container, Graphics, Text, Application, FederatedPointerEvent, Texture } from "pixi.js";
import SlotsBase from "./SlotsBase.ts";
import { GameConfig, Position, SymbolDef, Transform, UIElementConfig } from "./types.ts"



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

    private betSymbol: Sprite;
    private betIncrementBtn: Sprite;
    private betDecrementBtn: Sprite;
    private betText: Text;

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
        this.createBetButton();

        let i = 0;
        this.config.symbols.forEach((s: SymbolDef) => {
            if (s.cheatWeight) {
                // We cast s.name because generic symbols might not strictly enforce unique names in types
                this.createSymbolCheat(s.name, s.cheatWeight, 20, 50 + (i * 30));
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

    createBetButton(): void {
        const conf = this.config.ui.bet
        if (!conf) {
            return
        }

        let pos = getPos(conf.betSymbol.position, this.config)
        pos = getPos(conf.betSymbol.position, this.config)
        this.betSymbol = new Sprite(Assets.get(conf.betSymbol.asset))
        this.betSymbol.position.set(pos.x, pos.y)
        this.betSymbol.scale = conf.betSymbol.scale

        pos = getPos(conf.incrementBtn.position, this.config)
        this.betIncrementBtn = new Sprite(Assets.get(conf.incrementBtn.asset))
        this.betIncrementBtn.position.set(pos.x, pos.y)
        this.betIncrementBtn.scale = conf.incrementBtn.scale

        this.betIncrementBtn.eventMode = "static";
        this.betIncrementBtn.cursor = "pointer";
        this.betIncrementBtn.on("pointertap", () => this.handlebetIncrement());

        pos = getPos(conf.decrementBtn.position, this.config)
        this.betDecrementBtn = new Sprite(Assets.get(conf.decrementBtn.asset))
        this.betDecrementBtn.position.set(pos.x, pos.y)
        this.betDecrementBtn.scale = conf.decrementBtn.scale

        this.betDecrementBtn.eventMode = "static";
        this.betDecrementBtn.cursor = "pointer";
        this.betDecrementBtn.on("pointertap", () => this.handlebetDecrement());

        pos = getPos(conf.textPos, this.config)
        this.betText = new Text({
            text: "1$",
            style: {
                ...conf.textStyle
            }
        })
        this.betText.position.set(pos.x, pos.y)
        this.stage.addChild(this.betSymbol)
        this.stage.addChild(this.betIncrementBtn)
        this.stage.addChild(this.betDecrementBtn)
        this.stage.addChild(this.betText)
    }

    createFreespins(): void {
        const conf = this.config.ui.freeSpins
        if (!conf) {
            return
        }
        this.freespinContainer = new Container();
        this.freespinContainer.visible = conf.visible || true
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
        const conf: UIElementConfig = this.config.ui.title
        if (!conf) {
            return
        }
        try {
            Assets.load(this.config.pathPrefix + conf.asset).then((texture) => {
                const { x, y } = getPos(conf.position, this.config)
                this.title = new Sprite(texture);
                this.title.anchor.set(0.5);
                this.title.position.set(x, y)
                this.title.scale.set(conf.scale);
                this.stage.addChild(this.title);
            });
        }
        catch (e) {
            Assets.load(conf.asset).then((texture) => {
                const { x, y } = getPos(conf.position, this.config)
                this.title = new Sprite(texture);
                this.title.anchor.set(0.5);
                this.title.position.set(x, y)
                this.title.scale.set(conf.scale);
                this.stage.addChild(this.title);
            });
        }
    }

    async createSpinButton(): Promise<void> {
        const conf: UIElementConfig = this.config.ui.spinButton
        if (!conf) {
            console.error("NO SPIN BUTTON")
            return
        }
        let texture = Assets.cache.has(conf.asset) ? Assets.get(conf.asset) : undefined
        if (!texture) {
            texture = await Assets.load(this.config.pathPrefix + conf.asset)
        }
        // Assets.load(this.config.pathPrefix + conf.asset).then((texture) => {
        const { x, y } = getPos(conf.position, this.config)
        this.spinButton = new Sprite(texture);
        this.spinButton.anchor.set(.5);

        const ratio = this.spinButton.height / this.spinButton.width;
        this.spinButton.width = 200 * conf.scale;
        this.spinButton.height = 200 * conf.scale * ratio;

        this.spinButton.position.set(x, y)

        this.spinButton.eventMode = "static";
        this.spinButton.cursor = "pointer";
        this.spinButton.on("pointertap", () => this.handleSpin());

        this.stage.addChild(this.spinButton);

        // });
    }
    // createSpinButton(): void {
    //     Assets.load('/games/ClashOfReels/spin_button.png').then((texture) => {
    //         this.spinButton = new Sprite(texture);
    //         const width = 200;
    //         const xOffset = 50;
    //         const yOffset = 65;
    //         this.spinButton.anchor.set(1);

    //         const ratio = this.spinButton.height / this.spinButton.width;
    //         this.spinButton.width = width;
    //         this.spinButton.height = width * ratio;

    //         this.spinButton.x = this.config.width - xOffset;
    //         this.spinButton.y = this.config.height - yOffset;

    //         this.spinButton.eventMode = "static";
    //         this.spinButton.cursor = "pointer";

    //         this.stage.addChild(this.spinButton);

    //         this.spinButton.on("pointertap", () => this.handleSpin());
    //     });
    // }

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

            if (textureAlias && Assets.cache.has(textureAlias)) {
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

    handlebetIncrement() {

    }

    handlebetDecrement() {

    }

    /**
     * Places a Pixi Container, Sprite, or Text onto the stage.
     * Can accept direct X/Y coordinates OR your GameConfig Position object.
     */
    place(element: Container, transform: Transform): void {
        const { x, y: calculatedY } = getPos(transform.position, this.config);
        element.position.set(x, calculatedY);

        if (transform.scale) {
            element.scale.set(transform.scale.x, transform.scale.y)
        }
        else if (transform.size) {
            element.setSize(transform.size.width, transform.size.height)
        }

        this.stage.addChild(element);
    }
}

export function getPos(position: Position, config: GameConfig) {
    let y: number = 0;
    let x: number = 0;
    if (position) {


        if (position.bottom) {
            y = config.height - position.bottom
        }
        else if (position.top) {
            y = position.top
        }
        if (position.left) {
            x = position.left
        }
        else if (position.right) {
            x = config.width - position.right
        }
    }
    return { x, y }
}