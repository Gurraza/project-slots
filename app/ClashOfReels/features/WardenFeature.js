import GameFeature from "@/app/game-engine/GameFeature";
import { Assets, Sprite } from "pixi.js";
import gsap from "gsap";

const featureSymbol = {
    name: "warden",
    scale: 1,
    path: "Warden.png",
    weight: [75],
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
        const wardenData = this.game.contain(this.id, grid)
        if (wardenData) {
            // Use the helper to determine IF he has valid targets
            const wardenAction = this.calculateWardenAction(grid);

            if (wardenAction) {

                // A. Push the Ability Event (Video + Projectiles)
                timeline.push({
                    type: this.type,
                    source: wardenAction.source,
                    targets: wardenAction.targets,
                    win: wardenAction.win
                });

                // B. Calculate the Resulting Explosion (The targets die)
                const clustersToProcess = Array.from({ length: this.config.cols }, () => []);
                wardenAction.targets.forEach(t => {
                    if (!clustersToProcess[t.x].includes(t.y)) {
                        clustersToProcess[t.x].push(t.y);
                    }
                });

                const source = wardenAction.source;
                if (!clustersToProcess[source.x].includes(source.y)) {
                    clustersToProcess[source.x].push(source.y);
                }

                // C. Simulate the resulting Cascade
                // const replacements = this.game.generateReplacements(clustersToProcess, grid);
                // const nextGrid = this.game.simulateCascade(grid, clustersToProcess, replacements);
                // this.applyGrid(grid, nextGrid)
                this.game.explode(grid, clustersToProcess, timeline, 0)

                // timeline.push({
                //     type: 'CASCADE',
                //     clusters: clustersToProcess,
                //     replacements: replacements,
                //     grid: JSON.parse(JSON.stringify(nextGrid)),
                // });
                return true
            }
        }
        return false
    }

    async onCustomEvent(event) {

        // 1. Locate the Warden Sprite
        const { source, targets, stepWin } = event;
        const wardenReel = this.game.reels[source.x];
        wardenReel.sort()
        const wardenSprite = wardenReel.symbols[source.y + 1]; // Offset due to Reel buffer

        if (!wardenSprite) return;

        // 2. Play Video (Warden Casts Spell)
        // We handle the video play here manually instead of relying on 'matchEffect'
        await this.game.playSymbolVideo(wardenSprite, "warden_anim");

        // 3. Fire Projectiles to Targets
        const wardenGlobal = this.game.stage.toLocal(wardenSprite.getGlobalPosition());
        const projectilePromises = targets.map(target => {
            const targetReel = this.game.reels[target.x];
            targetReel.sort()
            const targetSprite = targetReel.symbols[target.y + 1];

            if (!targetSprite) return Promise.resolve();
            const targetGlobal = this.game.stage.toLocal(targetSprite.getGlobalPosition());

            return new Promise(resolve => {
                const texture = Assets.get("fireball") || Assets.get("gem");
                const orb = new Sprite(texture);
                orb.anchor.set(0.5);

                // 1. Calculate the Target Scale manually
                // e.g., if you want 80px and texture is 1000px, target is 0.08
                const targetScaleX = this.config.symbolWidth / texture.width;
                const targetScaleY = this.config.symbolHeight / texture.height;

                // 2. Start invisible (scale 0)
                orb.scale.set(0);
                orb.position.set(wardenGlobal.x, wardenGlobal.y - 50);
                orb.alpha = 0;

                // Optional: Rotate towards target
                const dx = targetGlobal.x - orb.x;
                const dy = targetGlobal.y - orb.y;
                orb.rotation = Math.atan2(dy, dx);

                this.game.stage.addChild(orb);

                const tl = gsap.timeline({
                    onComplete: () => {
                        orb.destroy();
                        gsap.to(targetSprite, { x: targetSprite.x + 5, duration: 0.05, yoyo: true, repeat: 3 });
                        resolve();
                    }
                });

                // 3. Animate to the TARGET SCALE, not 1
                tl.to(orb.scale, {
                    x: targetScaleX,
                    y: targetScaleY,
                    duration: 0.2,
                    ease: "back.out(1.2)" // Adds a nice "pop" effect
                });
                tl.to(orb, { alpha: 1, duration: 0.1 }, "<");

                // Fly
                tl.to(orb, {
                    x: targetGlobal.x,
                    y: targetGlobal.y,
                    duration: 0.4,
                    ease: "power1.in"
                });

                // Impact Flash (Scale up relative to the target size, e.g., 2x the small size)
                tl.to(orb.scale, {
                    x: targetScaleX * 2,
                    y: targetScaleY * 2,
                    duration: 0.1
                });
                tl.to(orb, { alpha: 0, duration: 0.1 }, "<");
            });
        });

        await Promise.all(projectilePromises);

        // 4. Update Win UI
        if (event.totalWin > 0) {
            this.game.setMultiplier(event.totalWin);
        }
    }


    calculateWardenAction(grid) {
        let wardenFound = null;

        // 1. Find Warden Position
        for (let c = 0; c < this.config.cols; c++) {
            for (let r = 0; r < this.config.rows; r++) {
                if (grid[c][r] === this.id) {
                    // Store logic coordinates
                    wardenFound = { x: c, y: r };
                    break;
                }
            }
            if (wardenFound) break;
        }

        if (!wardenFound) return null;

        // 2. Find Targets (Low Resources)
        const targets = [];
        const resourceCandidates = {};

        for (let c = 0; c < this.config.cols; c++) {
            for (let r = 0; r < this.config.rows; r++) {
                if (c === wardenFound.x && r === wardenFound.y) continue; // Skip self

                const tId = grid[c][r];
                const tDef = this.config.symbols[tId];

                if (tDef && tDef.group === "low_resource") {
                    if (!resourceCandidates[tId]) resourceCandidates[tId] = [];
                    resourceCandidates[tId].push({ x: c, y: r });
                }
            }
        }

        // 3. Select One Type of Resource to Destroy
        const foundIds = Object.keys(resourceCandidates);
        if (foundIds.length > 0) {
            const randomId = foundIds[Math.floor(this.game.random() * foundIds.length)];
            targets.push(...resourceCandidates[randomId]);
        }

        if (targets.length === 0) return null;

        // 4. Return the Action Data
        return {
            source: wardenFound, // Logic coordinates {x, y}
            targets: targets,    // Logic coordinates [{x, y}]
            win: featureSymbol.payouts[targets.length]
        };
    }
}