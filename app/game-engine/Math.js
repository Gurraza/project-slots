export class RandomEngine {
    constructor(config, game) {
        this.game = game
        console.log(this.game)

        this.config = config;
        this.seed = Math.floor(Math.random() * 0xFFFFFFFF);
    }

    random() {
        this.seed += 0x6D2B79F5;
        let t = this.seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    setSeed(val) {
        this.seed = val;
    }
}

export function calculateMoves(engine, rows, cols, features, allSymbols) {
    const timeline = [];
    let currentGrid = generateRandomResult(engine, rows, cols, allSymbols);

    timeline.push({
        type: 'SPIN_START',
        grid: JSON.parse(JSON.stringify(currentGrid)),
        win: 0,
    });

    // 1. Hook: Right when spin is started
    features.forEach(f => f.onSpinStart(currentGrid));

    const MAX_CYCLES = 50
    let cycles = 0
    while (cycles < MAX_CYCLES) {
        cycles++
        if (cycles == MAX_CYCLES) {
            console.warn("Max cycles reached, breaking loop to save browser.");
            break;
        }
        let actionOccurred = false;

        // 2. Hook: Pre-Process (Clan Castle)
        for (const feature of features) {
            if (feature.onGridPreProcess(currentGrid, timeline)) {
                actionOccurred = true;
            }
        }

        const rawClusters = findClusters(currentGrid, allSymbols);
        if (rawClusters.length > 0) {
            // 3. Hook: Clusters Found (Super Troops)
            features.forEach(f => {
                if (f.onClustersFound(rawClusters, currentGrid, timeline)) {
                    actionOccurred = true
                }
            });

            // 4. Hook: Clusters Found (Super Troops)
            features.forEach(f => {
                if (f.onClustersResolve(rawClusters, currentGrid, timeline)) {
                    actionOccurred = true
                }
            });
        }
        else {
            // 5. Hook: Grid Idle (The Warden) Only runs if no clusters were found
            for (const feature of features) {
                if (feature.onGridIdle(currentGrid, timeline)) {
                    actionOccurred = true;
                    break;
                }
            }
        }
        if (!actionOccurred) break;
    }

    // 6. Hook: When game is ended
    features.forEach(f => f.onSpinEnd(currentGrid, timeline));

    let totalWin = 0
    timeline.forEach((event, index) => {
        event.previousWin = totalWin
        totalWin += (event.win || 0)
        event.totalWin = totalWin
    });
    return timeline
}

export function generateRandomResult(engine, rows, cols, allSymbols) {
    engine.game.applyGroups()
    // 1. Initialize an empty grid structure (Col x Row) filled with null/undefined
    const tempGrid = Array.from({ length: cols }, () =>
        Array.from({ length: rows })
    );

    // 2. Create a list of all possible coordinates [ {c:0, r:0}, {c:0, r:1}, ... ]
    const coordinates = [];
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            coordinates.push({ col: c, row: r });
        }
    }

    // 3. Shuffle the coordinates array (Fisher-Yates shuffle)
    for (let i = coordinates.length - 1; i > 0; i--) {
        const j = Math.floor(engine.random() * (i + 1));
        [coordinates[i], coordinates[j]] = [coordinates[j], coordinates[i]];
    }

    // 4. Fill the grid using the random order
    coordinates.forEach(({ col, row }) => {
        // We pass the currently filling tempGrid. 
        // Note: Since we fill randomly, some neighbors might still be empty/undefined when checking weights.
        const id = getRandomSymbolId(engine, {
            firstSpin: true,
            gridToCheck: tempGrid,
            colIndex: col,
            allSymbols
        });
        tempGrid[col][row] = id;
    });

    return tempGrid;
}

export function getRandomSymbolId(engine, { firstSpin, gridToCheck, selectFrom, colIndex, allSymbols } = {}) {
    let validSymbols = allSymbols
    if (selectFrom && selectFrom.length > 0) {
        validSymbols = validSymbols.filter(s => selectFrom.some(ss => ss.id == s.id))
    }
    else if (!firstSpin) {
        validSymbols = validSymbols.filter(s => !s.onlyAppearOnRoll);
    }
    if (colIndex !== undefined) {
        validSymbols = validSymbols.filter(symbol => symbol.onePerReel ? !gridToCheck[colIndex].includes(symbol.id) : true)
    }

    const getSymbolWeight = (symbol) => {
        if (Array.isArray(symbol.weight)) {
            const result = contain(symbol.id, gridToCheck)
            const count = result ? result.length : 0
            if (count >= symbol.weight.length) {
                return 0
            }
            return symbol.weight[Math.min(symbol.weight.length - 1, count)]
        }
        else {
            return symbol.weight
        }
    }

    const totalWeight = validSymbols.reduce((sum, symbol) => sum + getSymbolWeight(symbol), 0);
    let randomNum = engine.random() * totalWeight;


    for (const symbol of validSymbols) {
        if (randomNum < getSymbolWeight(symbol)) {
            return symbol.id;
        }
        randomNum -= getSymbolWeight(symbol);
    }

    console.log("FUQQQ")
    return validSymbols[0].id;
}

export function contain(id, gridToCheck) {
    if (!gridToCheck) throw Error("CONTAIN FUNCTION NEEDS A GRID TO CHECK")
    const positions = []
    for (let x = 0; x < gridToCheck.length; x++) {
        for (let y = 0; y < gridToCheck[x].length; y++) {
            if (gridToCheck[x][y] == id) {
                positions.push({
                    x,
                    y
                })
            }
        }
    }
    return positions.length > 0 ? positions : false
}

export function simulateCascade(grid, clusters, replacements) {
    const nextGrid = [];

    for (let i = 0; i < grid.length; i++) {
        const col = grid[i];
        const explodedIndices = clusters[i] || [];
        const newSymbols = replacements[i] || [];

        if (explodedIndices.length === 0) {
            nextGrid.push([...col]);
            continue;
        }

        // 1. Filter out exploded items (Pure JS version of your Reel logic)
        const filteredCol = col.filter((_, index) => !explodedIndices.includes(index));

        // 2. Combine: [Existing Items] + [New Items]
        const newCol = [...filteredCol, ...newSymbols];

        nextGrid.push(newCol);
    }
    return nextGrid;
}

export function generateReplacements(engine, clusterData, gridToCheck, allSymbols) {
    return clusterData.map(colIndices => {
        if (!colIndices || colIndices.length === 0) return [];
        return Array.from(
            { length: colIndices.length },
            () => getRandomSymbolId(engine, { firstSpin: false, gridToCheck: gridToCheck, colIndex: colIndices, allSymbols })
        )
    })
}

export function findClusters(grid, symbols) {
    if (!grid || grid.length === 0) return [];
    const cols = grid.length
    const rows = grid[0].length

    const visited = Array.from({ length: cols }, () => Array(rows).fill(false));
    const clusters = [];

    const directions = [
        [0, 1], [0, -1], [1, 0], [-1, 0]
    ];

    // Hjälpfunktion för att se om en symbol är en Wild
    const isWild = (id) => {
        const s = symbols[id];
        // Kollar om namnet är 'wild' ELLER om den matchar med '*'
        return s.name === 'wild' || (s.matchesWith && (s.matchesWith.includes('*') || s.matchesWith.includes('ALL')));
    };

    const areCompatible = (targetId, neighborId) => {
        if (targetId === neighborId) return true;

        const sTarget = symbols[targetId]; // Symbolen vi letar efter (t.ex. Barbarian)
        const sNeighbor = symbols[neighborId]; // Grannen vi kollar (t.ex. Wild)

        if (sTarget.dontCluster || sNeighbor.dontCluster) return false;

        // Kollar om grannen kan agera som målet
        const checkMatch = (source, target) => {
            if (!source.matchesWith) return false;
            const validTargets = Array.isArray(source.matchesWith) ? source.matchesWith : [source.matchesWith];
            if (validTargets.includes('ALL') || validTargets.includes('*')) return true;
            return validTargets.includes(target.name);
        };

        // VIKTIGT: Vi kollar BÅDA hållen. 
        // Är Barbarian ok med Wild? ELLER Är Wild ok med Barbarian?
        return checkMatch(sTarget, sNeighbor) || checkMatch(sNeighbor, sTarget);
    };

    function explore(c, r, targetValue, currentCluster, localVisited) {
        if (c < 0 || c >= cols || r < 0 || r >= rows) return;
        if (visited[c][r] || localVisited.has(`${c},${r}`)) return;

        const currentId = grid[c][r];

        // Om vi letar efter Barbarians, och hittar en Archer -> Stopp.
        // Om vi letar efter Barbarians, och hittar en Wild -> Kör på!
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

                // --- NY LOGIK HÄR ---
                // Om vi står på en Wild, kolla om den har "riktiga" grannar (icke-wilds).
                // Om den har det, HOPPAR VI ÖVER ATT STARTA HÄR.
                // Vi låter den "riktiga" grannen (t.ex. Barbarian) starta sökningen när loopen kommer dit.
                if (isWild(symbolId)) {
                    let hasSpecificNeighbor = false;
                    for (const [dx, dy] of directions) {
                        const nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                            // Om grannen inte är visited OCH inte är Wild -> Då väntar vi på den!
                            if (!visited[nx][ny] && !isWild(grid[nx][ny])) {
                                hasSpecificNeighbor = true;
                                break;
                            }
                        }
                    }
                    if (hasSpecificNeighbor) continue; // Skip! Låt Barbarian hitta denna Wild senare.
                }
                // --------------------

                const symbolConfig = symbols[symbolId];
                if (symbolConfig && symbolConfig.dontCluster && !(symbolConfig.clusterSize === 1)) {
                    visited[x][y] = true;
                    continue;
                }

                const currentCluster = [];
                const localVisited = new Set();

                // Starta sökningen med nuvarande symbol som "MÅL"
                explore(x, y, symbolId, currentCluster, localVisited);

                // Samma logik som förut för att godkänna klustret
                const requiredSize = symbolConfig.clusterSize//(symbolConfig && symbolConfig.clusterSize) ? symbolConfig.clusterSize : 5//() => { console.log("find cluster function"); return 5 }//thais.config.clusterSize;

                if (currentCluster.length >= requiredSize) {
                    clusters.push(currentCluster);
                    // Lås dem globalt så ingen annan kan ta dem
                    currentCluster.forEach(node => visited[node.x][node.y] = true);
                }
            }
        }
    }
    return clusters;
}

export function simulateChangeSymbols(engine, grid, which, allSymbols) {
    const moves = [];
    const positions = contain(which, grid);

    if (positions) {
        const newId = getRandomSymbolId(engine, { firstSpin: false, gridToCheck: grid, selectFrom: selectFrom, allSymbols });
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

export function explode(engine, grid, where, timeline, win, allSymbols) {
    const replacements = generateReplacements(engine, where, grid, allSymbols);
    const newGrid = simulateCascade(grid, where, replacements);

    timeline.push({
        type: 'EXPLODE',
        clusters: where,
        replacements: replacements,
        grid: JSON.parse(JSON.stringify(newGrid)),
        win: win
    });
    for (let i = 0; i < grid.length; i++) {
        grid[i] = [...newGrid[i]];
    }
}
