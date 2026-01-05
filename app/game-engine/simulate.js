import ClashLines from "../ClashLines/ClashLines.js"
import ClashOfReels from "../ClashOfReels/ClashOfReels.js";
import { calculateMoves } from "./Math.js";
console.log("________ PLEASE ______")
const game = new ClashLines(null, null, { mode: 'simulation', });
// const game = new ClashOfReels(null, null, { mode: 'simulation', });

async function runSimulation() {
    console.log("Starting Simulation...");

    const TOTAL_SPINS = 100000;
    let totalWon = 0;


    // Stats Tracking
    let hitCount = 0;

    for (let i = 0; i < TOTAL_SPINS; i++) {
        const timeline = calculateMoves(game.engine, game.config.rows, game.config.cols, game.features, game.config.symbols);

        const finalEvent = timeline[timeline.length - 1];
        const win = finalEvent.totalWin || 0;

        totalWon += win;

        if (win > 0) hitCount++;

        // Optional: Progress Log every 10%
        if (i % (TOTAL_SPINS / 10) === 0) {
            console.log(`${i} spins... RTP: ${((totalWon / i) * 100).toFixed(2)}%`);
        }
    }

    // --- FINAL REPORT ---
    console.log("\nSIMULATION RESULTS");
    console.log("-----------------------");
    console.log(`Spins: \t\t${TOTAL_SPINS}`);
    console.log(`Total Won:\t${totalWon.toFixed()}`);
    console.log("-----------------------");
    console.log(`RTP:\t\t${((totalWon / TOTAL_SPINS) * 100).toFixed(2)}%`);
    console.log(`Winrate \t${((hitCount / TOTAL_SPINS) * 100).toFixed(2)}%`);
}

runSimulation();