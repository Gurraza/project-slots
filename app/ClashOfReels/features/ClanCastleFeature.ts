import GameFeature from "../../game-engine/GameFeature"
import { contain } from "../../game-engine/Math"
import SlotsBase from "../../game-engine/SlotsBase"
import { SymbolDef, Timeline, Grid, FeatureEvent, TimelineEvent } from "../../game-engine/types"

const featureSymbol: SymbolDef = {
    name: "clancastle",
    dontCluster: true,
    weight: 100,
    scale: 1.4,
    path: "clanCastle.png"
}

export class ClanCastleFeature extends GameFeature {
    constructor(game: SlotsBase) {
        super(game, "CLAN_CASTLE", featureSymbol)
    }

    onGridPreProcess(grid: Grid, timeline: Timeline) {
        const castlePositions = contain(this.id, grid)
        if (castlePositions) {
            const lowTroops = this.config.symbols.filter(s => s.group == "low_troop" && s.weight != 0);
            const randomBaseTroop = lowTroops[Math.floor(this.engine.random() * lowTroops.length)];
            // 2. Find its SUPER version
            const superVersion = this.config.symbols.find(s =>
                s.isSuper && s.matchesWith === randomBaseTroop.name
            );
            // Default to normal if super not found (safety)
            const transformId = superVersion ? superVersion.id : randomBaseTroop.id;

            const moves = [];
            castlePositions.forEach(pos => {
                moves.push({ x: pos.x, y: pos.y, newId: transformId });
                grid[pos.x][pos.y] = transformId;
            });

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
            promises.push(this.game.insertIntoGrid({ x: change.x, y: change.y }, change.newId));
        });
        await Promise.all(promises);
    }

}