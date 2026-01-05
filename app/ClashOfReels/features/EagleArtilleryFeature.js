import GameFeature from "@/app/game-engine/GameFeature";


const featureSymbol = {
    name: "eagleartillery",
    scale: 5,
    path: "Star.png",
    weight: [5],
    dontCluster: true,
    onlyAppearOnRoll: true,
    explodeEffect: "ARTILLERY_STRIKE",
    payouts: { 0: 0, 1: 0.01, 2: 0.05, 3: 0.1, 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15, 13: 16, 14: 17, 15: 18, 16: 19 },
}

export class EagleArtilleryFeature extends GameFeature {
    constructor(game) {
        super(game, "EAGLE_ARTILLERY", featureSymbol)
        this.targetAmount = 5
    }

    onGridPreProcess(grid, timeline) {
        const eaglePos = this.game.contain(this.id, grid);

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
            const j = Math.floor(this.game.random() * (i + 1));
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
        // 7. Calculate Cascade (Gravity filling the Eagle's hole)
        const replacements = this.game.generateReplacements(clustersToProcess, grid);
        const nextGrid = this.game.simulateCascade(grid, clustersToProcess, replacements);
        this.applyGrid(grid, nextGrid);
        timeline.push({
            type: 'CASCADE',
            clusters: clustersToProcess,
            replacements: replacements,
            grid: JSON.parse(JSON.stringify(nextGrid)),
            stepWin: 0,
            totalWin: timeline[timeline.length - 1]?.totalWin || 0
        });
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