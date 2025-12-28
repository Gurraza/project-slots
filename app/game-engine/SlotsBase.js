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
};

export default class SlotsBase {
    constructor(rootContainer, app, config = {}) {
        this.stage = rootContainer;
        this.app = app;

        // Merge user config with defaults
        this.config = { ...DEFAULT_CONFIG, ...config };

        this.reels = [];
        this.state = 'IDLE';
        this.timeSinceStart = 0;

        // Group for the reels to center them easily
        this.reelContainer = new Container();
        this.stage.addChild(this.reelContainer);

        if (config.backgroundImage) {
            Assets.add({ alias: 'background', src: config.backgroundImage });

            Assets.load('background').then((texture) => {
                const backgroundSprite = new Sprite(texture);
                backgroundSprite.anchor.set(0)
                backgroundSprite.x = 0
                backgroundSprite.y = 0
                backgroundSprite.setSize(this.config.width, this.config.height)
                this.stage.addChildAt(backgroundSprite, 0); // Add as the first child
            })

        }
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

    async startSpin(resultData) {
        if (resultData.length !== this.config.cols || resultData.some(i => i.length !== this.config.rows)) {
            throw Error("Wrong structure of result data");
        }

        this.state = 'SPINNING';
        this.timeSinceStart = 0;

        const spinPromises = this.reels.map((r, i) => {
            // Return a new wrapper Promise that handles both delay + spin
            return new Promise((resolve) => {
                // a. Wait for the stagger delay
                setTimeout(() => {
                    // b. Start the spin and wait for it to finish
                    r.spin(resultData[i]).then(() => {
                        // c. When reel finishes, resolve this specific reel's promise
                        resolve(resultData[i]);
                    });
                }, i * this.config.staggerTime);
            });
        });

        // 4. Return a master Promise that waits for ALL reels to finish
        return Promise.all(spinPromises).then((finalResults) => {
            this.state = 'IDLE'; // Automatically reset state when done
            return finalResults; // Pass data to the .then() block
        });
    }

    update(delta) {
        this.reels.forEach(r => r.update(delta));
    }

    destroy() {
        this.stage.removeChildren();
    }


    createSymbolWithBackground(baseTexture) {
        const w = this.config.symbolWidth;
        const h = this.config.symbolHeight;
        const container = new Container();
        const bg = new Graphics();
        bg.roundRect(0, 0, w, h, 15);
        bg.fill({ color: 0x2b1d14, alpha: 0.9 });
        bg.stroke({ width: 3, color: 0xcfb972 });
        container.addChild(bg);
        const sprite = new Sprite(baseTexture);
        sprite.anchor.set(0.5);
        sprite.x = w / 2;
        sprite.y = h / 2;
        const scale = Math.min(w / sprite.width, h / sprite.height) * .9;

        sprite.scale.set(scale);

        container.addChild(sprite);
        const newTexture = this.app.renderer.generateTexture({
            target: container,
            frame: new Rectangle(0, 0, w, h),
            resolution: 2,
        });
        container.destroy({ children: true });
        return newTexture;
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

        // 2. WAIT for all assets to finish downloading (Critical Step)
        await Assets.load(aliases);

        // 3. Now it is safe to retrieve and process them
        // this.config.symbols.forEach(symbol => {
        //     const rawTex = Assets.get(symbol.name);

        //     symbol.texture = rawTex //this.createSymbolWithBackground(rawTex);
        // });
        this.config.symbols.forEach(symbol => {
            if (symbol.path) {
                symbol.texture = Assets.get(symbol.name);
            }
            // For multi-level symbols, we don't assign a default 'texture' property yet,
            // or we assign the first one as default.
        });

        // 4. Finally, build the visual grid
        this.createGrid();
    }

    // 3. NEW GENERIC ANTICIPATION METHOD
    applyAnticipation(grid, symbol) {
        let foundCount = 0;

        this.reels.forEach((reel, index) => {
            const reelHasSymbol = grid[index].includes(symbol.id);
            if (reelHasSymbol) {
                foundCount += grid[index].filter(id => id === symbol.id).length;
            }
            // Standard Logic: Check previous reels to see if we should delay THIS one
            if (foundCount > symbol.anticipation.after) {
                // Formula: Base delay + (extra delay * how many scatters we have)
                reel.symbolsBeforeStop = foundCount * symbol.anticipation.count;
                console.log("asd")
            } else {
                // Reset to default if no anticipation needed (important for repeated spins)
                reel.symbolsBeforeStop = this.config.symbolsBeforeStop
            }

            // Increment count AFTER processing this reel 
            // (or before, depending on if you want the reel WITH the 3rd scatter to slow down)

        });
    }

    findClusters(grid) {
        // 1. Handle edge cases
        if (!grid || grid.length === 0) return [];
        console.log(grid)
        const rows = grid.length;
        const cols = grid[0].length;

        // 2. Create a 'visited' matrix to keep track of processed cells
        // We initialize it with false.
        const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
        const clusters = [];

        // 3. Define the directions for neighbors (Up, Down, Left, Right)
        // To include diagonals, add [1, 1], [-1, -1], etc. to this array.
        const directions = [
            [0, 1],  // Right
            [0, -1], // Left
            [1, 0],  // Down
            [-1, 0]  // Up
        ];

        // 4. Helper function to perform Depth-First Search
        function explore(r, c, targetValue, currentCluster) {
            // Boundary checks
            if (r < 0 || r >= rows || c < 0 || c >= cols) return;

            // Check if already visited or if value doesn't match
            if (visited[r][c] || grid[r][c] !== targetValue) return;

            // Mark as visited
            visited[r][c] = true;

            // Add to current cluster (Note: x is column index, y is row index)
            currentCluster.push({ x: r, y: c, value: targetValue });

            // Visit neighbors
            for (const [dr, dc] of directions) {
                explore(r + dr, c + dc, targetValue, currentCluster);
            }
        }

        // 5. Main loop to iterate over every cell
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // If we haven't visited this cell yet, it starts a new cluster
                if (!visited[y][x]) {
                    const currentCluster = [];
                    explore(y, x, grid[y][x], currentCluster);

                    // Only push non-empty clusters (safety check)
                    if (currentCluster.length > 0) {
                        clusters.push(currentCluster);
                    }
                }
            }
        }
        console.log(clusters & "found cluster")
        return clusters
            .filter(i => i.length >= this.config.clusterSize)
            .flat().reduce((acc, { x, y }) => {
                // Initialize the array at index x if it doesn't exist
                if (!acc[x]) acc[x] = [];

                // Push the value into the correct index bucket
                acc[x].push(y);

                return acc;
            }, []);
    }

    generateRandomResult() {
        return Array.from({ length: this.config.cols }, () =>
            Array.from({ length: this.config.rows }, () =>
                this.getRandomSymbolId()
            )
        );
    }

    generateReplacements(arr) {
        return [...arr].map(item => {
            if (item) {
                return Array.from(
                    { length: item.length },
                    () => this.getRandomSymbolId()
                )
            }
        })
    }

    getRandomSymbolId() {
        return Math.floor(Math.random() * (this.config.symbols.length - 1));
    }

    async explodeAndCascade(grid, clusters, replacements) {


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

        for (let i = 0; i < this.config.cols; i++) {
            for (let j = 0; j < this.config.rows; j++) {
                const bg = new Graphics();
                const w = this.config.symbolWidth;
                const h = this.config.symbolHeight;

                // Calculate position exactly like the symbols
                const x = i * (w + this.config.gapX);
                const y = j * (h + this.config.gapY);

                // Styling: Darker version of your symbol background
                bg.roundRect(0, 0, w, h, 15);
                bg.fill({ color: 0x1a110d, alpha: 0.5 }); // Dark semi-transparent fill
                bg.stroke({ width: 2, color: 0xcfb972, alpha: 0.3 }); // Faint gold border

                bg.x = x;
                bg.y = y;

                bgContainer.addChild(bg);
            }
        }

        // Add to reelContainer so it centers automatically with the game
        this.reelContainer.addChild(bgContainer);
    }

    insertInGrid(grid, symbol, amount) {
        const rows = this.config.rows
        const cols = this.config.cols

        // 1. Cap the amount so we don't try to fill more spots than exist
        // (Prevents infinite loops)
        const totalCells = rows * cols;
        const actualAmount = Math.min(amount, totalCells);

        // 2. Use a Set to track coordinates we have already touched
        const usedCoordinates = new Set();

        while (usedCoordinates.size < actualAmount) {
            // Generate random coordinates
            const r = Math.floor(Math.random() * rows);
            const c = Math.floor(Math.random() * cols);

            // Create a unique key for this position
            const key = `${r},${c}`;

            // 3. Only place the symbol if we haven't used this spot yet
            if (!usedCoordinates.has(key)) {
                usedCoordinates.add(key);
                grid[r][c] = symbol;
            }
        }

        return grid;
    }
}