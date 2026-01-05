import GameFeature from "@/app/game-engine/GameFeature";
import gsap from "gsap"
import { MinesGame } from "../MinesGame";

const featureSymbol = {
    name: "treasure",
    weight: [150, 50, 10],
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

export class MinesFeature extends GameFeature {
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
        if (this.game.contain(this.id, grid).length === 3) {
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

        await this.game.playBonusTransition("BONUS ROUND\nMINES");

        await gsap.to(this.game.reelContainer, { alpha: 0.2, duration: 0.5 });

        const totalTiles = this.minesGame.config.cols * this.minesGame.config.rows;
        const bombCount = this.minesGame.config.bombsCount
        const maxSafeMoves = totalTiles - bombCount;

        // 2. Generate a random limit between 1 and maxSafeMoves (Inclusive)
        // This determines "How many times can I click before the game forces a bomb?"
        const randomLimit = Math.floor(this.game.random() * maxSafeMoves);
        const totalBonusWin = await this.minesGame.play(1, randomLimit);
        if (this.game.globalMultiplier == 0) {
            this.game.setMultiplier(totalBonusWin); // Visual update hook
        }
        else {
            this.game.setMultiplier(this.game.globalMultiplier * totalBonusWin); // Visual update hook
        }

        await gsap.to(this.game.reelContainer, { alpha: 1, duration: 0.5 });
    }
}