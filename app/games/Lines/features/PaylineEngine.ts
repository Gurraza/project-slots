import GameFeature from "../../../game-engine/GameFeature.ts"
import { Graphics, Container, Text } from "pixi.js"
import gsap from "gsap"
import SlotsBase from "../../../game-engine/SlotsBase.ts"
import { Grid, Position, SymbolDef, Timeline } from "../../../game-engine/types.ts"
import { getPos } from "../../../game-engine/UI.ts"


interface Payline {
    path: number[]
    id: number
    color: number
}

export class PaylineEngine extends GameFeature {
    private graphics: Graphics
    private lineLayer: Container
    private paylines: Payline[]
    private bottomText: Text;
    constructor(game: SlotsBase, winningsPosition: Position, paylines: number[][]) {
        super(game, "PAYLINES_FEATURE", null)
        // distinct colors for lines
        const colors = [
            0xFF0000, // Red
            0x00FF00, // Green
            0x0000FF, // Blue
            0xFFFF00, // Yellow
            0xFF00FF, // Magenta
            0x00FFFF, // Cyan
            0xFFA500, // Orange
            0x800080, // Purple
            0xFFC0CB, // Pink
            0xFFD700, // Gold
            0xA52A2A, // Brown
            0x008080, // Teal
            0x800000, // Maroon
            0x000080, // Navy
            0x808000, // Olive
            0xC0C0C0, // Silver
        ];

        this.paylines = paylines.map((path, i) => {
            return {
                path,
                id: i,
                // Cycle through colors based on index
                color: colors[i % colors.length]
            }
        })
        if (game.config.mode !== "simulation") {
            this.lineLayer = new Container()
            this.graphics = new Graphics()
            game.reelContainer.addChild(this.lineLayer)
            this.lineLayer.zIndex = 500;
            this.game.reelContainer.addChild(this.lineLayer);
            this.lineLayer.addChild(this.graphics);
            const textPos = getPos(winningsPosition, this.config)
            this.bottomText = new Text({
                text: "",
                x: textPos.x,
                y: textPos.y,
                style: {
                    fontSize: 24,
                    fill: 0xffffff
                }
            })
            this.stage.addChild(this.bottomText)
        }
    }

    onSpinStart(grid: Grid): boolean {
        this.bottomText.text = ""
        return false
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
        const aPromise = []
        for (const line of event.lines) {
            aPromise.push(line.coords.map(pos => {
                const sprite = this.game.getSymbol(pos.x, pos.y)
                console.log(pos)
                return this.game.handleSymbolMatch("DEFAULT_MATCH", sprite);
            }))
            aPromise.push(this.drawPayline(line.lineId, line.coords.length))
        }
        this.bottomText.text = "Total Win: $" + event.totalWin.toFixed(2)
        await Promise.all(aPromise)
        this.graphics.clear();
        if (event.lines.length > 1) {
            for (const line of event.lines) {
                const animationPromises = line.coords.map(pos => {

                    const sprite = this.game.getSymbol(pos.x, pos.y)
                    return this.game.handleSymbolMatch("DEFAULT_MATCH", sprite);
                });
                this.bottomText.text = "Line " + line.lineId + " Wins $" + line.amount.toFixed(2)
                await Promise.all(animationPromises)
                await this.drawPayline(line.lineId, line.coords.length);            // await this.drawLine(fullPathCoords, line.color, line.coords.length);
            }
        }
        this.bottomText.text = "Total Win: $" + event.totalWin.toFixed(2)
    }

    async drawPayline(index: number, len: number): Promise<void> {
        const lineDef = this.paylines.find(l => l.id === index);
        if (!lineDef) {
            console.error(`Payline ID ${index} not found.`);
            return;
        }

        const { symbolWidth, symbolHeight, gapX, gapY, rows } = this.game.config;
        const g = new Graphics();
        this.lineLayer.addChild(g);

        // 1. Convert logical path to screen coordinates
        const points = lineDef.path.map((rowIdx, colIdx) => {
            // Adjust based on your specific coordinate system (0 at top or bottom)
            const visualRow = (rows - 1) - rowIdx;
            return {
                x: colIdx * (symbolWidth + gapX) + symbolWidth / 2,
                y: visualRow * (symbolHeight + gapY) + symbolHeight / 2
            };
        });

        const state = { progress: 0 };
        const totalPoints = points.length;

        return new Promise(resolve => {
            gsap.to(state, {
                progress: 1,
                duration: 0.8,
                ease: "power2.out",
                onUpdate: () => {
                    g.clear();

                    // Total length of the line in terms of point-segments
                    const currentDrawHead = (totalPoints - 1) * state.progress;

                    // --- DRAW WINNING SEGMENT (High Opacity) ---
                    g.beginPath();
                    g.moveTo(points[0].x, points[0].y);

                    // Cap the winning line at 'len' or current animation progress
                    const winLimit = Math.min(currentDrawHead, len - 1);

                    for (let i = 1; i <= Math.floor(winLimit); i++) {
                        g.lineTo(points[i].x, points[i].y);
                    }

                    // Interpolate tip of winning line
                    if (winLimit > Math.floor(winLimit)) {
                        const i = Math.floor(winLimit);
                        const fraction = winLimit - i;
                        const p1 = points[i];
                        const p2 = points[i + 1];
                        g.lineTo(
                            p1.x + (p2.x - p1.x) * fraction,
                            p1.y + (p2.y - p1.y) * fraction
                        );
                    }
                    g.stroke({ width: 10, color: lineDef.color, alpha: 1.0, cap: "round", join: "round" });

                    // --- DRAW REMAINING SEGMENT (Low Opacity) ---
                    // Only draw if animation extends past the winning length
                    if (currentDrawHead > len - 1) {
                        g.beginPath();
                        const startIdx = len - 1;
                        g.moveTo(points[startIdx].x, points[startIdx].y);

                        const lossLimit = currentDrawHead;

                        for (let i = startIdx + 1; i <= Math.floor(lossLimit); i++) {
                            g.lineTo(points[i].x, points[i].y);
                        }

                        if (lossLimit > Math.floor(lossLimit)) {
                            const i = Math.floor(lossLimit);
                            const fraction = lossLimit - i;
                            const p1 = points[i];
                            const p2 = points[i + 1];
                            g.lineTo(
                                p1.x + (p2.x - p1.x) * fraction,
                                p1.y + (p2.y - p1.y) * fraction
                            );
                        }
                        g.stroke({ width: 10, color: lineDef.color, alpha: 0.3, cap: "round", join: "round" });
                    }
                },
                onComplete: async () => {
                    // Hold for 400ms then clear
                    await new Promise(r => setTimeout(r, 400));
                    g.destroy(); // Cleanup the temporary graphics object
                    resolve();
                }
            });
        });
    }

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
        if (matchCount >= 3) {
            return {
                isWin: true,
                payout: getCorrectPayout(symbols, this.config.symbols)[matchCount],
                coords: coords,
                symbol: payoutSymbol.name
            };
        }

        return { isWin: false, payout: 0 };
    }
}

/**
 * Calculates the correct payout table for a winning line.
 * @param lineSymbols - Array of SymbolDefs in the winning line
 * @param allSymbols - The master list of symbols (game.config.symbols)
 */
function getCorrectPayout(lineSymbols: SymbolDef[], allSymbols: SymbolDef[]) {
    // 1. Filter out Wilds to check the actual base symbols
    const nonWilds = lineSymbols.filter(s => s.name !== "wild");

    // Edge Case: Line is 5 Wilds (usually pays as top symbol or specific wild pay)
    if (nonWilds.length === 0) {
        return lineSymbols[0].payouts;
    }

    const firstSymbol = nonWilds[0];

    // 2. Check Purity: Are all non-wild symbols identical?
    const isPureMatch = nonWilds.every(s => s.name === firstSymbol.name);

    if (isPureMatch) {
        // Case: BAR1 + BAR1 + WILD -> Pays as BAR1
        return firstSymbol.payouts;
    } else {
        // Case: BAR1 + BAR2 + WILD -> Mixed Match
        // Detect if this is a Bar mix or another mix (if you have multiple mix groups)
        const isBarMix = nonWilds.every(s => ["bar1", "bar2", "bar3"].includes(s.name));

        if (isBarMix) {
            return allSymbols.find(s => s.name === "mixed_bar")?.payouts;
        }

        // Fallback for other mixed groups if they exist
        return firstSymbol.payouts;
    }
}