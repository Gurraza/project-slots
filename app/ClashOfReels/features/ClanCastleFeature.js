import GameFeature from "@/app/game-engine/GameFeature";

const clanCastleFeature = {
    name: "clancastlefeature",
    dontCluster: true,
    weight: 500,
    scale: 4,
    path: "Star.png"
}

export class ClanCastleFeature extends GameFeature {
    constructor(game) {
        super(game, "CLAN_CASTLE")
        this.game = game
    }

    async init() {
        this.id = this.config.symbols.find(s => s.name === clanCastleFeature.name).id
    }


    getSymbols() {
        return [
            clanCastleFeature
        ];
    }

    onGridPreProcess(grid, timeline) {
        const castlePositions = this.game.contain(this.id, grid)
        // const moves = this.simulateChangeSymbols(currentGrid, clanCastle.id, this.config.symbols.filter(s => s.group == "low_troop"));
        if (castlePositions) {
            // const lowTroops = this.config.symbols.filter(s => s.group == "low_troop" && s.weight != 0);
            // const randomBaseTroop = lowTroops[Math.floor(this.game.random() * lowTroops.length)];
            // // 2. Find its SUPER version
            // const superVersion = this.config.symbols.find(s =>
            //     s.isSuper && s.matchesWith === randomBaseTroop.name
            // );
            // // Default to normal if super not found (safety)
            // const transformId = superVersion ? superVersion.id : randomBaseTroop.id;

            const moves = [];
            castlePositions.forEach(pos => {
                moves.push({ x: pos.x, y: pos.y, newId: 0 });
                grid[pos.x][pos.y] = 0;
            });
            // moves.forEach(move => {
            //     if (currentGrid[move.x] && currentGrid[move.x][move.y] !== undefined) {
            //         currentGrid[move.x][move.y] = move.newId;
            //     }
            // });

            timeline.push({
                type: 'CLAN_CASTLE',
                changes: moves,

                grid: JSON.parse(JSON.stringify(grid))
            });
            return true
        }
        return false
    }

    async onCustomEvent(event) {
        const promises = [];
        event.changes.forEach(change => {
            // We can insert directly because 'change' has {x, y, newId}
            // insertIntoGrid handles the visual promise
            promises.push(this.game.insertIntoGrid({ x: change.x, y: change.y }, change.newId));
        });
        await Promise.all(promises);

        return false;
    }

}