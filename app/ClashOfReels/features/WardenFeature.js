import GameFeature from "../../game-engine/GameFeature.js"
import { Assets, Sprite } from "pixi.js";
import gsap from "gsap";
import { contain, explode } from "../../game-engine/Math.js"
import * as PIXI from "pixi.js"
import { shake } from "@/app/game-engine/effects/Effects.js";

const featureSymbol = {
    name: "warden",
    scale: 1,
    path: "Warden.png",
    weight: [5],
    cheatWeight: [99999],
    dontCluster: true,
    onlyAppearOnRoll: true,
    // explodeEffect: "warden_explode",
    // explodeEffect: "warden_poof",
    // clusterSize: 1,
    prio: true,
    playbackRate: 3,
    payouts: { 0: 0, 1: 0.01, 2: 0.05, 3: 0.1, 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15, 13: 16, 14: 17, 15: 18, 16: 19 },
}

export class WardenFeature extends GameFeature {
    constructor(game) {
        super(game, "WARDEN_FEATURE", featureSymbol)
    }

    getAssets() {
        return [
            { alias: "fireball", src: "Fireball.png" },
            { alias: "warden_anim", src: "warden_anim.mp4" },
        ];
    }


    onGridIdle(grid, timeline) {
        // Simple check: Is he on the board?
        const warden = contain(this.id, grid)
        if (warden) {
            const targets = []
            for (let i = 2; i < 5; i++) {
                for (let j = 2; j < 5; j++) {
                    const newId = this.config.symbols.find(s => s.name === "wild").id
                    targets.push({ x: i, y: j, newId: newId })
                    grid[i][j] = newId
                }
            }
            timeline.push({
                type: this.type,
                source: warden[0],
                changes: targets,
            })
            const clustersToProcess = Array.from({ length: this.config.cols }, () => []);
            if (!clustersToProcess[warden[0].x].includes(warden[0].y)) {
                clustersToProcess[warden[0].x].push(warden[0].y);
            }
            // what sohuld clusterToprecc be here? expldoe the warden, what if he is in the middel?
            explode(this.engine, grid, clustersToProcess, timeline, 0, this.config.symbols)
            return true
        }
        return false
    }

    async onCustomEvent(event) {
        const { source } = event;
        const wardenReel = this.game.reels[source.x];
        wardenReel.sort()
        const wardenSprite = wardenReel.symbols[source.y + 1]

        if (!wardenSprite) return;

        await this.game.playSymbolVideo(wardenSprite, "warden_anim");

        // 3. Fire Projectiles to Targets
        const artilleryGridPos = contain(featureSymbol.id, this.game.grid)[0];
        const sourceSprite = this.game.reels[artilleryGridPos.x].symbols[artilleryGridPos.y + 1];

        // Trigger the Fireball
        await this.launchMegaFireball(sourceSprite);
        const promises = [];
        event.changes.forEach(change => {
            promises.push(this.game.insertIntoGrid({ x: change.x, y: change.y }, change.newId));
        });
        await Promise.all(promises);

    }

    async launchMegaFireball(sourceSprite) {
        const game = this.game
        const baseScale = { x: .08, y: .08 }// sourceSprite.scale
        // 1. Calculate the Center of the Grid (The Target)
        // We assume the grid is centered in the container or calculate via rows/cols
        const totalCols = game.config.cols;
        const totalRows = game.config.rows;

        // Middle column and middle row index
        const midCol = Math.floor(totalCols / 2);
        const midRow = Math.floor(totalRows / 2);

        // Get the sprite currently at the center to find the X/Y coordinates
        game.reels[midCol].sort()
        const targetSymbol = game.reels[midCol].symbols[totalRows - midRow];
        const targetPos = game.stage.toLocal(targetSymbol.getGlobalPosition());
        const startPos = game.stage.toLocal(sourceSprite.getGlobalPosition());

        // 2. Spawn the Fireball
        // Using the specific asset 'fireball.png'
        const fireball = new PIXI.Sprite(PIXI.Texture.from("fireball"));
        fireball.anchor.set(0.5);
        fireball.scale.set(baseScale.x); // Start at normal size
        fireball.position.copyFrom(startPos);
        game.stage.addChild(fireball);

        // 3. Define the High Arc (Lob)
        const midX = (startPos.x + targetPos.x) / 2;
        const midY = (startPos.y + targetPos.y) / 2;
        const arcHeight = 600; // Very high lob

        const path = [
            { x: startPos.x, y: startPos.y },
            { x: midX, y: midY - arcHeight }, // The Apex
            { x: targetPos.x, y: targetPos.y }
        ];

        // 4. The Animation Timeline
        return new Promise((resolve) => {
            const tl = gsap.timeline({
                onComplete: () => {
                    fireball.destroy();
                    resolve();
                }
            });

            // --- Phase 1: The Lob (1.5 seconds) ---
            tl.to(fireball, {
                duration: 1.5,
                ease: "power1.in", // Starts slow, speeds up down
                motionPath: {
                    path: path,
                    curviness: 1.5,
                    autoRotate: true,
                    rotationOffset: 90 // Adjust this if your fireball.png points up instead of right
                }
            });

            // Scale Logic during flight:
            // Go small at the top (perspective), return to normal size before impact
            tl.to(fireball.scale, { x: baseScale.x * 0.6, y: baseScale.y * 0.6, duration: 0.75, ease: "power1.out" }, 0)
                .to(fireball.scale, { x: baseScale.x * 1.0, y: baseScale.y * 1.0, duration: 0.75, ease: "power1.in" }, 0.75);


            // --- Phase 2: The Impact (Explosion) ---
            tl.add(() => {
                shake(this.stage, 20, 0.5);
            });

            // 2. The Visual Explosion (Scale 3x)
            // Instead of spawning a new explosion, we rapidly expand the fireball 
            // and fade it out to mimic a shockwave covering 3x3 tiles.
            tl.to(fireball.scale, {
                x: baseScale.x * 3,
                y: baseScale.y * 3,
                duration: 0.2,
                ease: "power4.out" // Explosive expansion
            });

            tl.to(fireball, {
                alpha: 0,
                duration: 0.3,
                ease: "linear"
            }, "<+=0.1"); // Start fading shortly after expansion starts
        });
    }
}