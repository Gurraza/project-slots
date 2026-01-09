import GameFeature from "../../game-engine/GameFeature"
import { contain, explode } from "../../game-engine/Math"
import gsap from "gsap"
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import * as PIXI from "pixi.js";
import { shake } from "../../game-engine/effects/Effects";
import { SymbolDef } from "../../game-engine/types";
gsap.registerPlugin(MotionPathPlugin);

const featureSymbol: SymbolDef = {
    name: "eagleartillery",
    scale: 5,
    path: "Star.png",
    weight: [5],
    cheatWeight: [999999],
    dontCluster: true,
    onlyAppearOnRoll: true,
    // explodeEffect: "ARTILLERY_STRIKE",
    // matchEffect: "ARTILLERY_STRIKE",
    payouts: { 1: 2 },
}

export class EagleArtilleryFeature extends GameFeature {
    private targetAmount: number
    constructor(game) {
        super(game, "EAGLE_ARTILLERY", featureSymbol)
        this.targetAmount = 5
        this.effects = [
            "ARTILLERY_STRIKE"
        ]
    }

    getAssets() {
        return [
            // { alias }
        ]
    }

    onGridPreProcess(grid, timeline) {
        const eaglePos = contain(this.id, grid);

        if (!eaglePos || eaglePos.length === 0) return false;
        const source = eaglePos[0];

        const wildId = this.config.symbols.find(s => s.name == "wild").id
        const validTargets = [];
        for (let c = 0; c < this.config.cols; c++) {
            for (let r = 0; r < this.config.rows; r++) {
                // Don't target self
                if (c === source.x && r === source.y) continue;

                const id = grid[c][r];
                const sym = this.game.config.symbols[id];

                if (sym.group === "low_troop" || sym.group === "low_resource") {
                    validTargets.push({ x: c, y: r, newId: wildId });
                }
            }
        }

        if (validTargets.length === 0) return false;

        // 3. Pick random targets (up to 5)
        const targets = [];
        const count = Math.min(5, validTargets.length);

        // Shuffle and slice
        for (let i = validTargets.length - 1; i > 0; i--) {
            const j = Math.floor(this.engine.random() * (i + 1));
            [validTargets[i], validTargets[j]] = [validTargets[j], validTargets[i]];
        }
        targets.push(...validTargets.slice(0, count));

        targets.forEach(t => {
            grid[t.x][t.y] = wildId;
        });

        timeline.push({
            type: this.type,
            changes: targets,
            source: eaglePos[0],
            grid: JSON.parse(JSON.stringify(grid))
        });
        const clustersToProcess = Array.from({ length: this.config.cols }, () => []);
        clustersToProcess[source.x].push(source.y);
        explode(this.engine, grid, clustersToProcess, timeline, featureSymbol.payouts[1], this.config.symbols)
        return true
    }

    async onCustomEvent(event) {
        console.log(event)
        this.game.reels[event.source.x].sortReverse()
        const explosionPromises = []
        event.changes.forEach(target => {
            const targetSymbol = this.game.reels[target.x].symbols[this.config.rows - target.y]
            const artillery = contain(featureSymbol.id, this.game.grid)[0]
            const eagleSymbol = this.game.reels[artillery.x].symbols[this.config.rows - artillery.y]
            explosionPromises.push(this.playOwnEffect("ARTILLERY_STRIKE", targetSymbol, eagleSymbol))
        })
        await Promise.all(explosionPromises)
        const promises = [];
        event.changes.forEach(change => {
            promises.push(this.game.insertIntoGrid({ x: change.x, y: change.y }, change.newId));
        });
        await Promise.all(promises);
    }

    async playOwnEffect(effect, targetSprite, sourceSprite, delay = .5): Promise<void> {
        if (effect === "ARTILLERY_STRIKE") {
            return new Promise((resolve) => {
                const startPos = this.stage.toLocal(sourceSprite.getGlobalPosition());
                const endPos = this.stage.toLocal(targetSprite.getGlobalPosition());

                // --- 1. VISUAL UPGRADE: The Magma Shell ---
                // Instead of ghosting the building, we use our magma texture
                const projectile = new PIXI.Sprite(this.createMagmaTexture());
                projectile.anchor.set(0.5);
                projectile.scale.set(0.0); // Start at 0 size
                projectile.position.copyFrom(startPos);
                projectile.visible = false;

                // --- 2. VISUAL UPGRADE: The Glow ---
                // If you have pixi-filters, uncomment the next line for a "Hot" look
                // import { GlowFilter } from 'pixi-filters';
                // projectile.filters = [new GlowFilter({ distance: 15, outerStrength: 2, color: 0xff4500 })];

                // Shadow and Marker setup (Keep existing logic)
                const shadow = new PIXI.Graphics();
                shadow.beginFill(0x000000, 0.4);
                shadow.drawEllipse(0, 0, 20, 10);
                shadow.endFill();
                shadow.position.copyFrom(startPos);
                shadow.visible = false;

                // Add to stage (Shadow first, then projectile)
                this.stage.addChild(shadow);
                this.stage.addChild(projectile);

                const midX = (startPos.x + endPos.x) / 2;
                const midY = (startPos.y + endPos.y) / 2;
                const arcHeight = 600; // Higher arc for more "Lob" feel

                const path = [
                    { x: startPos.x, y: startPos.y },
                    { x: midX, y: midY - arcHeight },
                    { x: endPos.x, y: endPos.y }
                ];

                const tl = gsap.timeline({
                    delay: delay,
                    onStart: () => {
                        projectile.visible = true;
                        shadow.visible = true;
                    },
                    onComplete: () => {
                        projectile.destroy();
                        shadow.destroy();
                        resolve();
                    }
                });

                // --- 3. ANIMATION: The "Heavy Shell" Physics ---

                // Motion Path with AutoRotate
                // In CoC, the shell nose follows the path.
                tl.to(projectile, {
                    duration: 1.2,
                    ease: "power1.in",
                    motionPath: {
                        path: path,
                        curviness: 1.5,
                        autoRotate: true,
                        // If your texture is pointing UP by default, add rotationOffset: 90
                        // Our circle texture has no direction, so autoRotate doesn't change visuals
                        // UNLESS we stretch it (see Step 4)
                    },
                    onUpdate: () => {
                        // --- 4. VISUAL UPGRADE: The Smoke Trail ---
                        // Spawns frequently to create a continuous line
                        if (Math.random() > 0.2) {
                            const smoke = new PIXI.Graphics();
                            smoke.beginFill(0x555555, 0.5);
                            smoke.drawCircle(0, 0, (Math.random() * 10) + 5);
                            smoke.endFill();
                            smoke.position.copyFrom(projectile.position);

                            // Add some randomness to trail position
                            smoke.x += (Math.random() * 10) - 5;
                            smoke.y += (Math.random() * 10) - 5;

                            this.stage.addChildAt(smoke, this.stage.getChildIndex(projectile)); // Behind projectile

                            gsap.to(smoke, {
                                alpha: 0,
                                scale: 0.1,
                                duration: 0.6,
                                onComplete: () => smoke.destroy()
                            });
                        }
                    }
                }, 0);

                // Z-Depth Scaling
                tl.to(projectile.scale, { x: 0.6, y: 0.6, duration: 0.6, ease: "power1.out" }, 0)
                    .to(projectile.scale, { x: 1.2, y: 1.2, duration: 0.6, ease: "power1.in" }, 0.6);

                // --- 5. VISUAL UPGRADE: Fake Speed Stretch ---
                // As it comes down (fast), stretch the Y scale to simulate motion blur
                tl.to(projectile.scale, {
                    x: 0.8, // Thinner width
                    y: 1.6, // Longer length (Fake motion blur)
                    duration: 0.3,
                    ease: "power2.in"
                }, 0.9); // Only happen at the very end of the flight

                // Shadow Logic
                tl.to(shadow, { x: endPos.x, y: endPos.y, duration: 1.2, ease: "linear" }, 0);
                tl.to(shadow, { alpha: 0.2, scale: 0.5, duration: 0.6 }, 0)
                    .to(shadow, { alpha: 0.8, scale: 1.0, duration: 0.6 }, 0.6);

                // Impact Shake
                tl.add(() => {
                    shake(this.stage, 15, 0.4)
                });
            });
        }
    }

    createMagmaTexture() {
        // Creates a procedural glowing rock texture
        const gr = new PIXI.Graphics();

        // 1. The rocky core (Dark Orange/Brown)
        gr.beginFill(0x8B4513);
        gr.drawCircle(0, 0, 30);
        gr.endFill();

        // 2. The Magma Cracks (Bright Orange)
        gr.beginFill(0xFF4500);
        gr.drawStar(0, 0, 5, 25, 10); // Star shape mimics cracks
        gr.endFill();

        // 3. The White Hot Center (Heat)
        gr.beginFill(0xFFDD00);
        gr.drawCircle(0, 0, 10);
        gr.endFill();

        // Baked-in blur for the texture itself to blend the colors
        const texture = this.app.renderer.generateTexture(gr);

        // Clean up graphics to free memory
        gr.destroy();

        return texture;
    }
}