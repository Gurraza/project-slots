import GameFeature from "../../../game-engine/GameFeature.ts"
import { contain } from "../../../game-engine/Math.ts"
import { SymbolDef } from "../../../game-engine/types.ts"
import SlotsBase from "../../../game-engine/SlotsBase.ts"

export class Scatter extends GameFeature {
    constructor(game: SlotsBase, featureSymbol: SymbolDef) {
        super(game, "SCATTER_FEATURE", featureSymbol)
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