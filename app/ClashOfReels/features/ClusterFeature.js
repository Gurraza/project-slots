import GameFeature from "@/app/game-engine/GameFeature";

export class ClusterEngineFeature extends GameFeature {
    constructor(game) {
        super(game, "CLUSTER_ENGINE");
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
        this.game.explode(grid, clustersToProcess, timeline, win)
        return true
    }
}