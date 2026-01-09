import GameFeature from "../../game-engine/GameFeature"//"@/app/game-engine/GameFeature";
import { Graphics, Container } from "pixi.js"
import gsap from "gsap"
import SlotsBase from "../../game-engine/SlotsBase"
import { Grid, Timeline } from "../../game-engine/types"

interface Payline {
    path: number[]
    id: number
    color: number
}

export class PaylineFeature extends GameFeature {
    private graphics: Graphics
    private lineLayer: Container
    private paylines: Payline[]
    constructor(game: SlotsBase, paylines: number[][]) {
        super(game, "PAYLINES_FEATURE")
        this.paylines = paylines.map((path, i) => { return { path, id: i, color: 0x00FF00 } })
        if (game.config.mode !== "simulation") {
            this.lineLayer = new Container()
            this.graphics = new Graphics()
            game.reelContainer.addChild(this.lineLayer)
            this.lineLayer.zIndex = 500;
            this.game.reelContainer.addChild(this.lineLayer);
            this.lineLayer.addChild(this.graphics);
        }
    }

    onGridIdle(grid: Grid, timeline: Timeline) {
        const winningLines = [];
        let roundWin = 0;

        this.paylines.forEach(lineDef => {
            const result = this.checkLine(grid, lineDef.path, this.game.config.symbols);
            if (result.isWin) {
                winningLines.push({
                    lineId: lineDef.id,
                    coords: result.coords,
                    color: lineDef.color,
                    amount: result.payout,
                    symbol: result.symbol
                });
                roundWin += result.payout;
            }
        });

        if (winningLines.length > 0) {
            timeline.push({
                type: this.type,
                win: roundWin,
                lines: winningLines,
                grid: JSON.parse(JSON.stringify(grid))
            });
            return false;
        }

        return false;
    }

    async onCustomEvent(event) {
        this.ui.setMultiplier(event.totalWin);

        for (const line of event.lines) {
            const animationPromises = line.coords.map(pos => {
                this.game.reels[pos.x].sort()
                const sprite = this.game.reels[pos.x].symbols[pos.y + 1]; // Access sprite via Reel
                if (sprite) {
                    return this.game.handleSymbolMatch("DEFAULT_MATCH", sprite);
                }
            });
            await Promise.all(animationPromises)
            const fullLineDef = this.paylines.find(l => l.id === line.lineId);
            const fullPathCoords = fullLineDef.path.map((rowIdx, colIdx) => ({
                x: colIdx,
                y: rowIdx
            }));
            await this.drawLine(fullPathCoords, line.color, line.coords.length);
            // await this.drawLine(line.coords, line.color);
        }
        // 4. Cleanup
        this.graphics.clear();
    }

    // --- THE MATH HELPER ---
    checkLine(grid, path, symbols) {
        let matchCount = 0;
        let currentSymbolId = null;
        let isWildLine = true;
        let coords = [];

        // Loop columns 0 to 4
        for (let col = 0; col < grid.length; col++) {
            const row = path[col];

            // Safety check
            if (!grid[col] || grid[col][row] === undefined) break;

            const symbolId = grid[col][row];
            const symbolConfig = symbols.find(s => s.id === symbolId);

            // Identify Wild (Using your engine's logic or simple name check)
            const isWild = symbolConfig.name === "wild" || (symbolConfig.matchesWith && symbolConfig.matchesWith.includes("*"));

            if (col === 0) {
                // First Reel: Establish the baseline
                currentSymbolId = symbolId;
                if (!isWild) isWildLine = false;
                matchCount = 1;
                coords.push({ x: col, y: row });
            } else {
                // Subsequent Reels
                const currentConfig = symbols.find(s => s.id === currentSymbolId);

                if (isWild) {
                    // Wild extends anything
                    matchCount++;
                    coords.push({ x: col, y: row });
                } else if (isWildLine) {
                    // We were only wilds so far, now we hit a real symbol. 
                    // This real symbol becomes the target.
                    currentSymbolId = symbolId;
                    isWildLine = false;
                    matchCount++;
                    coords.push({ x: col, y: row });
                } else if (symbolId === currentSymbolId || (currentConfig.matchesWith && currentConfig.matchesWith.includes(symbolConfig.name))) {
                    // Direct Match
                    matchCount++;
                    coords.push({ x: col, y: row });
                } else {
                    // Match Broken
                    break;
                }
            }
        }

        // Check Payouts
        // Note: We need to lookup payout for 'currentSymbolId'. 
        // If the whole line was Wilds, we pay the Wild price.
        const payoutSymbol = symbols.find(s => s.id === currentSymbolId);

        // IMPORTANT: Your SYMBOLS config needs payouts for 3, 4, and 5.
        if (matchCount >= 3 && payoutSymbol.payouts && payoutSymbol.payouts[matchCount]) {
            return {
                isWin: true,
                payout: payoutSymbol.payouts[matchCount], // Adjust multiplier as needed
                coords: coords,
                symbol: payoutSymbol.name
            };
        }

        return { isWin: false, payout: 0 };
    }

    drawLine(coords, color, winLength): Promise<void> {
        const g = this.graphics;
        const { symbolWidth, symbolHeight, gapX, gapY, rows } = this.game.config;

        // Helper to map grid coordinates to screen pixels
        const getCenter = (c, r) => {
            const flippedRow = (rows - 1) - r;
            return {
                x: c * (symbolWidth + gapX) + symbolWidth / 2,
                y: flippedRow * (symbolHeight + gapY) + symbolHeight / 2
            };
        };

        const points = coords.map(c => getCenter(c.x, c.y));

        // We track progress from 0 (start) to 5 (end of reel 5)
        const state = { progress: 0 };
        const totalPoints = points.length;

        const redraw = () => {
            g.clear();

            // Calculate how far the line currently extends
            // e.g., if progress is 0.5, we are halfway through
            const currentMaxLength = (totalPoints - 1) * state.progress;

            // --- SEGMENT 1: THE WINNING PART (High Opacity) ---
            g.moveTo(points[0].x, points[0].y);

            // Determine where the "Win" segment stops
            // It stops at either the current animation frame OR the winLength, whichever is smaller.
            const winLimit = Math.min(currentMaxLength, winLength - 1);

            // Draw points for the win
            for (let i = 1; i <= Math.floor(winLimit); i++) {
                g.lineTo(points[i].x, points[i].y);
            }

            // Draw partial segment if between points (smooth animation)
            if (winLimit > Math.floor(winLimit)) {
                const i = Math.floor(winLimit);
                const part = winLimit - i;
                const a = points[i];
                const b = points[i + 1];
                g.lineTo(a.x + (b.x - a.x) * part, a.y + (b.y - a.y) * part);
            }

            // STROKE 1: Bright Color
            g.stroke({ width: 10, color, alpha: 1.0, cap: "round", join: "round" });


            // --- SEGMENT 2: THE REST (Low Opacity) ---
            // Only draw if the animation has gone PAST the winning segment
            if (currentMaxLength > winLength - 1) {

                // Start exactly where the win ended
                const startNodeIndex = winLength - 1;
                g.moveTo(points[startNodeIndex].x, points[startNodeIndex].y);

                const lossLimit = currentMaxLength;

                // Draw from the win boundary to the current animation tip
                for (let i = startNodeIndex + 1; i <= Math.floor(lossLimit); i++) {
                    g.lineTo(points[i].x, points[i].y);
                }

                // Draw partial segment for the loss part
                if (lossLimit > Math.floor(lossLimit)) {
                    const i = Math.floor(lossLimit);
                    const part = lossLimit - i;
                    const a = points[i];
                    const b = points[i + 1];
                    g.lineTo(a.x + (b.x - a.x) * part, a.y + (b.y - a.y) * part);
                }

                // STROKE 2: Faded Color
                g.stroke({ width: 10, color, alpha: 0.3, cap: "round", join: "round" });
            }
        };

        return new Promise(resolve => {
            gsap.to(state, {
                progress: 1,
                duration: 0.7,
                ease: "power1.inOut",
                onUpdate: redraw,
                onComplete: async () => {
                    await new Promise(r => setTimeout(r, 400));
                    g.clear()
                    resolve()
                }
            });
        });
    }
}