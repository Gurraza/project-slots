import GameFeature from "../../../game-engine/GameFeature.ts"
import { contain } from "../../../game-engine/Math.ts"
import { SymbolDef } from "../../../game-engine/types.ts"
import SlotsBase from "../../../game-engine/SlotsBase.ts"

export class StickyFeature extends GameFeature {
    private symbolId: number
    constructor(game: SlotsBase, symbolId: number) {
        super(game, "EXPANDING_WILDS", null)
        this.symbolId = symbolId
    }

    onGridIdle(grid, timeline) {
        timeline.push({
            type: this.type,
            grid: JSON.parse(JSON.stringify(grid)),
            positions: contain(this.symbolId, grid)
        })
        return false
    }

    cleanup(grid): void {
        const symbols = contain(this.symbolId, grid)
        symbols.forEach(s => {
            this.game.getSymbol(s.x, s.y + 1).isSticky = true
        })
    }

    async onCustomEvent(event) {
        event.positions.forEach(s => {
            this.game.makeCellSticky(s.x, s.y)//this.game.getSymbol(s.x, s.y + 1)
        })
    }
}