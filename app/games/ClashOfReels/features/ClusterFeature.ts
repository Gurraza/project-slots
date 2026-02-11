import GameFeature from "../../../game-engine/GameFeature.ts"
import { explode } from "../../../game-engine/Math.ts"
import SlotsBase from "../../../game-engine/SlotsBase.ts";

export class ClusterEngineFeature extends GameFeature {
    constructor(game: SlotsBase) {
        super(game, "CLUSTER_ENGINE", null);
    }

    onClustersFound(clusters, grid, timeline) {
        let win = 0
        // --- 3. CALCULATE PAYOUTS ---
        clusters.forEach(cluster => { // [{x: 2, y: 4, value: 6}]
            const baseNode = cluster.find(node => !this.config.symbols[node.value].isSuper);
            const payoutId = baseNode ? baseNode.value : cluster[0].value;
            const config = this.config.symbols[payoutId];
            const count = cluster.length;

            if (config.payouts && !config.dontCluster) {
                let payout = config.payouts[count];
                if (payout === undefined) {
                    const maxKey = Math.max(...Object.keys(config.payouts).map(Number));
                    if (count > maxKey) payout = config.payouts[maxKey];
                }
                if (payout) win += payout;
            }
        });
        const clustersToProcess = Array.from({ length: this.config.cols }, () => []);
        clusters.flat().forEach(({ x, y }) => {
            if (!clustersToProcess[x].includes(y)) {
                clustersToProcess[x].push(y);
            }
        });
        explode(this.engine, grid, clustersToProcess, timeline, win, this.config.symbols)
        return true
    }
}