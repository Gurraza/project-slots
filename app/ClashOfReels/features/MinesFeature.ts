import GameFeature from "../../game-engine/GameFeature.ts"
import gsap from "gsap"
import { MinesGame } from "../MinesGame.ts";
import { contain } from "../../game-engine/Math.ts"

const featureSymbol = {
    name: "treasure",
    weight: [150, 50, 1],
    scale: 1.4,
    group: "bonus_game",
    onlyAppearOnRoll: true,
    path: "Treasury.png",
    anticipation: {
        after: 2,
        count: 15,
    },
    onePerReel: true,
    dontCluster: true,
}
interface textureConf {
    texture: string
    scale: number
}
interface MinesGameConfig {
    textureHidden: textureConf
    backgroundImage: textureConf
    textureBomb: textureConf
    textureGem: textureConf
    cols: number
    rows: number
    bombsCount: number
}

export class MinesFeature extends GameFeature {
    private minesGame: MinesGame
    constructor(app) {
        super(app, "MINES_FEATURE", featureSymbol)
    }

    getAssets() {
        return [
            { alias: "grass", src: "grass.png" },
            { alias: "mines_backgroundImage", src: "grass5b5.png" },
            { alias: "bomb", src: "bomb.png" },
            // { alias: "gem", src: "resource/gem.png" } // Reusing existing path
        ];
    }

    async init() {
        await super.init();

        // Initialize the sub-game instance here
        this.minesGame = new MinesGame(this.stage, this.app, {
            textureHidden: { texture: "grass", scale: .3 },
            backgroundImage: { texture: "mines_backgroundImage", scale: 1 },
            textureBomb: { texture: "bomb", scale: .6 },
            textureGem: { texture: "gem", scale: .6 },
            cols: 5,
            rows: 5,
            bombsCount: 5
        });
    }

    onSpinEnd(grid, timeline) {
        if (contain(this.id, grid).length === 3) {
            timeline.push({
                type: this.type,
                grid: JSON.parse(JSON.stringify(grid)),
            })
            return true
        }
        return false
    }

    async onCustomEvent(event) {
        console.log("!!! ENTERING MINES BONUS !!!");

        await this.ui.playBonusTransition("BONUS ROUND\nMINES");

        await gsap.to(this.game.reelContainer, { alpha: 0.2, duration: 0.5 });

        const totalTiles = this.minesGame.config.cols * this.minesGame.config.rows;
        const bombCount = this.minesGame.config.bombsCount
        const maxSafeMoves = totalTiles - bombCount;

        // 2. Generate a random limit between 1 and maxSafeMoves (Inclusive)
        // This determines "How many times can I click before the game forces a bomb?"
        const randomLimit = Math.floor(this.engine.random() * maxSafeMoves);
        const totalBonusWin = await this.minesGame.play(1, randomLimit);
        if (this.ui.globalMultiplier == 0) {
            this.ui.setMultiplier(totalBonusWin); // Visual update hook
        }
        else {
            this.ui.setMultiplier(this.ui.globalMultiplier * totalBonusWin); // Visual update hook
        }

        await gsap.to(this.game.reelContainer, { alpha: 1, duration: 0.5 });
    }
}