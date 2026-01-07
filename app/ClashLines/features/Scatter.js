import GameFeature from "../../game-engine/GameFeature.js"
import gsap from "gsap"
import { contain } from "../../game-engine/Math.js"

const featureSymbol = {
    name: "scatter",
    weight: [20, 10, 1],
    scale: 1,
    group: "bonus_game",
    onlyAppearOnRoll: true,
    path: "Builder.png",
    anticipation: {
        after: 2,
        count: 15,
    },
    onePerReel: true,
    dontCluster: true,
}

export class Scatter extends GameFeature {
    constructor(app) {
        super(app, "SCATTER_FEATURE", featureSymbol)
    }

    getAssets() {
        return [

        ];
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
        console.log("!!! ENTERING SCATTER BONUS !!!");

        await this.ui.playBonusTransition("BONUS ROUND\nSCATTER");


    }
}