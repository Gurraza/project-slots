import gsap from "gsap";
import * as PIXI from "pixi.js"

export function popAnimation(sprite): Promise<void> {
    return new Promise((resolve) => {
        const base = getScale(sprite)
        const tl = gsap.timeline({
            onComplete: () => {
                sprite.destroy();
                resolve();
            }
        });

        tl.to(sprite.scale, { x: base * 0.9, y: base * 0.9, duration: 0.18, ease: "power2.out" })  // squash
            .to(sprite.scale, { x: base * 1.35, y: base * 1.35, duration: 0.14, ease: "back.out(3)" })
            .to(sprite, { alpha: 0, duration: 0.12, ease: "power1.in" }, "-=0.06");
    });
}

export function glowFlashAnimation(sprite): Promise<void> {
    return new Promise((resolve) => {
        const base = getScale(sprite)
        const tl = gsap.timeline({
            onComplete: () => {
                sprite.destroy();
                resolve();
            }
        });

        // optional: start fully visible
        sprite.alpha = 1;

        tl.to(sprite, { alpha: 1, duration: 0 }) // ensure visible
            .to(sprite, {
                pixi: { brightness: 2 },
                duration: 0.08,
                ease: "power2.out"
            })
            .to(sprite.scale, { x: base * 1.25, y: base * 1.25, duration: 0.18, ease: "power2.out" })
            .to(sprite, {
                alpha: 0,
                duration: 0.12,
                ease: "power1.in",
                pixi: { brightness: 1 }
            }, "-=0.1");
    });
}

export function implodeAnimation(sprite): Promise<void> {
    return new Promise((resolve) => {
        const base = getScale(sprite)
        const tl = gsap.timeline({
            onComplete: () => {
                sprite.destroy();
                resolve();
            }
        });

        tl.to(sprite.scale, { x: base * 0.8, y: base * 0.8, duration: 0.08, ease: "power2.out" })
            .to(sprite.scale, { x: base * 0.1, y: base * 0.1, duration: 0.18, ease: "power3.in" })
            .to(sprite, { alpha: 0, duration: 0.12, ease: "power1.in" }, "-=0.1");
    });
}

export function fragmentPopAnimation(sprite): Promise<void> {
    return new Promise(resolve => {
        const parent = sprite.parent;
        const { x, y } = sprite;
        const texture = sprite.texture;

        // hide ghost but keep its position reference
        sprite.visible = false;

        const pieces = [];

        for (let i = 0; i < 12; i++) {
            const p = new PIXI.Sprite(texture);
            p.anchor.set(0.5);

            // place pieces at original position
            p.x = x;
            p.y = y;

            p.width = sprite.width * 0.6
            p.height = sprite.height * 0.6
            parent.addChild(p);
            pieces.push(p);
        }

        const tl = gsap.timeline({
            onComplete: () => {
                pieces.forEach(p => p.destroy());
                sprite.destroy();
                resolve();
            }
        });

        pieces.forEach((p, i) => {
            const angle = (Math.PI / 2) * i;
            const dx = Math.cos(angle) * 50;
            const dy = Math.sin(angle) * 50;

            tl.to(p, {
                x: p.x + dx,
                y: p.y + dy,
                rotation: Math.random() * 1.2,
                alpha: 0,
                duration: 0.28,
                ease: "power2.out"
            }, 0); // all start together
        });
    });
}

// Helper function to shake any object (usually the stage or a container)
export function shake(whatToMove: PIXI.Container, intensity: number, duration: number) {
    return new Promise(resolve => {
        const startX = whatToMove.x; // Capture original position
        const startY = whatToMove.y;
        const shakes = 15;           // Number of shakes
        const keyframes = [];

        for (let i = 0; i < shakes; i++) {
            const decay = 1 - (i / shakes); // Shake gets smaller over time
            const x = (Math.random() * intensity * 2 - intensity) * decay;
            const y = (Math.random() * intensity * 2 - intensity) * decay;

            keyframes.push({
                x: startX + x,
                y: startY + y,
                duration: duration / shakes
            });
        }

        // Return to exact original position at the end
        keyframes.push({ x: startX, y: startY, duration: 0.1, ease: "power2.out" });

        // Animate the specific object passed to the function
        gsap.to(whatToMove, {
            keyframes: keyframes,
            onComplete: resolve
        });
    });
}

export function sshake(whatToMove, intensity, duration) {
    return new Promise(resolve => {
        const startX = whatToMove.x
        const startY = whatToMove.y
        const shakes = 15;      // How many rapid movements
        const keyframes = [];

        for (let i = 0; i < shakes; i++) {
            const decay = 1 - (i / shakes);
            const x = (Math.random() * intensity * 2 - intensity) * decay;
            const y = (Math.random() * intensity * 2 - intensity) * decay;

            keyframes.push({
                x: startX + x,
                y: startY + y,
                duration: duration / shakes
            });
        }

        keyframes.push({ x: startX, y: startY, rotation: 0, duration: 0.1, ease: "power2.out" });


        gsap.to(this.stage, {
            keyframes: keyframes,
            onComplete: resolve
        });
    })
}

export function landingEffect(sprite) {
    return new Promise(resolve => {
        const base = getScale(sprite)

        sprite.scale.set(base * 1.1); // quick anticipation

        gsap.timeline({
            onComplete: resolve
        })
            .to(sprite.scale, {
                x: base * 0.9,
                y: base * 1.1,
                duration: 0.08,
                ease: "power2.out"
            })
            .to(sprite.scale, {
                x: base * 1.05,
                y: base * 0.95,
                duration: 0.08,
                ease: "power2.out"
            })
            .to(sprite.scale, {
                x: base,
                y: base,
                duration: 0.10,
                ease: "back.out(2)"
            });
    });
}

export function matchEffectAlternative(sprite) {
    return new Promise(resolve => {
        const base = getScale(sprite)

        gsap.timeline({
            onComplete: resolve
        })
            .to(sprite.scale, {
                x: base * 1.15,
                y: base * 1.15,
                duration: 0.12,
                ease: "power2.out"
            })
            .to(sprite, {
                alpha: 0.9,
                duration: 0.12
            }, "<")
            .to(sprite.scale, {
                x: base,
                y: base,
                duration: 0.16,
                ease: "back.out(2)"
            })
            .to(sprite, {
                alpha: 1,
                duration: 0.1
            }, "-=0.1");
    });
}

export function matchEffect(sprite): Promise<void> {
    return new Promise(resolve => {

        const colorMatrix = new PIXI.ColorMatrixFilter();
        sprite.filters = [colorMatrix];
        const originalZIndex = sprite.zIndex;
        sprite.parent.sortableChildren = true;
        sprite.zIndex = 100;

        const tl = gsap.timeline({
            onComplete: () => {
                sprite.filters = null;
                sprite.zIndex = originalZIndex;
                resolve()
            }
        });

        tl.to(sprite.scale, {
            x: sprite.scale.x * 1.2,
            y: sprite.scale.y * 1.2,
            duration: 0.1,
            yoyo: true,
            repeat: 3,
            ease: "sine.inOut"
        });
        const flash = { intensity: 1 };
        tl.to(flash, {
            intensity: 1.8,
            duration: 0.1,
            yoyo: true,
            repeat: 3,
            ease: "sine.inOut",
            onUpdate: () => {
                colorMatrix.brightness(flash.intensity, false);
            }
        }, "<");
    })
}

function getScale(sprite) {
    return Math.min(
        sprite.scale.x,
        sprite.scale.y
    )
}