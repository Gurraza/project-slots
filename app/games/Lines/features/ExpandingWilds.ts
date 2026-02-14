import GameFeature from "../../../game-engine/GameFeature.ts"
import { contain } from "../../../game-engine/Math.ts"
import { SymbolDef } from "../../../game-engine/types.ts"
import SlotsBase from "../../../game-engine/SlotsBase.ts"

export class ExpandingWildsFeature extends GameFeature {
    private wild: SymbolDef
    private newWildWeight: number | number[] = [99999, 9999, 9999]
    constructor(game: SlotsBase) {
        super(game, "EXPANDING_WILDS", null)
        this.wild = this.config.symbols.find(s => s.name == "wild")
    }

    init() {
        super.init()
        this.wild.weight = this.newWildWeight
        this.wild.baseWeight = this.newWildWeight
    }

    cleanup(): void {
        this.wild.weight = this.wild._originalWeight
        this.wild.baseWeight = this.wild._originalWeight
    }

    onGridIdle(grid, timeline) {
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
            reel.symbols.forEach((s, i) => {
                if (i > 0 && i < reel.symbols.length - 1) {
                    const symbolHere = reel.getSymbol(i)
                    if (symbolHere.symbolId != this.wild.id) {
                        promises.push(this.game.insertIntoGrid({ x: col, y: i - 1 }, this.wild.id));
                    }
                }
            })
        })
        await Promise.all(promises)
    }
}