import GameFeature from "../../game-engine/GameFeature.js"//"@/app/game-engine/GameFeature";
import gsap from "gsap"
import { Sprite, Assets } from "pixi.js"

const featureSymbol = {
    name: "builder",
    scale: 1,
    path: "Builder.png",
    weight: [5],
    onlyAppearOnRoll: true,
    matchEffect: "builder_match",
    clusterSize: 1,
    dontCluster: true,
    prio: true,
}

export class BuilderFeature extends GameFeature {
    constructor(game) {
        super(game, "BUILDER_FEATURE", featureSymbol)
        this.effects = [
            "builder_match"
        ]
    }

    getAssets() {
        return [
            { alias: "hammer", src: "Hammer.png" },
        ]
    }

    async playEffect(effect, sprite, symbol) {
        if (effect === "builder_match") {

            const hammerTexture = Assets.get("hammer");
            const hammer = new Sprite(hammerTexture);

            this.stage.addChild(hammer);

            const globalPos = this.stage.toLocal(sprite.getGlobalPosition());
            hammer.anchor.set(0.5, 1);
            hammer.x = -100;
            hammer.y = globalPos.y + (sprite.height / 2);
            hammer.scale.set(.1);

            // 3. Animation Timeline
            const tl = gsap.timeline({
                onComplete: () => {
                    hammer.destroy();
                }
            });

            // Glide In
            tl.to(hammer, {
                x: globalPos.x,
                duration: 0.4,
                ease: "back.out(1)"
            });

            // Smash Down
            tl.to(hammer, {
                rotation: -0.5, // Cock back
                duration: 0.1
            })
                .to(hammer, {
                    rotation: 0.5, // BAM!
                    duration: 0.1,
                    ease: "power1.in",
                    onComplete: () => {
                        // Optional: Shake the Builder symbol
                        gsap.to(sprite, { x: sprite.x + 5, yoyo: true, repeat: 3, duration: 0.05 });
                    }
                });

            // Wait a beat
            tl.to(hammer, { duration: 0.2 });

            // Fly Out Right
            tl.to(hammer, {
                x: this.config.width + 200,
                duration: 0.4,
                ease: "power1.in"
            });
            await tl
        }
    }
}