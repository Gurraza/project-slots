import GameFeature from "../../game-engine/GameFeature.js"
import { contain, explode } from "../../game-engine/Math.js"

const featureSymbol = {
    name: "eagleartillery",
    scale: 5,
    path: "Star.png",
    weight: [15],
    dontCluster: true,
    onlyAppearOnRoll: true,
    explodeEffect: "ARTILLERY_STRIKE",
    payouts: { 1: 2 },
}

export class EagleArtilleryFeature extends GameFeature {
    constructor(game) {
        super(game, "EAGLE_ARTILLERY", featureSymbol)
        this.targetAmount = 5
    }

    onGridPreProcess(grid, timeline) {
        const eaglePos = contain(this.id, grid);

        if (!eaglePos || eaglePos.length === 0) return false;
        const source = eaglePos[0];

        const wildId = this.config.symbols.find(s => s.name == "wild").id
        const validTargets = [];
        for (let c = 0; c < this.config.cols; c++) {
            for (let r = 0; r < this.config.rows; r++) {
                // Don't target self
                if (c === source.x && r === source.y) continue;

                const id = grid[c][r];
                const sym = this.game.config.symbols[id];

                if (sym.group === "low_troop" || sym.group === "low_resource") {
                    validTargets.push({ x: c, y: r, newId: wildId });
                }
            }
        }

        if (validTargets.length === 0) return false;

        // 3. Pick random targets (up to 5)
        const targets = [];
        const count = Math.min(5, validTargets.length);

        // Shuffle and slice
        for (let i = validTargets.length - 1; i > 0; i--) {
            const j = Math.floor(this.engine.random() * (i + 1));
            [validTargets[i], validTargets[j]] = [validTargets[j], validTargets[i]];
        }
        targets.push(...validTargets.slice(0, count));

        targets.forEach(t => {
            grid[t.x][t.y] = wildId;
        });

        timeline.push({
            type: this.type,
            changes: targets,
            grid: JSON.parse(JSON.stringify(grid))
        });
        const clustersToProcess = Array.from({ length: this.config.cols }, () => []);
        clustersToProcess[source.x].push(source.y);
        explode(this.engine, grid, clustersToProcess, timeline, featureSymbol.payouts[1], this.config.symbols)
        return true
    }

    async onCustomEvent(event) {
        console.log(event)
        const promises = [];
        event.changes.forEach(change => {
            promises.push(this.game.insertIntoGrid({ x: change.x, y: change.y }, change.newId));
        });
        await Promise.all(promises);
    }

    async playEffect(effect, sprite, symbol) {
        if (effect === "ARTILLERY_STRIKE") {

        }
    }
}