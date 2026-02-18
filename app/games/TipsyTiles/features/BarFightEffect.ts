import * as PIXI from "pixi.js";
import gsap from "gsap";
import SlotsBase from "../../../game-engine/SlotsBase";

/**
 * Small helper to await a GSAP timeline
 */
function playTimeline(tl: gsap.core.Timeline): Promise<void> {
    return new Promise(resolve => {
        tl.eventCallback("onComplete", () => resolve());
    });
}

/**
 * Random cartoon swear generator
 */
function randomSwear(): string {
    const chars = ["#", "%", "&", "€", "@", "!", "?", "§"];
    const len = 5 + Math.floor(Math.random() * 4);
    let out = "";
    for (let i = 0; i < len; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
}

/**
 * Creates the cartoon dust cloud (vector so no texture needed)
 */
function createDustCloud(radius = 40): PIXI.Container {
    const c = new PIXI.Container();

    for (let i = 0; i < 6; i++) {
        const puff = new PIXI.Graphics()
            .circle(0, 0, radius * (0.6 + Math.random() * 0.5))
            .fill({ color: 0xffffff, alpha: 0.9 });

        puff.x = (Math.random() - 0.5) * radius;
        puff.y = (Math.random() - 0.5) * radius;

        c.addChild(puff);
    }

    const outline = new PIXI.Graphics()
        .circle(0, 0, radius * 1.2)
        .stroke({ width: 4, color: 0x000000, alpha: 0.8 });

    c.addChild(outline);

    return c;
}

/**
 * Creates the cartoon speech bubble
 */
function createSpeechBubble(): { container: PIXI.Container; text: PIXI.Text } {
    const container = new PIXI.Container();

    const bubble = new PIXI.Graphics()
        .roundRect(0, 0, 140, 60, 18)
        .fill({ color: 0xffffff })
        .stroke({ width: 4, color: 0x000000 });

    const tail = new PIXI.Graphics()
        .poly([20, 60, 40, 60, 28, 78])
        .fill({ color: 0xffffff })
        .stroke({ width: 4, color: 0x000000 });

    const text = new PIXI.Text({
        text: randomSwear(),
        style: {
            fontFamily: "Arial Black",
            fontSize: 22,
            fill: 0x000000,
            align: "center"
        }
    });

    text.anchor.set(0.5);
    text.x = 70;
    text.y = 30;

    container.addChild(bubble, tail, text);
    container.pivot.set(70, 30);

    return { container, text };
}

/**
 * MAIN ANIMATION — await this from your game
 */
export async function playBarFight(event: any, game: SlotsBase, stage: any): Promise<void> {
    // const stage: PIXI.Container = game.app.stage;

    // Compute center of all fighters
    const config = game.config
    const centerX =
        event.fighters.reduce((a: number, p: any) => a + p.x, 0) /
        event.fighters.length;
    const centerY =
        event.fighters.reduce((a: number, p: any) => a + p.y, 0) /
        event.fighters.length;

    const worldX = centerX * config.symbolWidth + config.symbolWidth / 2;
    const worldY = (game.config.rows - 1 - centerY) * config.symbolHeight + config.symbolHeight / 2;

    // --- Dust cloud ---
    const dust = createDustCloud(config.symbolWidth * 0.9);
    dust.x = worldX;
    dust.y = worldY;
    stage.addChild(dust);

    // --- Speech bubble ---
    const { container: bubble, text } = createSpeechBubble();
    bubble.x = worldX;
    bubble.y = worldY - config.symbolWidth * 1.3;
    bubble.scale.set(0);

    stage.addChild(bubble);

    // --- Spawn ghosts immediately for feedback ---
    for (const fighter of event.fighters) {
        const sprite = game.getSymbol(fighter.x, fighter.y);
        // if (sprite) game.spawnGhost(sprite);
    }

    // --- Animation timeline ---
    const tl = gsap.timeline();

    // Bubble pop-in
    tl.to(bubble.scale, {
        x: 1,
        y: 1,
        duration: 0.25,
        ease: "back.out(2)"
    });

    // Chaotic dust fighting loop
    tl.to(dust, {
        rotation: "+=0.4",
        x: "+=6",
        y: "-=4",
        duration: 0.08,
        repeat: 25,
        yoyo: true,
        ease: "sine.inOut",
        onRepeat: () => {
            text.text = randomSwear(); // change curse text rapidly
        }
    });

    // Squash/stretch cartoon feel
    tl.to(dust.scale, {
        x: 1.2,
        y: 0.8,
        duration: 0.12,
        repeat: 16,
        yoyo: true,
        ease: "power1.inOut"
    }, "<");

    // Final "poof"
    tl.to(dust.scale, {
        x: 0,
        y: 0,
        duration: 0.25,
        ease: "back.in(1.8)"
    });

    tl.to(bubble.scale, {
        x: 0,
        y: 0,
        duration: 0.2,
        ease: "power2.in"
    }, "<");

    await playTimeline(tl);

    // Cleanup
    dust.destroy({ children: true });
    bubble.destroy({ children: true });
}
