import GameFeature from "../../../game-engine/GameFeature.ts"
import { contain } from "../../../game-engine/Math.ts"
import { SymbolDef } from "../../../game-engine/types.ts"
import SlotsBase from "../../../game-engine/SlotsBase.ts"

export class ExpandingWildsFeature extends GameFeature {
    private wild: SymbolDef
    constructor(game: SlotsBase) {
        super(game, "EXPANDING_WILDS", null)
        this.wild = this.config.symbols.find(s => s.name == "wild")
    }

    onGridIdle(grid, timeline) {
        console.log("YES YES YES")
        const wilds = contain(this.wild.id, grid)
        const todo = []
        wilds.forEach(wild => {
            if (!todo.includes(wild.x)) todo.push(wild.x)
            grid[wild.x].map(() => this.wild.id)
        })
        timeline.push({
            cols: todo,
            type: this.type,
            grid: JSON.parse(JSON.stringify(grid)),
        })
        if (wilds.length > 0) return false
        return false
    }

    async onCustomEvent(event) {
        const promises = []
        event.cols.forEach(col => {
            const reel = this.reels[col]
            reel.sortReverse()

            reel.symbols.forEach((s, i) => {
                promises.push(this.game.insertIntoGrid({ x: col, y: i }, this.wild.id));
            })

        })
        await Promise.all(promises)
    }
}