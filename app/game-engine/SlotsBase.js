import { Assets, Sprite, Container, Graphics, Rectangle } from 'pixi.js';
import { Reel } from './Reel';

const DEFAULT_CONFIG = {
    width: 1280,
    height: 720,
    rows: 3,
    cols: 5,
    symbolWidth: 150,
    symbolHeight: 150,
    gapX: 10,
    gapY: 10,
    spinSpeed: 30,
    spinAcceleration: 5,
    spinDeacceleration: .15,
    staggerTime: 10,
    backgroundImage: null,
    symbolsBeforeStop: 200,
    clusterSize: 3,
    timeBeforeProcessingGrid: 500,
    motionBlurStrength: .3
};

export default class SlotsBase {
    constructor(rootContainer, app, config = {}) {
        this.stage = rootContainer;
        this.app = app;
        // Merge user config with defaults
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.grid = Array.from({ length: this.config.cols }, () =>
            Array.from({ length: this.config.rows }, () => 0)
        );
        this.reels = [];
        this.state = 'IDLE';
        this.timeSinceStart = 0;
        console.log(this.config)
        this.config.symbols = this.config.symbols.map((symbol, index) => {
            const fixedSymbol = symbol
            fixedSymbol.id = index
            fixedSymbol.baseWeight = fixedSymbol.weight
            fixedSymbol.landingEffect = symbol.landingEffect ? symbol.landingEffect : this.config.defaultLandingEffect
            fixedSymbol.matchEffect = symbol.matchEffect ? symbol.matchEffect : this.config.defaultMatchEffect
            fixedSymbol.explodeEffect = symbol.explodeEffect ? symbol.explodeEffect : this.config.defaultExplodeEffect
            if (fixedSymbol.path) return {
                ...fixedSymbol,
                path: (this.config.pathPrefix + fixedSymbol.path)
            }
            else return fixedSymbol
        });
        console.log(this.config.symbols)

        // Group for the reels to center them easily
        this.reelContainer = new Container();
        this.stage.addChild(this.reelContainer);

        // if (config.backgroundImage) {
        //     Assets.add({ alias: 'background', src: config.backgroundImage });

        //     Assets.load('background').then((texture) => {
        //         const backgroundSprite = new Sprite(texture);
        //         backgroundSprite.anchor.set(0)
        //         backgroundSprite.x = 0
        //         backgroundSprite.y = 0
        //         backgroundSprite.setSize(this.config.width, this.config.height)
        //         this.stage.addChildAt(backgroundSprite, 0); // Add as the first child
        //     })
        // }
    }

    async spin() {
        if (this.processing) return;
        this.processing = true;

        const timeline = this.calculateMoves();
        console.log("PREDICTED GAME FLOW:", timeline);

        this.grid = timeline[0].grid;
        await this.startSpin();

        for (let i = 1; i < timeline.length; i++) {
            await new Promise(r => setTimeout(r, this.config.timeBeforeProcessingGrid));
            const event = timeline[i];

            if (event.type === 'TRANSFORM') {
                await this.playTransformAnimation(event.changes);
            }
            else if (event.type === 'CASCADE') {
                await this.onCascadeEvent(event);
                await this.triggerMatchAnimations(event.clusters);
                await this.explodeAndCascade(event.clusters, event.replacements);
                this.grid = event.grid;
            }
        }
        this.processing = false;
        return this.grid
    }

    // Virtual Method: Defaults to resolve immediately
    async onCascadeEvent(event) {
        return Promise.resolve();
    }

    async playTransformAnimation(changes) {
        const promises = [];
        changes.forEach(change => {
            // We can insert directly because 'change' has {x, y, newId}
            // insertIntoGrid handles the visual promise
            promises.push(this.insertIntoGrid({ x: change.x, y: change.y }, change.newId));
        });
        await Promise.all(promises);
    }
    // Virtual Helper: Cascade
    // Replicates the logic: Remove Exploded -> Append New (Bottom Fill/Slide Up logic)
    simulateCascade(grid, clusters, replacements) {
        const nextGrid = [];

        for (let i = 0; i < this.config.cols; i++) {
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
            // This matches your frontend logic: `resolve([...filtered, ...idsReplace])`
            const newCol = [...filteredCol, ...newSymbols];

            nextGrid.push(newCol);
        }
        return nextGrid;
    }

    createGrid() {
        this.drawBackgroundCells();
        const totalWidth = (this.config.cols * this.config.symbolWidth) +
            ((this.config.cols - 1) * this.config.gapX);

        const totalHeight = (this.config.rows * this.config.symbolHeight) +
            ((this.config.rows - 1) * this.config.gapY)

        this.reelContainer.x = (this.config.width - totalWidth) / 2;
        this.reelContainer.y = (this.config.height - totalHeight) / 2;

        for (let i = 0; i < this.config.cols; i++) {
            const reel = new Reel(this.app, i, this.config, this);
            this.reels.push(reel);
            this.reelContainer.addChild(reel.container);
        }
        const mask = new Graphics();
        mask.rect(
            this.reelContainer.x,
            this.reelContainer.y,
            totalWidth,
            totalHeight
        );
        mask.fill(0x000000);
        this.reelContainer.mask = mask;
        this.stage.addChild(mask)
    }

    async startSpin() {
        const resultData = this.grid
        if (resultData.length !== this.config.cols || resultData.some(i => i.length !== this.config.rows)) {
            throw Error("Wrong structure of result data");
        }

        this.config.symbols.forEach(symbol => {
            if (symbol.anticipation) {
                this.applyAnticipation(symbol)
            }
        })

        this.state = 'SPINNING';
        this.timeSinceStart = 0;

        const spinPromises = this.reels.map((r, i) => {
            // this.bgContainer[i].forEach(i => i.clearBorder())
            // Return a new wrapper Promise that handles both delay + spin
            return new Promise((resolve) => {
                // a. Wait for the stagger delay
                setTimeout(() => {
                    // b. Start the spin and wait for it to finish
                    r.spin(resultData[i]).then(() => {
                        // this.config.symbols.forEach(symbol => {
                        //     if (symbol.anticipation) r.anticipation(symbol.id)
                        // })
                        resultData[i].forEach((symbolId, j) => {
                            // if (this.config.symbols[symbolId].anticipation) {
                            //     r.anticipation(symbolId)
                            // }
                            // if (symb == 9) {
                            //     this.bgContainer[i][this.config.rows - j - 1].border()

                            // }
                        })

                        // c. When reel finishes, resolve this specific reel's promise
                        resolve(resultData[i]);
                    });
                }, i * this.config.staggerTime);
            });
        });

        // 4. Return a master Promise that waits for ALL reels to finish
        return Promise.all(spinPromises).then((finalResults) => {
            this.state = 'IDLE'; // Automatically reset state when done
            this.reels.forEach(r => r.clearAnticipation())
            return finalResults; // Pass data to the .then() block
        });
    }

    update(delta) {
        this.reels.forEach(r => r.update(delta));
    }

    destroy() {
        this.stage.removeChildren();
    }

    async init() {
        // 1. Register all assets with Pixi
        const aliases = [];
        this.config.symbols.forEach(symbol => {
            if (symbol.textureAtLevel && Array.isArray(symbol.textureAtLevel)) {
                symbol.textureAtLevel.forEach((path, index) => {
                    const alias = `${symbol.name}_level_${index + 1}`;
                    Assets.add({ alias: alias, src: path });
                    aliases.push(alias);
                });
            }
            else if (symbol.path) {
                Assets.add({ alias: symbol.name, src: symbol.path });
                aliases.push(symbol.name);
            }
        });

        // 2. [NEW] Load Extra Game Assets (e.g. Hammer, UI elements)
        if (this.config.extraAssets) {
            this.config.extraAssets.forEach(asset => {
                Assets.add({ alias: asset.name, src: this.config.pathPrefix + asset.path });
                aliases.push(asset.name);
            });
        }

        // 2. WAIT for all assets to finish downloading (Critical Step)
        await Assets.load(aliases);

        this.config.symbols.forEach(symbol => {
            if (symbol.path) {
                symbol.texture = Assets.get(symbol.name);
            }
            else if (symbol.textureAtLevel) {
                symbol.texture = Assets.get(symbol.name + "_level_1")
            }
            // For multi-level symbols, we don't assign a default 'texture' property yet,
            // or we assign the first one as default.
        });

        // 4. Finally, build the visual grid
        this.createGrid();
    }

    // 3. NEW GENERIC ANTICIPATION METHOD
    applyAnticipation(symbol) {
        let foundCount = 0;

        this.reels.forEach((reel, index) => {
            const reelHasSymbol = this.grid[index].includes(symbol.id);

            // Standard Logic: Check previous reels to see if we should delay THIS one
            if (foundCount >= symbol.anticipation.after) {
                // Formula: Base delay + (extra delay * how many scatters we have)
                reel.symbolsBeforeStop = foundCount * symbol.anticipation.count;
                reel.forceVisible = true;
            } else {
                // Reset to default if no anticipation needed (important for repeated spins)
                reel.symbolsBeforeStop = this.config.symbolsBeforeStop
                reel.forceVisible = false;
            }
            if (reelHasSymbol) {
                foundCount += this.grid[index].filter(id => id === symbol.id).length;
            }
            // Increment count AFTER processing this reel 
            // (or before, depending on if you want the reel WITH the 3rd scatter to slow down)

        });
    }

    findClusters(grid) {
        if (!grid || grid.length === 0) return [];
        const rows = this.config.rows;
        const cols = this.config.cols;

        const visited = Array.from({ length: cols }, () => Array(rows).fill(false)); // [Col][Row]
        const clusters = [];

        const directions = [
            [0, 1],  // Down (y+1)
            [0, -1], // Up (y-1)
            [1, 0],  // Right (x+1)
            [-1, 0]  // Left (x-1)
        ];

        // Helper: c=Column(x), r=Row(y)
        function explore(c, r, targetValue, currentCluster) {
            // Boundary checks
            if (c < 0 || c >= cols || r < 0 || r >= rows) return;

            // Check if visited or value mismatch
            if (visited[c][r] || grid[c][r] !== targetValue) return;

            visited[c][r] = true;

            // X is Column, Y is Row
            currentCluster.push({ x: c, y: r, value: targetValue });

            for (const [dx, dy] of directions) {
                explore(c + dx, r + dy, targetValue, currentCluster);
            }
        }

        // FIXED LOOP ORDER: Iterate Cols (x) first, then Rows (y)
        // Because grid is defined as grid[x][y]
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                if (!visited[x][y]) {
                    const symbolId = grid[x][y];
                    const symbolConfig = this.config.symbols.find(s => s.id === symbolId);

                    if (symbolConfig && symbolConfig.dontCluster) {
                        visited[x][y] = true;
                        continue;
                    }

                    const currentCluster = [];
                    explore(x, y, symbolId, currentCluster);

                    if (currentCluster.length > 0) {
                        clusters.push(currentCluster);
                    }
                }
            }
        }
        const rawClusters = clusters.filter(cluster => {
            // Get the symbol ID from the first item in the cluster
            const symbolId = cluster[0].value;
            const symbolConfig = this.config.symbols.find(s => s.id === symbolId);

            // Determine the required size for THIS specific symbol
            // Fallback to global config if not defined
            const requiredSize = (symbolConfig && symbolConfig.clusterSize)
                ? symbolConfig.clusterSize
                : this.config.clusterSize;

            return cluster.length >= requiredSize;
        });
        // const rawClusters = clusters.filter(i => i.length >= this.config.clusterSize);

        // Convert to array of columns containing rows to explode
        const formattedClusters = Array.from({ length: cols }, () => []);
        rawClusters.flat().forEach(({ x, y }) => {
            // x is Column Index, y is Row Index
            formattedClusters[x].push(y);
        });

        if (formattedClusters.every(arr => arr.length === 0)) return [];
        return formattedClusters;
    }

    ggenerateRandomResult() {
        const tempGrid = Array.from({ length: this.config.cols }, () => []);

        for (let col = 0; col < this.config.cols; col++) {
            for (let row = 0; row < this.config.rows; row++) {
                // We pass 'tempGrid' (even if incomplete) to handle dynamic weights if needed
                const id = this.getRandomSymbolId({ firstSpin: true, gridToCheck: tempGrid, colIndex: col });
                tempGrid[col].push(id);
            }
        }
        return tempGrid;
    }

    generateRandomResult() {
        // 1. Initialize an empty grid structure (Col x Row) filled with null/undefined
        const tempGrid = Array.from({ length: this.config.cols }, () =>
            Array.from({ length: this.config.rows })
        );

        // 2. Create a list of all possible coordinates [ {c:0, r:0}, {c:0, r:1}, ... ]
        const coordinates = [];
        for (let c = 0; c < this.config.cols; c++) {
            for (let r = 0; r < this.config.rows; r++) {
                coordinates.push({ col: c, row: r });
            }
        }

        // 3. Shuffle the coordinates array (Fisher-Yates shuffle)
        for (let i = coordinates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [coordinates[i], coordinates[j]] = [coordinates[j], coordinates[i]];
        }

        // 4. Fill the grid using the random order
        coordinates.forEach(({ col, row }) => {
            // We pass the currently filling tempGrid. 
            // Note: Since we fill randomly, some neighbors might still be empty/undefined when checking weights.
            const id = this.getRandomSymbolId({
                firstSpin: true,
                gridToCheck: tempGrid,
                colIndex: col
            });

            tempGrid[col][row] = id;
        });

        return tempGrid;
    }

    generateReplacements(clusterData, gridToCheck) {
        return clusterData.map(colIndices => {
            if (!colIndices || colIndices.length === 0) return [];
            return Array.from(
                { length: colIndices.length },
                () => this.getRandomSymbolId({ firstSpin: false, gridToCheck: gridToCheck, colIndex: colIndices })
            )
        })
    }

    getRandomSymbolId({ firstSpin, gridToCheck = this.grid, selectFrom, colIndex } = {}) {
        let validSymbols = this.config.symbols
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
                const result = this.contain(symbol.id, gridToCheck)
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
        let randomNum = Math.random() * totalWeight;


        for (const symbol of validSymbols) {
            if (randomNum < getSymbolWeight(symbol)) {
                return symbol.id;
            }
            randomNum -= getSymbolWeight(symbol);
        }

        console.log("FUQQQ")
        return validSymbols[0].id;
    }

    getRandomCell() {
        return {
            row: Math.floor(Math.random() * rows),
            col: Math.floor(Math.random() * cols),
        }
    }

    async explodeAndCascade(clusters, replacements) {
        const grid = this.grid

        if (clusters.length === 0) {
            return false
        }
        const reel_promises = []
        for (let i = 0; i < this.reels.length; i++) {
            if (clusters[i]) {
                const res = this.reels[i].explodeAndCascade(clusters[i], replacements[i], grid[i])
                reel_promises.push(res)
            }
            else {
                reel_promises.push(grid[i])
            }
        }
        return await Promise.all(reel_promises);
    }

    drawBackgroundCells() {
        const bgContainer = new Container();

        this.bgContainer = []
        for (let i = 0; i < this.config.cols; i++) {
            this.bgContainer.push([])
            for (let j = 0; j < this.config.rows; j++) {
                const bg = new Graphics();
                const w = this.config.symbolWidth;
                const h = this.config.symbolHeight;

                // Calculate position exactly like the symbols
                const x = i * (w + this.config.gapX);
                const y = j * (h + this.config.gapY);

                // Styling: Darker version of your symbol background
                bg.x = x;
                bg.y = y;
                const renderState = (isActive) => {
                    bg.clear(); // 1. Wipe previous state

                    // 2. Define Shape & Fill (Always present)
                    bg.roundRect(0, 0, w, h, 15);
                    bg.fill({ color: 0x1a110d, alpha: 0.5 });

                    // 3. Define Border based on state
                    if (isActive) {
                        // Active: Thick Gold Border
                        bg.stroke({ width: 5, color: "gold", alpha: 1 });
                    } else {
                        // Idle: Faint Border
                        bg.stroke({ width: 2, color: 0xcfb972, alpha: 0.3 });
                    }
                };

                renderState(false)

                bg.border = () => {
                    renderState(true)
                }
                bg.clearBorder = () => {
                    renderState(false)
                }
                this.bgContainer[i].push(bg)
                bgContainer.addChild(bg);
            }
        }
        // Add to reelContainer so it centers automatically with the game
        this.reelContainer.addChild(bgContainer);
    }

    async insertIntoGrid(position, symbolId) {
        return new Promise(async (resolve) => {
            const col = position.x;
            const row = position.y;

            // 1. Capture the old value
            const hereBefore = this.grid[col][row];

            // 2. Update the Data Grid
            this.grid[col][row] = symbolId;

            // 3. Trigger Visual Update (and wait for it!)
            // We delegate the animation logic to the Reel class
            const reel = this.reels[col];
            if (reel) {
                // Pass the row index and the new ID
                await reel.animateSymbolReplacement(row, symbolId);
            }

            // 4. Resolve the promise returning the old value
            resolve(hereBefore);
        });
    }

    contain(id, gridToCheck = this.grid) {
        const positions = []
        for (let x = 0; x < this.config.cols; x++) {
            for (let y = 0; y < this.config.rows; y++) {
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

    simulateChangeSymbols(grid, toWhatId, selectFrom = []) {
        const moves = [];
        const positions = this.contain(toWhatId, grid);

        if (positions) {
            const newId = this.getRandomSymbolId({ firstSpin: false, gridToCheck: grid, selectFrom: selectFrom });
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

    setActiveGroupVariants(groupName, countToKeep) {
        // 1. Find all symbols belonging to this group
        const groupSymbols = this.config.symbols.filter(s => s.group === groupName);

        // 2. Shuffle them
        const shuffled = [...groupSymbols].sort(() => 0.5 - Math.random());

        // 3. Remap Weights
        groupSymbols.forEach(symbol => {
            if (shuffled.indexOf(symbol) < countToKeep) {
                // ACTIVE: Restore its original probability
                symbol.weight = symbol.baseWeight;
            } else {
                // INACTIVE: Set weight to 0. 
                // The randomizer will NEVER pick this, so the Reel never needs to load it.
                symbol.weight = 0;
            }
        });
    }

    async triggerMatchAnimations(clusters) {
        const promises = [];
        // clusters is an array of arrays: [[rowIdx, rowIdx], [], [rowIdx]...]
        for (let col = 0; col < this.config.cols; col++) {
            if (clusters[col] && clusters[col].length > 0) {
                // Tell the specific reel to play 'onMatch' for specific rows
                console.log(clusters)
                promises.push(this.reels[col].playMatchEffects(clusters[col]));
            }
        }
        // Wait for ALL reels to finish their win animations
        await Promise.all(promises);
    }
    // Helper: Get screen coordinates
    getSymbolGlobalPosition(col, row) {
        return {
            x: this.reels[col].container.x + (this.config.symbolWidth / 2),
            y: (row * (this.config.symbolHeight + this.config.gapY)) + (this.config.symbolHeight / 2)
        };
    }
}