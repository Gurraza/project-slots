import GameFeature from "./GameFeature.ts";
import SlotsBase from "./SlotsBase.ts";
import { GameConfig, Grid, SymbolDef, TimelineEvent } from "./types.ts";
import { Point } from "./types.ts";

interface ClusterNode extends Point {
    value: number;
}

export class RandomEngine {
    public seed: number;
    public config: GameConfig
    public game: SlotsBase
    constructor(config: GameConfig, game: SlotsBase) {
        this.seed = Math.floor(Math.random() * 0xFFFFFFFF);
        this.config = config
        this.game = game
    }

    random(): number {
        this.seed += 0x6D2B79F5;
        let t = this.seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    setSeed(val: number): void {
        this.seed = val;
    }
}

export function calculateMoves(
    engine: RandomEngine,
    rows: number,
    cols: number,
    features: GameFeature[],
    allSymbols: SymbolDef[]
): TimelineEvent[] {
    const timeline: TimelineEvent[] = [];
    let currentGrid: Grid = generateRandomResult(engine, rows, cols, allSymbols);

    timeline.push({
        type: 'SPIN_START',
        grid: JSON.parse(JSON.stringify(currentGrid)), // Deep copy
        win: 0,
    });

    // 1. Hook: Right when spin is started
    features.forEach(f => f.onSpinStart(currentGrid));

    const MAX_CYCLES = 50;
    let cycles = 0;
    let lastGridState = "";
    while (cycles < MAX_CYCLES) {
        cycles++;
        if (cycles === MAX_CYCLES) {
            console.warn("Max cycles reached, breaking loop to save browser.");
            break;
        }
        const startState = JSON.stringify(currentGrid);
        let actionOccurred = false;
        // 2. Hook: Pre-Process
        for (const feature of features) {
            if (feature.onGridPreProcess(currentGrid, timeline)) {
                actionOccurred = true;
            }
        }
        const rawClusters = findClusters(currentGrid, allSymbols);

        if (rawClusters.length > 0) {
            // 3. Hook: Clusters Found
            features.forEach(f => {
                if (f.onClustersFound(rawClusters, currentGrid, timeline)) {
                    actionOccurred = true;
                }
            });

            // 4. Hook: Clusters Resolve
            features.forEach(f => {
                if (f.onClustersResolve(rawClusters, currentGrid, timeline)) {
                    actionOccurred = true;
                }
            });
        }
        //else {
        if (!actionOccurred) {
            // 5. Hook: Grid Idle
            for (const feature of features) {
                if (feature.onGridIdle(currentGrid, timeline)) {
                    actionOccurred = true;
                    break;
                }
            }
        }
        //}
        const endState = JSON.stringify(currentGrid);
        if (startState !== endState) {
            actionOccurred = true;
        }
        if (!actionOccurred) break;
    }

    // 6. Hook: When game is ended
    features.forEach(f => f.onSpinEnd(currentGrid, timeline));

    let totalWin = 0;
    timeline.forEach((event) => {
        event.previousWin = totalWin;
        totalWin += (event.win || 0);
        event.totalWin = totalWin;
    });

    return timeline;
}

export function generateRandomResult(
    engine: RandomEngine,
    rows: number,
    cols: number,
    allSymbols: SymbolDef[]
): Grid {
    engine.game.applyGroups();

    // 1. Initialize empty grid (cols x rows)
    // Note: In TS, we cast this as Grid, though it initially contains undefined holes
    const tempGrid: any[][] = Array.from({ length: cols }, () =>
        Array.from({ length: rows })
    );

    // 2. Create coordinates list
    const coordinates: { col: number; row: number }[] = [];
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            coordinates.push({ col: c, row: r });
        }
    }

    // 3. Fisher-Yates shuffle
    for (let i = coordinates.length - 1; i > 0; i--) {
        const j = Math.floor(engine.random() * (i + 1));
        [coordinates[i], coordinates[j]] = [coordinates[j], coordinates[i]];
    }

    // 4. Fill grid
    coordinates.forEach(({ col, row }) => {
        const id = getRandomSymbolId(engine, {
            firstSpin: true,
            gridToCheck: tempGrid,
            colIndex: col,
            allSymbols
        });
        tempGrid[col][row] = id;
    });

    return tempGrid as Grid;
}

interface RandomSymbolOptions {
    firstSpin?: boolean;
    gridToCheck?: any[][]; // Can contain undefined during generation
    selectFrom?: SymbolDef[];
    colIndex?: number;
    allSymbols: SymbolDef[];
}

export function getRandomSymbolId(
    engine: RandomEngine,
    { firstSpin = false, gridToCheck, selectFrom, colIndex, allSymbols }: RandomSymbolOptions
): number {

    let validSymbols = allSymbols;

    if (selectFrom && selectFrom.length > 0) {
        validSymbols = validSymbols.filter(s => selectFrom.some(ss => ss.id === s.id));
    } else if (!firstSpin) {
        validSymbols = validSymbols.filter(s => !s.onlyAppearOnRoll);
    }

    if (colIndex !== undefined && gridToCheck) {
        // Safe check for includes because gridToCheck might have empty slots
        const colData = gridToCheck[colIndex] || [];
        validSymbols = validSymbols.filter(symbol =>
            symbol.onePerReel ? !colData.includes(symbol.id) : true
        );
    }

    const getSymbolWeight = (symbol: SymbolDef): number => {
        if (Array.isArray(symbol.weight)) {
            // Need a grid to check dynamic weights
            if (!gridToCheck) return 0; // Fallback

            const result = contain(symbol.id, gridToCheck);
            const count = result ? result.length : 0;

            if (count >= symbol.weight.length) {
                return 0;
            }
            return symbol.weight[Math.min(symbol.weight.length - 1, count)];
        } else {
            return symbol.weight;
        }
    };

    const totalWeight = validSymbols.reduce((sum, symbol) => sum + getSymbolWeight(symbol), 0);
    let randomNum = engine.random() * totalWeight;

    for (const symbol of validSymbols) {
        const weight = getSymbolWeight(symbol);
        if (randomNum < weight) {
            return symbol.id;
        }
        randomNum -= weight;
    }

    console.warn("Weights exhausted, defaulting to first symbol");
    return validSymbols[0].id;
}

export function contain(id: number, gridToCheck: any[][]): Point[] {//| false {
    if (!gridToCheck) throw new Error("CONTAIN FUNCTION NEEDS A GRID TO CHECK");

    const positions: Point[] = [];
    for (let x = 0; x < gridToCheck.length; x++) {
        // Safety check if column exists
        if (!gridToCheck[x]) continue;

        for (let y = 0; y < gridToCheck[x].length; y++) {
            if (gridToCheck[x][y] == id) {
                positions.push({ x, y });
            }
        }
    }
    return positions //positions.length > 0 ? positions : false;
}

export function simulateCascade(
    grid: Grid,
    clusters: number[][], // Array of indices per column
    replacements: number[][] // Array of new IDs per column
): Grid {
    const nextGrid: Grid = [];

    for (let i = 0; i < grid.length; i++) {
        const col = grid[i];
        const explodedIndices = clusters[i] || [];
        const newSymbols = replacements[i] || [];

        if (explodedIndices.length === 0) {
            nextGrid.push([...col]);
            continue;
        }

        const filteredCol = col.filter((_, index) => !explodedIndices.includes(index));
        const newCol = [...filteredCol, ...newSymbols];

        nextGrid.push(newCol);
    }
    return nextGrid;
}

export function generateReplacements(
    engine: RandomEngine,
    clusterData: number[][], // Indices to replace per column
    gridToCheck: Grid,
    allSymbols: SymbolDef[]
): number[][] {
    return clusterData.map(colIndices => {
        if (!colIndices || colIndices.length === 0) return [];
        return Array.from(
            { length: colIndices.length },
            () => getRandomSymbolId(engine, {
                firstSpin: false,
                gridToCheck: gridToCheck, // Cast as any[][] if strictness issues arise
                colIndex: undefined, // Usually replacement doesn't check 'onePerReel' same way, but adjust if needed
                allSymbols
            })
        );
    });
}

export function findClusters(grid: Grid, symbols: SymbolDef[]): ClusterNode[][] {
    if (!grid || grid.length === 0) return [];
    const cols = grid.length;
    const rows = grid[0].length;

    const visited = Array.from({ length: cols }, () => Array(rows).fill(false));
    const clusters: ClusterNode[][] = [];

    const directions = [
        [0, 1], [0, -1], [1, 0], [-1, 0]
    ];

    // Helper to check for Wild
    const isWild = (id: number): boolean => {
        // FIX: In JS you did symbols[id], but if symbols is an Array, we need .find
        // If your 'symbols' is actually an object map { [id]: symbol }, change the type of symbols to Record<number, SymbolDef>
        const s = symbols.find(sym => sym.id === id);
        if (!s) return false;

        return s.name === 'wild'/* ||
            (!!s.matchesWith && (
                (Array.isArray(s.matchesWith) && (s.matchesWith.includes('*') || s.matchesWith.includes('ALL'))) ||
                s.matchesWith === '*' || s.matchesWith === 'ALL'
            ));*/
    };

    const areCompatible = (targetId: number, neighborId: number): boolean => {
        if (targetId === neighborId) return true;

        const sTarget = symbols.find(s => s.id === targetId);
        const sNeighbor = symbols.find(s => s.id === neighborId);

        if (!sTarget || !sNeighbor) return false;
        if (sTarget.dontCluster || sNeighbor.dontCluster) return false;

        const checkMatch = (source: SymbolDef, target: SymbolDef): boolean => {
            if (!source.matchesWith) return false;

            // const validTargets = Array.isArray(source.matchesWith)
            //     ? source.matchesWith
            //     : [source.matchesWith];
            const validTargets = source.matchesWith

            if (validTargets.includes('ALL') || validTargets.includes('*')) return true;
            return validTargets.includes(target.name);
        };

        return checkMatch(sTarget, sNeighbor) || checkMatch(sNeighbor, sTarget);
    };

    function explore(c: number, r: number, targetValue: number, currentCluster: ClusterNode[], localVisited: Set<string>) {
        if (c < 0 || c >= cols || r < 0 || r >= rows) return;
        if (visited[c][r] || localVisited.has(`${c},${r}`)) return;

        const currentId = grid[c][r];

        if (!areCompatible(targetValue, currentId)) return;

        localVisited.add(`${c},${r}`);
        currentCluster.push({ x: c, y: r, value: currentId });

        for (const [dx, dy] of directions) {
            explore(c + dx, r + dy, targetValue, currentCluster, localVisited);
        }
    }

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            if (!visited[x][y]) {
                const symbolId = grid[x][y];
                const symbolConfig = symbols.find(s => s.id === symbolId);

                if (!symbolConfig) continue;

                // --- SPECIAL WILD LOGIC ---
                if (isWild(symbolId)) {
                    let hasSpecificNeighbor = false;
                    for (const [dx, dy] of directions) {
                        const nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                            if (!visited[nx][ny] && !isWild(grid[nx][ny])) {
                                hasSpecificNeighbor = true;
                                break;
                            }
                        }
                    }
                    if (hasSpecificNeighbor) continue;
                }
                // --------------------------

                if (symbolConfig.dontCluster && symbolConfig.clusterSize !== 1) {
                    visited[x][y] = true;
                    continue;
                }

                const currentCluster: ClusterNode[] = [];
                const localVisited = new Set<string>();

                explore(x, y, symbolId, currentCluster, localVisited);

                const requiredSize = symbolConfig.clusterSize || 5;

                if (currentCluster.length >= requiredSize) {
                    clusters.push(currentCluster);
                    currentCluster.forEach(node => visited[node.x][node.y] = true);
                }
            }
        }
    }
    return clusters;
}

export function simulateChangeSymbols(
    engine: RandomEngine,
    grid: Grid,
    which: number,
    allSymbols: SymbolDef[]
): { x: number; y: number; newId: number }[] {
    const moves: { x: number; y: number; newId: number }[] = [];
    const positions = contain(which, grid);

    if (positions) {
        // NOTE: In your JS, 'selectFrom' variable was undefined. 
        // You likely intended to pass it as an argument or define it.
        // I have set it to undefined here to keep the code compiling.
        const selectFrom: SymbolDef[] | undefined = undefined;

        const newId = getRandomSymbolId(engine, {
            firstSpin: false,
            gridToCheck: grid,
            selectFrom,
            allSymbols
        });

        positions.forEach(pos => {
            moves.push({
                x: pos.x,
                y: pos.y,
                newId: newId
            });
        });
    }
    return moves;
}

export function explode(
    engine: RandomEngine,
    grid: Grid,
    where: number[][], // should update to point[]?
    timeline: TimelineEvent[],
    win: number,
    allSymbols: SymbolDef[]
): void {
    const replacements = generateReplacements(engine, where, grid, allSymbols);
    const newGrid = simulateCascade(grid, where, replacements);

    timeline.push({
        type: 'EXPLODE',
        clusters: where,
        replacements: replacements,
        grid: JSON.parse(JSON.stringify(newGrid)),
        win: win
    });

    // Mutate the original grid to match new state
    for (let i = 0; i < grid.length; i++) {
        grid[i] = [...newGrid[i]];
    }
}