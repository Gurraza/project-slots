import gsap from "gsap"
import { Assets, Sprite, ColorMatrixFilter, Container, Graphics, Text } from "pixi.js"

export class UI {
    constructor(game) {
        this.game = game
        this.app = game.app
        this.config = game.config
        this.stage = game.stage
    }

    init() {
        this.createTitle()
        this.createMultiplier()
        this.createSpinButton()
        this.createFreespins()
    }

    createFreespins() {
        this.freespinContainer = new Container();
        this.freespinContainer.visible = true;
        this.freespinContainerRestingY = 6
        this.freespinContainerOffsetY = 65
        const width = 200
        this.freespinContainer.x = this.config.width - 50
        this.freespinContainer.y = this.config.height - this.freespinContainerOffsetY
        // this.freespinContainer.anchor.set(1);

        Assets.load('/games/ClashOfReels/free_spins_remaining.png').then((texture) => {
            this.freespinSprite = new Sprite(texture)
            const ratio = this.freespinSprite.height / this.freespinSprite.width;

            this.freespinSprite.width = width
            this.freespinSprite.height = width * ratio
            this.freespinSprite.anchor.set(1)

            this.freespinContainer.addChildAt(this.freespinSprite, 0)
        })


        this.freespinText = new Text({
            text: "5",
            style: {
                fontFamily: "cocFont",
                fontSize: 20,
                fill: "white",
                align: "right"
            },
            anchor: 1,
        });

        this.freespinText.x = -22
        this.freespinText.y = -11

        this.freespinContainer.addChildAt(this.freespinText, 0)



        // Size (optional)
        this.stage.addChild(this.freespinContainer);
    }
    setFreespins(newVal) {
        // 1. Determine where the container should go
        const targetY = newVal >= 0
            ? this.config.height - this.freespinContainerRestingY  // Visible Position
            : this.config.height - this.freespinContainerOffsetY;  // Hidden Position

        // 2. Animate the Container (Slide In / Slide Out)
        gsap.to(this.freespinContainer, {
            y: targetY,
            duration: 0.5,
            ease: "back.out(1.2)", // Gives it a slight bounce when stopping
            overwrite: true        // Ensures we kill any previous animation if spamming clicks
        });

        // 3. Update the text
        this.freespinText.text = newVal;

        // 4. (Optional) "Pop" the text when the number updates (if visible)
        if (newVal > 0) {
            gsap.fromTo(this.freespinText.scale,
                { x: 1.5, y: 1.5 },
                { x: 1, y: 1, duration: 0.3, ease: "elastic.out(1, 0.3)" }
            );
        }
    }
    ssetFreespins(newVal) {
        if (newVal > 0) {
            this.freespinContainer.y = this.config.height - this.freespinContainerRestingY
            this.freespinText.text = newVal
        }
        else {
            this.freespinContainer.y = this.config.height - this.freespinContainerOffsetY
            this.freespinText.text = newVal
        }
    }

    createTitle() {
        Assets.load('/games/ClashOfReels/title.png').then((texture) => {
            const centerX = this.config.width / 2;
            const posY = this.config.isMobile ? 120 : 30;
            // Shadow Settings
            const shadowOffset = 5; // How far the shadow moves (px)
            const shadowAlpha = 0.5; // How dark the shadow is (0 to 1)
            const scale = this.config.isMobile ? .8 : .3
            // A. Create the Shadow Sprite FIRST (so it's behind)
            // We reuse the same texture so it has the exact same shape.
            const shadow = new Sprite(texture);
            shadow.anchor.set(0.5);
            // Offset position slightly to the bottom-right
            shadow.x = centerX + shadowOffset;
            shadow.y = posY + shadowOffset;
            // Make it look like a shadow
            shadow.tint = 0x000000; // Turn the whole image black
            shadow.alpha = shadowAlpha; // Make it semi-transparent
            this.stage.addChild(shadow);

            this.title = new Sprite(texture);
            this.title.anchor.set(0.5);
            this.title.x = centerX;
            this.title.y = posY;
            this.title.scale = scale
            shadow.scale = scale
            this.stage.addChild(this.title);
        });
    }

    createSpinButton() {
        Assets.load('/games/ClashOfReels/spin_button.png').then((texture) => {
            this.spinButton = new Sprite(texture);
            const width = 200
            const xOffset = 50
            const yOffset = 65
            this.spinButton.anchor.set(1);

            // Size (optional)
            const ratio = this.spinButton.height / this.spinButton.width;
            this.spinButton.width = width
            this.spinButton.height = width * ratio

            // Position — bottom-right
            this.spinButton.x = this.config.width - xOffset;
            this.spinButton.y = this.config.height - yOffset;

            // Allow clicking / hovering
            this.spinButton.eventMode = "static";
            this.spinButton.cursor = "pointer";

            this.stage.addChild(this.spinButton);

            this.spinButton.on("pointertap", async () => {
                const grayFilter = new ColorMatrixFilter()
                this.spinButton.filters = [grayFilter];
                grayFilter.resolution = this.app.renderer.resolution

                // This is the value GSAP will animate
                const state = { amount: 0 };

                // fade to grayscale
                await gsap.to(state, {
                    amount: -1,
                    duration: 0.3,
                    ease: "power2.out",
                    onUpdate: () => {
                        grayFilter.saturate(state.amount, false);
                    }
                });
                this.spinButton.cursor = "not-allowed";
                this.app.canvas.style.cursor = "not-allowed";
                await this.game.spin();
                this.app.canvas.style.cursor = "pointer";
                this.spinButton.cursor = "pointer";

                // fade back to color
                await gsap.to(state, {
                    amount: 0,
                    duration: 0.3,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        grayFilter.saturate(state.amount, false);
                    },
                    onComplete: () => {
                        this.spinButton.filters = [];
                        grayFilter.destroy();
                    }
                });
            });

        });
    }

    createMultiplier() {
        this.multiplierContainer = new Container();
        this.multiplierContainer.visible = false;

        this.multiplierContainer.x = this.config.isMobile ? this.config.width / 2 : 1100;
        this.multiplierContainer.y = this.config.isMobile ? (this.config.height / 2 - this.config.rows * this.config.symbolHeight / 2 - 50) : 100;

        this.stage.addChild(this.multiplierContainer);
    }

    setMultiplier(newVal) {
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

        // --- CONFIGURATION ---
        const targetHeight = 50; // px. Similar to fontSize. Adjust this if too big/small!
        const spacing = -7;      // px. Squeeze letters closer together.
        // ---------------------

        for (let i = 0; i < textString.length; i++) {
            const char = textString[i];
            let textureAlias = null;

            if (char === '.') textureAlias = 'num_dot';
            else if (char === 'x') textureAlias = 'num_x';
            else if (!isNaN(char)) textureAlias = `num_${char}`;

            if (textureAlias && Assets.get(textureAlias)) {
                const texture = Assets.get(textureAlias);
                const sprite = new Sprite(texture);

                // 1. Calculate Scale based on desired height
                // This ensures it fits regardless of how big the original PNG is
                const scale = targetHeight / texture.height;
                sprite.scale.set(scale);

                sprite.x = currentX;
                sprite.anchor.set(0, 1); // Anchor bottom-left to align baseline

                this.multiplierContainer.addChild(sprite);

                // 2. Advance X cursor based on the SCALED width
                currentX += (sprite.width + spacing);
            }
        }

        // 3. Re-center the container
        // We set the pivot to the center of the newly created text block
        this.multiplierContainer.pivot.set(this.multiplierContainer.width / 2, -targetHeight / 2);

        // 4. Pop Animation
        gsap.fromTo(this.multiplierContainer.scale,
            { x: 1.5, y: 1.5 },
            { x: 1, y: 1, duration: 0.5, ease: "elastic.out(1, 0.3)" }
        );
    }

    playBonusTransition(textString) {
        return new Promise((resolve) => {
            // 1. Create the Container (Dark Overlay + Text)
            const overlay = new Container();
            overlay.alpha = 0;
            this.stage.addChild(overlay);

            // Dark Background
            const bg = new Graphics();
            bg.rect(0, 0, this.config.width, this.config.height).fill({ color: 0x000000, alpha: 0.7 });
            overlay.addChild(bg);

            // "BONUS" Text
            // Inside playBonusTransition()

            const text = new Text({
                text: textString,
                style: {
                    fontFamily: "cocFont",
                    fontSize: 120,
                    fontWeight: "bold",
                    fill: "#FFD700",
                    stroke: { color: "#4a3c31", width: 8 },
                    dropShadow: true,
                    dropShadowColor: '#000000',
                    dropShadowBlur: 10,
                    dropShadowAngle: Math.PI / 6,
                    dropShadowDistance: 6,
                    align: "center"
                }
            });
            text.anchor.set(0.5);
            text.x = this.config.width / 2;
            text.y = this.config.height / 2;
            text.scale.set(0); // Start tiny
            overlay.addChild(text);

            // 2. Animate Sequence
            const tl = gsap.timeline({
                onComplete: () => {
                    // Cleanup and Resume
                    overlay.destroy({ children: true });
                    resolve();
                }
            });

            // Fade In Overlay
            tl.to(overlay, { alpha: 1, duration: 0.3 });

            // Pop Text In (Elastic bounce)
            tl.to(text.scale, { x: 1, y: 1, duration: 0.8, ease: "elastic.out(1, 0.3)" }, "-=0.1");

            // Pulse / Shake for excitement
            tl.to(text.scale, { x: 1.1, y: 1.1, duration: 0.1, yoyo: true, repeat: 3 });

            // Wait a moment for player to read it
            tl.to(text, { duration: 0.5 });

            // Zoom Out / Fade Away
            tl.to(text.scale, { x: 3, y: 3, duration: 0.3, ease: "power2.in" }, "exit");
            tl.to(overlay, { alpha: 0, duration: 0.3 }, "exit");
        });
    }

}