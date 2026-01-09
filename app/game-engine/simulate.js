import ClashLines from "../ClashLines/ClashLines.js"
import ClashOfReels from "../ClashOfReels/ClashOfReels.js";
import { calculateMoves } from "./Math.ts";

const game = new ClashLines(null, null, { mode: 'simulation', });
// const game = new ClashOfReels(null, null, { mode: 'simulation', });
async function runSimulation() {
    console.log("Starting Simulation...");

    const TOTAL_SPINS = 100000;

    // --- METRICS ---
    let totalWon = 0;
    let hitCount = 0;
    let maxWin = 0;
    let sumSquaredWins = 0; // Needed for Standard Deviation

    // Win Buckets (Distribution)
    const distribution = {
        zero: 0,
        tiny: 0,   // > 0 but < 1 (Loss disguised as win)
        small: 0,  // 1x - 5x
        medium: 0, // 5x - 20x
        big: 0,    // 20x - 100x
        huge: 0,   // 100x - 1000x
        mega: 0    // 1000x+
    };

    const startTime = performance.now();

    for (let i = 0; i < TOTAL_SPINS; i++) {
        // Run the game engine
        const timeline = calculateMoves(game.engine, game.config.rows, game.config.cols, game.features, game.config.symbols);

        const finalEvent = timeline[timeline.length - 1];
        const win = finalEvent.totalWin || 0;

        // 1. Basic Sums
        totalWon += win;
        sumSquaredWins += (win * win);

        // 2. Max Win Check
        if (win > maxWin) maxWin = win;

        // 3. Hit Frequency & Distribution
        if (win > 0) {
            hitCount++;

            // Categorize the win (Assuming Bet = 1 for simplicity in simulation)
            // If your engine uses a bet variable, divide win by bet here: const xBet = win / bet;
            const xBet = win;

            if (xBet < 1) distribution.tiny++;
            else if (xBet < 5) distribution.small++;
            else if (xBet < 20) distribution.medium++;
            else if (xBet < 100) distribution.big++;
            else if (xBet < 1000) distribution.huge++;
            else distribution.mega++;
        } else {
            distribution.zero++;
        }

        // Progress Log (optimized to not spam console)
        if (i > 0 && i % (TOTAL_SPINS / 10) === 0) {
            const currentRTP = ((totalWon / i) * 100).toFixed(2);
            console.log(`${i} spins... RTP: ${currentRTP}%`);
        }
    }

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // --- MATH CALCULATIONS ---
    const avgWin = totalWon / TOTAL_SPINS;
    // Variance Formula: E[X^2] - (E[X])^2
    const variance = (sumSquaredWins / TOTAL_SPINS) - (avgWin * avgWin);
    const stdDev = Math.sqrt(variance);

    // 95% Confidence Interval for RTP
    // margin of error = 1.96 * (stdDev / sqrt(n))
    const marginError = 1.96 * (stdDev / Math.sqrt(TOTAL_SPINS));
    const rtp = (avgWin * 100);

    // --- FINAL REPORT ---
    console.log("\n========================================");
    console.log("       SIMULATION RESULTS REPORT        ");
    console.log("========================================");
    console.log(`Simulated Spins:   ${TOTAL_SPINS.toLocaleString()}`);
    console.log(`Time Elapsed:      ${duration}s`);
    console.log("----------------------------------------");
    console.log(`TOTAL RTP:         ${rtp.toFixed(2)}%`);
    console.log(`Confidence (95%):  +/- ${(marginError * 100).toFixed(2)}%`);
    console.log(`Volatility (SD):   ${stdDev.toFixed(2)}`);
    console.log("----------------------------------------");
    console.log(`Hit Frequency:     ${((hitCount / TOTAL_SPINS) * 100).toFixed(2)}%`);
    console.log(`Max Win:           ${maxWin.toFixed(2)}x`);
    console.log(`Avg Win (on hit):  ${(totalWon / hitCount).toFixed(2)}x`);
    console.log("----------------------------------------");
    console.log("WIN DISTRIBUTION (Buckets):");
    console.log(`  Zero (0x):       ${distribution.zero} (${(distribution.zero / TOTAL_SPINS * 100).toFixed(1)}%)`);
    console.log(`  Tiny (<1x):      ${distribution.tiny} (${(distribution.tiny / TOTAL_SPINS * 100).toFixed(2)}%)`);
    console.log(`  Small (1-5x):    ${distribution.small} (${(distribution.small / TOTAL_SPINS * 100).toFixed(2)}%)`);
    console.log(`  Med (5-20x):     ${distribution.medium} (${(distribution.medium / TOTAL_SPINS * 100).toFixed(2)}%)`);
    console.log(`  Big (20-100x):   ${distribution.big} (${(distribution.big / TOTAL_SPINS * 100).toFixed(3)}%)`);
    console.log(`  Huge (100-1k):   ${distribution.huge} (${(distribution.huge / TOTAL_SPINS * 100).toFixed(4)}%)`);
    console.log(`  Mega (1k+):      ${distribution.mega} (${(distribution.mega / TOTAL_SPINS * 100).toFixed(5)}%)`);
    console.log("========================================\n");
}
async function rrunSimulation() {
    console.log("Starting Simulation...");

    const TOTAL_SPINS = 1000000;
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