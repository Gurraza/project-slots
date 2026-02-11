import GameFeature from "../../../game-engine/GameFeature.ts"
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin"
import { contain, explode } from "../../../game-engine/Math.ts"
import * as PIXI from "pixi.js"
import { shake } from "../../../game-engine/effects/Effects.ts";
import { SymbolDef, Grid, Timeline, FeatureEvent, TimelineEvent } from "../../../game-engine/types.ts";
import SlotsBase from "../../../game-engine/SlotsBase.ts";

// Register GSAP Plugin for the arc animation
gsap.registerPlugin(MotionPathPlugin);

const featureSymbol: SymbolDef = {
    name: "warden",
    scale: 1,
    path: "warden.png",
    weight: [5],
    cheatWeight: [99999],
    dontCluster: true,
    onlyAppearOnRoll: true,
    prio: true, // Custom property, ensure it exists in SymbolDef or extend it
    playbackRate: 3,
    // Note: 'payouts' might need to be added to SymbolDef interface if not present
    payouts: { 0: 0, 1: 0.01, 2: 0.05, 3: 0.1, 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15, 13: 16, 14: 17, 15: 18, 16: 19 },
}

// Define the custom event shape for Warden
interface WardenEvent extends FeatureEvent {
    source: { x: number, y: number };
    changes: { x: number, y: number, newId: number }[];
}

export class WardenFeature extends GameFeature {
    constructor(game: SlotsBase) {
        super(game, "WARDEN_FEATURE", featureSymbol)
    }

    getAssets() {
        return [
            { alias: "fireball", src: "Fireball.png" },
            { alias: "warden_anim", src: "warden_anim.mp4" },
        ];
    }

    onGridIdle(grid: Grid, timeline: Timeline): boolean {
        // contain returns Point[] | false
        const wardenLocations = contain(this.id, grid);

        if (wardenLocations && wardenLocations.length > 0) {
            const warden = wardenLocations[0];
            const targets: { x: number, y: number, newId: number }[] = [];

            // 3x3 Grid center target logic
            for (let i = 2; i < 5; i++) {
                for (let j = 2; j < 5; j++) {
                    const wildSymbol = this.game.config.symbols.find(s => s.name === "wild");
                    if (wildSymbol && wildSymbol.id !== undefined) {
                        const newId = wildSymbol.id;
                        targets.push({ x: i, y: j, newId: newId });
                        grid[i][j] = newId;
                    }
                }
            }

            timeline.push({
                type: this.type,
                source: warden,
                changes: targets,
            } as WardenEvent); // Cast to custom event

            const clustersToProcess = Array.from({ length: this.game.config.cols }, () => [] as number[]);

            if (!clustersToProcess[warden.x].includes(warden.y)) {
                clustersToProcess[warden.x].push(warden.y);
            }

            explode(this.game.engine, grid, clustersToProcess, timeline, 0, this.game.config.symbols);
            return true;
        }
        return false;
    }

    async onCustomEvent(event: TimelineEvent): Promise<void> {
        if (event.type !== this.type) return;

        const wardenEvent = event as WardenEvent;
        const { source } = wardenEvent;

        const wardenReel = this.game.reels[source.x];
        wardenReel.sort(); // Assuming sort is public

        // +1 for buffer
        const wardenSprite = wardenReel.symbols[source.y + 1];

        if (!wardenSprite) return; // Return false if sprite missing

        await this.game.playSymbolVideo(wardenSprite, "warden_anim");

        // 3. Fire Projectiles
        // We need to find where the Warden is NOW (visually) or logically
        const wardenLocations = contain(featureSymbol.id as number, this.game.grid);

        if (!wardenLocations) return; // Safety check

        const artilleryGridPos = wardenLocations[0];
        const sourceSprite = this.game.reels[artilleryGridPos.x].symbols[artilleryGridPos.y + 1];

        // Trigger the Fireball
        await this.launchMegaFireball(sourceSprite);

        const promises: Promise<any>[] = [];
        if (wardenEvent.changes) {
            wardenEvent.changes.forEach(change => {
                promises.push(this.game.insertIntoGrid({ x: change.x, y: change.y }, change.newId));
            });
        }
        await Promise.all(promises);

        // --- FIX: YOU MUST RETURN TRUE ---
        return
    }

    async launchMegaFireball(sourceSprite: PIXI.Sprite): Promise<void> {
        const game = this.game;
        // Fix: Use game.stage, not this.stage (Feature doesn't have a stage)
        const stage = game.stage;

        const baseScale = { x: .08, y: .08 };

        // 1. Calculate Center
        const totalCols = game.config.cols;
        const totalRows = game.config.rows;

        const midCol = Math.floor(totalCols / 2);
        const midRow = Math.floor(totalRows / 2);

        game.reels[midCol].sort();

        // Ensure symbols exist
        if (!game.reels[midCol] || !game.reels[midCol].symbols) return;

        const targetSymbol = game.reels[midCol].symbols[totalRows - midRow];

        // Use stage.toLocal to get coordinates relative to the scene
        const targetPos = stage.toLocal(targetSymbol.getGlobalPosition());
        const startPos = stage.toLocal(sourceSprite.getGlobalPosition());

        // 2. Spawn Fireball
        const fireball = new PIXI.Sprite(PIXI.Texture.from("fireball"));
        fireball.anchor.set(0.5);
        fireball.scale.set(baseScale.x);
        fireball.position.copyFrom(startPos);
        stage.addChild(fireball);

        // 3. Define Arc
        const midX = (startPos.x + targetPos.x) / 2;
        const midY = (startPos.y + targetPos.y) / 2;
        const arcHeight = 600;

        const path = [
            { x: startPos.x, y: startPos.y },
            { x: midX, y: midY - arcHeight },
            { x: targetPos.x, y: targetPos.y }
        ];

        // 4. Animation Timeline
        // Explicitly type the Promise as void to avoid "resolve" inference errors
        return new Promise<void>((resolve) => {
            const tl = gsap.timeline({
                onComplete: () => {
                    fireball.destroy();
                    resolve();
                }
            });

            // Phase 1: The Lob
            tl.to(fireball, {
                duration: 1.5,
                ease: "power1.in",
                motionPath: {
                    path: path,
                    curviness: 1.5,
                    autoRotate: true,
                }
            });

            // Scale Logic
            tl.to(fireball.scale, { x: baseScale.x * 0.6, y: baseScale.y * 0.6, duration: 0.75, ease: "power1.out" }, 0)
                .to(fireball.scale, { x: baseScale.x * 1.0, y: baseScale.y * 1.0, duration: 0.75, ease: "power1.in" }, 0.75);

            // Phase 2: Impact
            tl.add(() => {
                // Fix: pass game.stage, not this.stage
                shake(stage, 20, 0.5);
            });

            tl.to(fireball.scale, {
                x: baseScale.x * 3,
                y: baseScale.y * 3,
                duration: 0.2,
                ease: "power4.out"
            });

            tl.to(fireball, {
                alpha: 0,
                duration: 0.3,
                ease: "linear"
            }, "<+=0.1");
        });
    }
}