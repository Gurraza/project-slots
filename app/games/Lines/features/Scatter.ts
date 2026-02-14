import GameFeature from "../../../game-engine/GameFeature.ts"
import { contain } from "../../../game-engine/Math.ts"
import { SymbolDef } from "../../../game-engine/types.ts"
import SlotsBase from "../../../game-engine/SlotsBase.ts"
import { ExpandingWildsFeature } from "./ExpandingWilds.ts"
import { PaylineEngine } from "./PaylineEngine.ts"

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

        await this.ui.playBonusTransition("BONUS ROUND \n EXPANDING WILDS");
        if (this.featureSymbol.weight == this.featureSymbol.cheatWeight) {

            this.featureSymbol.weight = this.featureSymbol._originalWeight!;
            this.featureSymbol.baseWeight = this.featureSymbol._originalWeight!;
        }
        // give 10 freespins plus register expanding wilds and increase wild chance
        this.game.setFreespins(10)
        const paylineEngine = this.game.features.find(f => f.type === "PAYLINES_FEATURE") as PaylineEngine
        paylineEngine.extendedAnimations = false
        const f = new ExpandingWildsFeature(this.game)
        this.game.registerFeature(f, true)
        await this.game.spin()
        paylineEngine.extendedAnimations = true
        this.game.unregisterFeature(f.type)
    }
}