import GameFeature from "../../../game-engine/GameFeature.ts"
import { contain } from "../../../game-engine/Math.ts"
import SlotsBase from "../../../game-engine/SlotsBase.ts"
import { SymbolDef, Timeline, Grid, FeatureEvent, TimelineEvent } from "../../../game-engine/types.ts"

const featureSymbol: SymbolDef = {
    name: "clancastle",
    dontCluster: true,
    weight: 100,
    cheatWeight: 500,
    scale: 1.4,
    path: "clanCastle.png"
}

export class ClanCastleFeature extends GameFeature {
    constructor(game: SlotsBase) {
        super(game, "CLAN_CASTLE", featureSymbol)
    }

    init() {
        super.init()
    }

    onGridPreProcess(grid: Grid, timeline: Timeline) {
        console.log("this.id", this.id)
        const castlePositions = contain(this.id, grid)
        console.log("castles", castlePositions.length)
        if (castlePositions.length > 0) {
            const lowTroops = this.config.symbols.filter(s => s.group == "low_troop" && s.weight != 0);
            const randomBaseTroop = lowTroops[Math.floor(this.engine.random() * lowTroops.length)];
            console.log("random_low", randomBaseTroop)
            // 2. Find its SUPER version
            const superVersion = this.config.symbols.find(s =>
                s.isSuper && s.matchesWith.includes(randomBaseTroop.name)
            );
            console.log("random_super", superVersion)
            // Default to normal if super not found (safety)
            const transformId = superVersion ? superVersion.id : randomBaseTroop.id;

            const moves = [];
            castlePositions.forEach(pos => {
                moves.push({ x: pos.x, y: pos.y, newId: transformId });
                grid[pos.x][pos.y] = transformId;
            });
            console.log("moves", moves)

            timeline.push({
                type: this.type,
                changes: moves,
                grid: JSON.parse(JSON.stringify(grid))
            });
            return true
        }
        return false
    }

    async onCustomEvent(event: FeatureEvent): Promise<void> {
        const promises = [];
        event.changes.forEach(change => {
            // We can insert directly because 'change' has {x, y, newId}
            // insertIntoGrid handles the visual promise
            console.log("__asd__")
            promises.push(this.game.insertIntoGrid({ x: change.x, y: this.config.rows - 1 - change.y }, change.newId));
        });
        await Promise.all(promises);
    }

}