import GameFeature from "../../../game-engine/GameFeature.ts";
import gsap from "gsap";
import { Text } from "pixi.js";
import { SymbolDef, Grid, Timeline, FeatureEvent, TimelineEvent, Point } from "../../../game-engine/types.ts";
import SlotsBase from "../../../game-engine/SlotsBase.ts";
import { contain } from "../../../game-engine/Math.ts";

export class BarFightFeature extends GameFeature {
    private dirs = [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }]

    constructor(game: SlotsBase, symbol: SymbolDef) {
        super(game, "BAR_FIGHT", null);
    }

    onGridIdle(grid: Grid, timeline: Timeline): boolean {
        const dirs = this.dirs
        const eaters = this.config.symbols.filter(s => s.isEater == true)
        let found = false
        const options = []
        eaters.forEach(eater => {
            const pos: Point = contain(eater.id, grid)[0]
            dirs.forEach(dir => {
                const res = this.eatersInArea({ x: pos.x + dir.x, y: pos.y + dir.y }, grid)
                if (res.length >= 3) {
                    options.push([pos, ...res])
                }

                if (res.length == eaters.length) {
                    found = true
                }
            })
        })

        if (found) {
            // take the option with most elements in it (most eaters)
            // blow up the area around them? 
            // cascade
            // respawn them somewhere randomly where there isn't bonus with insert

            return true
        }

        return false
    }


    async onCustomEvent(event: FeatureEvent): Promise<void> {

    }

    eatersInArea(pos: { x, y }, grid: Grid): Point[] {
        const positionsFound: Point[] = []
        this.dirs.forEach(dir => {
            if (this.config.symbols.filter(s => s.isEater == true).some(s => s.id == grid[pos.x + dir.x][pos.y + dir.y])) {
                positionsFound.push({ x: pos.x + dir.x, y: pos.y + dir.y })
            }
        })
        return positionsFound
    }
}