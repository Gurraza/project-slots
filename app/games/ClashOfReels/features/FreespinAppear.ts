import GameFeature from "../../../game-engine/GameFeature.ts"
import gsap from "gsap"
import * as PIXI from "pixi.js";
import SlotsBase from "../../../game-engine/SlotsBase.ts";

export class FreespinAppearFeature extends GameFeature {
    constructor(game: SlotsBase) {
        super(game, "FREE_SPIN_APPEAR", null)
    }

    onActivateFreespins(): void {
        const freespinContainer = this.game.ui.freespinContainer

        gsap.to(freespinContainer, {
            y: 6,
            duration: 0.5,
            ease: "back.out(1.2)",
            overwrite: true
        })
    }

    onDeactivateFreespins(): void {
        const freespinContainer = this.game.ui.freespinContainer

        gsap.to(freespinContainer, {
            y: 65,
            duration: 0.5,
            ease: "back.out(1.2)",
            overwrite: true
        })
    }
}