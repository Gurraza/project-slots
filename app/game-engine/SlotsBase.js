import { Assets, Sprite, Container, Graphics, Filter, GlProgram, Text, ColorMatrixFilter } from 'pixi.js';
import { Reel } from './Reel';
import gsap from "gsap"

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
        this.seed = Math.floor(Math.random() * 0xFFFFFFFF); // Default random seed
        // Merge user config with defaults
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.grid = Array.from({ length: this.config.cols }, () =>
            Array.from({ length: this.config.rows }, () => 0)
        );
        this.reels = [];
        this.state = 'IDLE';
        this.timeSinceStart = 0;
        console.log("CONFIG", this.config)
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
        console.log("SYMBOLS", this.config.symbols)

        // Group for the reels to center them easily
        this.reelContainer = new Container();
        this.stage.addChild(this.reelContainer);
        this.createUI()

        this.initialGrid = this.generateRandomResult()
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

        this.setMultiplier(0); // Visual update hook
        const timeline = this.calculateMoves();

        console.log("PREDICTED PAYOUT:", timeline[timeline.length - 1].totalWin || 0);
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
                await this.triggerMatchAnimations(event.clusters);
                await this.onCascadeEvent(event);
                await this.explodeAndCascade(event.clusters, event.replacements);

                if (event.totalWin > 0) {
                    this.setMultiplier(event.totalWin);
                }
                this.grid = event.grid;
            }
            else {
                await this.onCustomEvent(event)
            }
        }
        this.processing = false;
        return { grid: this.grid, timeline: timeline }
    }


    createUI() {
        // REPLACE the old this.multiplierText logic with this:
        this.multiplierContainer = new Container();
        this.multiplierContainer.visible = false;

        // Position logic (same as before)
        this.multiplierContainer.x = this.config.isMobile ? this.config.width / 2 : 1100;
        this.multiplierContainer.y = this.config.isMobile ? (this.config.height / 2 - this.config.rows * this.config.symbolHeight / 2 - 50) : 100;

        this.stage.addChild(this.multiplierContainer);
        // this.multiplierText = new Text({
        //     text: "0",
        //     style: {
        //         fontFamily: this.config.font.family,
        //         fontSize: this.config.font.size,
        //         fill: this.config.font.fill,
        //         stroke: this.config.font.stroke,//{ color: "black", width: 4 }, // Updated v8 syntax
        //         dropShadow: this.config.font.dropShadow,//true
        //     }
        // });
        // this.multiplierText.visible = false
        // this.multiplierText.anchor.set(0.5);
        // this.multiplierText.x = this.config.isMobile ? this.config.width / 2 : 1100; // Right side of screen
        // this.multiplierText.y = this.config.isMobile ? (this.config.height / 2 - this.config.rows * this.config.symbolHeight / 2 - 50) : 100;
        // this.stage.addChild(this.multiplierText);

        Assets.load('/games/ClashOfReels/title.png').then((texture) => {
            const centerX = this.config.width / 2;
            const posY = this.config.isMobile ? 120 : 30;
            // Shadow Settings
            const shadowOffset = 5; // How far the shadow moves (px)
            const shadowAlpha = 0.5; // How dark the shadow is (0 to 1)
            const scale = this.config.isMobile ? .8 : .3
            // A. Create the Shadow Sprite FIRST (so it's behind)
            // We reuse the same texture so it has the exact same shape.
            const shadow = new Sprite(texture);
            shadow.anchor.set(0.5);
            // Offset position slightly to the bottom-right
            shadow.x = centerX + shadowOffset;
            shadow.y = posY + shadowOffset;
            // Make it look like a shadow
            shadow.tint = 0x000000; // Turn the whole image black
            shadow.alpha = shadowAlpha; // Make it semi-transparent
            this.stage.addChild(shadow);


            // B. Create the Main Title Sprite directly on top
            this.title = new Sprite(texture);
            this.title.anchor.set(0.5);
            this.title.x = centerX;
            this.title.y = posY;
            this.title.scale = scale
            shadow.scale = scale
            this.stage.addChild(this.title);
        });

    }

    setMultiplier(newVal) {
        this.globalMultiplier = newVal;
        if (!this.multiplierContainer) return;

        if (newVal === 0) {
            this.multiplierContainer.visible = false;
            return;
        }

        this.multiplierContainer.visible = true;
        this.multiplierContainer.removeChildren();

        const formattedVal = Number(newVal).toFixed(2);
        const textString = `x${formattedVal}`;

        let currentX = 0;

        // --- CONFIGURATION ---
        const targetHeight = 50; // px. Similar to fontSize. Adjust this if too big/small!
        const spacing = -7;      // px. Squeeze letters closer together.
        // ---------------------

        for (let i = 0; i < textString.length; i++) {
            const char = textString[i];
            let textureAlias = null;

            if (char === '.') textureAlias = 'num_dot';
            else if (char === 'x') textureAlias = 'num_x';
            else if (!isNaN(char)) textureAlias = `num_${char}`;

            if (textureAlias && Assets.get(textureAlias)) {
                const texture = Assets.get(textureAlias);
                const sprite = new Sprite(texture);

                // 1. Calculate Scale based on desired height
                // This ensures it fits regardless of how big the original PNG is
                const scale = targetHeight / texture.height;
                sprite.scale.set(scale);

                sprite.x = currentX;
                sprite.anchor.set(0, 1); // Anchor bottom-left to align baseline

                this.multiplierContainer.addChild(sprite);

                // 2. Advance X cursor based on the SCALED width
                currentX += (sprite.width + spacing);
            }
        }

        // 3. Re-center the container
        // We set the pivot to the center of the newly created text block
        this.multiplierContainer.pivot.set(this.multiplierContainer.width / 2, -targetHeight / 2);

        // 4. Pop Animation
        gsap.fromTo(this.multiplierContainer.scale,
            { x: 1.5, y: 1.5 },
            { x: 1, y: 1, duration: 0.5, ease: "elastic.out(1, 0.3)" }
        );
    }

    // Override the hook from SlotsBase
    ssetMultiplier(newVal) {
        this.globalMultiplier = newVal
        if (!this.multiplierText) return;
        if (newVal === 0) {
            this.multiplierText.visible = false
        }
        else {
            this.multiplierText.visible = true
        }
        // Animate the change
        const formattedVal = Number(newVal).toFixed(2);

        // Animate the change
        this.multiplierText.text = `x${formattedVal}`;

        // Pop effect
        gsap.fromTo(this.multiplierText.scale,
            { x: 1.5, y: 1.5 },
            { x: 1, y: 1, duration: 0.5, ease: "elastic.out(1, 0.3)" }
        );
    }

    // Virtual Method: Defaults to resolve immediately
    async onCascadeEvent(event) {
        return Promise.resolve();
    }
    async onCustomEvent(event) {
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

            if (symbol.videoPath) {
                const videoAlias = symbol.name + "_anim";
                // Pixi V8 Assets automatically detects .mp4
                Assets.add({ alias: videoAlias, src: this.config.pathPrefix + symbol.videoPath });
                aliases.push(videoAlias);
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

            // --- THIS IS THE PART THAT MAKES REEL.JS WORK ---
            if (foundCount >= symbol.anticipation.after && index < this.config.cols - 1) {
                reel.shouldTriggerAnticipation = true; // <--- The Flag
                reel.anticipationSymbolId = symbol.id; // <--- The ID
            } else {
                reel.shouldTriggerAnticipation = false;
                reel.anticipationSymbolId = null;
            }
            // Increment count AFTER processing this reel 
            // (or before, depending on if you want the reel WITH the 3rd scatter to slow down)

        });
    }
    findClusters(grid) {
        if (!grid || grid.length === 0) return [];
        const rows = this.config.rows;
        const cols = this.config.cols;

        const visited = Array.from({ length: cols }, () => Array(rows).fill(false));
        const clusters = [];

        const directions = [
            [0, 1], [0, -1], [1, 0], [-1, 0]
        ];

        // Hjälpfunktion för att se om en symbol är en Wild
        const isWild = (id) => {
            const s = this.config.symbols[id];
            // Kollar om namnet är 'wild' ELLER om den matchar med '*'
            return s.name === 'wild' || (s.matchesWith && (s.matchesWith.includes('*') || s.matchesWith.includes('ALL')));
        };

        const areCompatible = (targetId, neighborId) => {
            if (targetId === neighborId) return true;

            const sTarget = this.config.symbols[targetId]; // Symbolen vi letar efter (t.ex. Barbarian)
            const sNeighbor = this.config.symbols[neighborId]; // Grannen vi kollar (t.ex. Wild)

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

                    const symbolConfig = this.config.symbols[symbolId];
                    if (symbolConfig && symbolConfig.dontCluster && !(symbolConfig.clusterSize === 1)) {
                        visited[x][y] = true;
                        continue;
                    }

                    const currentCluster = [];
                    const localVisited = new Set();

                    // Starta sökningen med nuvarande symbol som "MÅL"
                    explore(x, y, symbolId, currentCluster, localVisited);

                    // Samma logik som förut för att godkänna klustret
                    const requiredSize = (symbolConfig && symbolConfig.clusterSize) ? symbolConfig.clusterSize : this.config.clusterSize;

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
    ffindClusters(grid) {
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

        const areCompatible = (id1, id2) => {
            if (id1 === id2) return true;

            const s1 = this.config.symbols[id1];
            const s2 = this.config.symbols[id2];

            if (s1.dontCluster || s2.dontCluster) return false;

            // Helper to check one-way compatibility (Does A match B?)
            const checkMatch = (source, target) => {
                if (!source.matchesWith) return false;

                // Ensure it's treated as an array even if defined as a string
                const validTargets = Array.isArray(source.matchesWith)
                    ? source.matchesWith
                    : [source.matchesWith];

                // 1. Check for Wildcard "ALL" or "*"
                if (validTargets.includes('ALL') || validTargets.includes('*')) return true;

                // 2. Check for specific Target Name
                return validTargets.includes(target.name);
            };

            // Return TRUE if S1 acts as a wild for S2 OR if S2 acts as a wild for S1
            return checkMatch(s1, s2) || checkMatch(s2, s1);
        };

        // Helper: c=Column(x), r=Row(y)
        function explore(c, r, targetValue, currentCluster, localVisited) {
            // Boundary checks
            if (c < 0 || c >= cols || r < 0 || r >= rows) return;

            // Check if visited or value mismatch
            if (visited[c][r] || localVisited.has(`${c},${r}`)) return;

            // UPDATED CHECK: Use compatibility instead of strict equality
            const currentId = grid[c][r];
            if (!areCompatible(targetValue, currentId)) return;


            visited[c][r] = true;
            // localVisited.add(`${c},${r}`);
            // X is Column, Y is Row
            currentCluster.push({ x: c, y: r, value: currentId });

            for (const [dx, dy] of directions) {
                explore(c + dx, r + dy, targetValue, currentCluster, localVisited);
            }
        }

        // FIXED LOOP ORDER: Iterate Cols (x) first, then Rows (y)
        // Because grid is defined as grid[x][y]
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                if (!visited[x][y]) {
                    const symbolId = grid[x][y];
                    const symbolConfig = this.config.symbols.find(s => s.id === symbolId);

                    if (symbolConfig && symbolConfig.dontCluster && !(symbolConfig && symbolConfig.clusterSize === 1)) {
                        visited[x][y] = true;
                        continue;
                    }

                    const currentCluster = [];
                    const localVisited = new Set();
                    explore(x, y, symbolId, currentCluster, localVisited);
                    const requiredSize = (symbolConfig && symbolConfig.clusterSize)
                        ? symbolConfig.clusterSize
                        : this.config.clusterSize;

                    // if (currentCluster.length >= requiredSize) {
                    //     // 5. IT IS A WINNER! NOW we mark them as visited globally.
                    //     // This prevents other clusters from using them.
                    //     clusters.push(currentCluster);

                    //     currentCluster.forEach(node => {
                    //         visited[node.x][node.y] = true;
                    //     });
                    // }
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
        // const formattedClusters = Array.from({ length: cols }, () => []);
        // rawClusters.flat().forEach(({ x, y }) => {
        //     // x is Column Index, y is Row Index
        //     formattedClusters[x].push(y);
        // });

        // if (formattedClusters.every(arr => arr.length === 0)) return [];
        // return formattedClusters;
        return rawClusters
    }

    applyGroups() {
        this.config.groups.forEach(group => {
            this.setActiveGroupVariants(group.name, group.count)
        })
    }

    /**
     * @returns {number[][]} A 2-D array of numeric ids.
     */
    generateRandomResult() {
        this.applyGroups()
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
            const j = Math.floor(this.random() * (i + 1));
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
        let randomNum = this.random() * totalWeight;


        for (const symbol of validSymbols) {
            if (randomNum < getSymbolWeight(symbol)) {
                return symbol.id;
            }
            randomNum -= getSymbolWeight(symbol);
        }

        console.log("FUQQQ")
        return validSymbols[0].id;
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
        // CONFIGURATION
        const cellScale = 0.85; // 85% of the symbol size (Adjust this to make them smaller/larger)
        const cornerRadius = 20; // Slightly larger radius often looks smoother
        const strokeWidth = 5
        this.bgContainer = []
        const grayFilter = new ColorMatrixFilter()
        grayFilter.grayscale(0)
        for (let i = 0; i < this.config.cols; i++) {
            this.bgContainer.push([])
            for (let j = 0; j < this.config.rows; j++) {

                const bg = new Sprite()
                bg.texture = Assets.get("rage_spell_background")
                const x = i * (this.config.symbolWidth + this.config.gapX)
                const y = j * (this.config.symbolHeight + this.config.gapY)
                const w = this.config.symbolWidth
                const h = this.config.symbolHeight
                bg.alpha = .7
                bg.x = x
                bg.y = y
                bg.width = w
                bg.height = h
                bg.filters = [grayFilter];
                const mask = new Graphics()
                    .roundRect(0, 0, w, h, 15)
                    .fill("white")
                mask.x = x
                mask.y = y
                bg.mask = mask
                this.bgContainer[i].push(bg)
                bgContainer.addChild(bg);
                bgContainer.addChild(mask)
                /*
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
                        bg.stroke({ width: 3, color: 0xcfb972, alpha: 0.3, alignment: 1 });
                    }
                };

                renderState(false)

                bg.border = () => {
                    renderState(true)
                }
                bg.clearBorder = () => {
                    renderState(false)
                }
                */

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

    simulateChangeSymbols(grid, which, selectFrom = []) {
        const moves = [];
        const positions = this.contain(which, grid);

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
        const shuffled = [...groupSymbols].sort(() => 0.5 - this.random());

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

    // Helper to check grid without looping manually every time
    gridContainsSymbol(grid, name) {
        const targetId = this.config.symbols.find(s => s.name === name).id;
        return grid.flat().includes(targetId);
    }
    async playSymbolVideo(targetSprite, videoAlias) {
        return new Promise((resolve) => {
            if (!Assets.get(videoAlias)) {
                console.warn(`Video alias ${videoAlias} not found`);
                resolve();
                return;
            }

            const videoTexture = Assets.get(videoAlias);
            const videoSource = videoTexture.source;
            const videoElement = videoSource.resource;
            videoElement.playbackRate = this.config.symbols[targetSprite.symbolId].playbackRate || 1

            // 1. Wait for dimensions to load so we can calculate the 10px cut
            if (videoTexture.width === 0 || videoTexture.height === 0) {
                const onLoaded = () => {
                    videoElement.removeEventListener('loadedmetadata', onLoaded);
                    this.playSymbolVideo(targetSprite, videoAlias).then(resolve);
                };
                videoElement.addEventListener('loadedmetadata', onLoaded);
                return;
            }

            // --- CALCULATE PIXEL CUT ---
            const pixelsToCut = 10; // <--- CHANGE THIS VALUE TO CUT MORE/LESS
            const trimX = pixelsToCut / videoTexture.width;
            const trimY = pixelsToCut / videoTexture.height;

            videoTexture.source.style.addressMode = 'clamp-to-edge';

            videoElement.loop = false;
            videoElement.currentTime = 0;

            const videoSprite = new Sprite(videoTexture);
            videoSprite.blendMode = 'normal';

            const vertex = `
                in vec2 aPosition;
                out vec2 vTextureCoord;
                uniform vec4 uInputSize;
                uniform vec4 uOutputFrame;
                uniform vec4 uOutputTexture;

                vec4 filterVertexPosition( void ) {
                    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
                    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
                    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
                    return vec4(position, 0.0, 1.0);
                }

                vec2 filterTextureCoord( void ) {
                    return aPosition * (uOutputFrame.zw * uInputSize.zw);
                }

                void main(void) {
                    gl_Position = filterVertexPosition();
                    vTextureCoord = filterTextureCoord();
                }
            `;

            // --- UPDATED FRAGMENT SHADER ---
            const fragment = `
                in vec2 vTextureCoord;
                uniform sampler2D uTexture; 
                uniform float uThreshold; 
                uniform float uSoftness;
                
                // Changed from float to vec2 to handle width/height differences
                uniform vec2 uTrim; 

                void main(void) {
                    // --- 1. EDGE TRIM LOGIC (Based on Pixels) ---
                    if (vTextureCoord.x < uTrim.x || vTextureCoord.x > (1.0 - uTrim.x) ||
                        vTextureCoord.y < uTrim.y || vTextureCoord.y > (1.0 - uTrim.y)) {
                        gl_FragColor = vec4(0.0); // Full transparent
                        return; 
                    }

                    // --- 2. CHROMA KEY LOGIC ---
                    vec4 color = texture(uTexture, vTextureCoord);
                    vec3 target = vec3(1.0, 1.0, 1.0);
                    float dist = distance(color.rgb, target);
                    float alpha = smoothstep(uThreshold, uThreshold + uSoftness, dist);
                    
                    gl_FragColor = vec4(color.rgb * alpha, color.a * alpha);
                }
            `;

            const removeWhiteFilter = new Filter({
                glProgram: new GlProgram({ vertex, fragment }),
                resources: {
                    uniforms: {
                        uThreshold: { value: 0.15, type: 'f32' },
                        uSoftness: { value: 0.05, type: 'f32' },
                        // Pass the calculated X and Y trim values
                        uTrim: { value: { x: trimX, y: trimY }, type: 'vec2<f32>' }
                    },
                },
            });

            videoSprite.filters = [removeWhiteFilter];

            // Standard positioning logic...
            videoSprite.anchor.set(0.5);
            const globalPos = targetSprite.getGlobalPosition();
            const localPos = this.stage.toLocal(globalPos);
            videoSprite.x = localPos.x;
            videoSprite.y = localPos.y;

            const symbolConfig = this.config.symbols.find(s => s.id === targetSprite.symbolId);
            const baseConfigScale = symbolConfig ? symbolConfig.scale : 1;
            const ratioY = this.config.symbolHeight / videoTexture.height;
            const finalScale = ratioY * baseConfigScale;
            videoSprite.scale.set(finalScale);

            this.stage.addChild(videoSprite);
            targetSprite.alpha = 0;

            const onComplete = () => {
                if (videoSprite.destroyed) return;
                videoSprite.destroy();
                if (targetSprite && !targetSprite.destroyed) targetSprite.alpha = 1;
                resolve();
            };

            videoSource.autoPlay = true;
            const durationSafe = (videoElement.duration && isFinite(videoElement.duration)) ? videoElement.duration : 2;
            const safetyTimeout = setTimeout(onComplete, (durationSafe * 1000) + 500);

            videoElement.onended = () => {
                clearTimeout(safetyTimeout);
                onComplete();
            };

            videoElement.play().catch(e => {
                onComplete();
            });
        });
    }
    async aplaySymbolVideo(targetSprite, videoAlias) {
        return new Promise((resolve) => {
            if (!Assets.get(videoAlias)) {
                console.warn(`Video alias ${videoAlias} not found`);
                resolve();
                return;
            }

            const videoTexture = Assets.get(videoAlias);
            const videoSource = videoTexture.source;
            const videoElement = videoSource.resource;
            videoElement.playbackRate = this.config.symbols[targetSprite.symbolId].playbackRate || 1

            if (videoTexture.width === 0 || videoTexture.height === 0) {
                const onLoaded = () => {
                    videoElement.removeEventListener('loadedmetadata', onLoaded);
                    this.playSymbolVideo(targetSprite, videoAlias).then(resolve);
                };
                videoElement.addEventListener('loadedmetadata', onLoaded);
                return;
            }

            // --- OPTIONAL: IMPROVE TEXTURE SAMPLING ---
            // This tells WebGL not to try and smooth pixels at the very edge 
            // by wrapping around to the other side. It helps, but might not be enough alone.
            videoTexture.source.style.addressMode = 'clamp-to-edge';
            // ------------------------------------------

            videoElement.loop = false;
            videoElement.currentTime = 0;

            const videoSprite = new Sprite(videoTexture);
            videoSprite.blendMode = 'normal';

            // --- SHADER SETUP ---
            const vertex = `
                in vec2 aPosition;
                out vec2 vTextureCoord;
                uniform vec4 uInputSize;
                uniform vec4 uOutputFrame;
                uniform vec4 uOutputTexture;

                vec4 filterVertexPosition( void ) {
                    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
                    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
                    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
                    return vec4(position, 0.0, 1.0);
                }

                vec2 filterTextureCoord( void ) {
                    return aPosition * (uOutputFrame.zw * uInputSize.zw);
                }

                void main(void) {
                    gl_Position = filterVertexPosition();
                    vTextureCoord = filterTextureCoord();
                }
            `;

            const fragment = `
                in vec2 vTextureCoord;
                uniform sampler2D uTexture; 
                uniform float uThreshold; 
                uniform float uSoftness;
                // NEW: Uniform to define edge trim amount (0.0 to 1.0)
                uniform float uEdgeTrim; 

                void main(void) {
                    // --- 1. EDGE TRIM LOGIC ---
                    // Check if current pixel UV coordinate is too close to the edge.
                    // If it is, set to transparent immediately.
                    if (vTextureCoord.x < uEdgeTrim || vTextureCoord.x > (1.0 - uEdgeTrim) ||
                        vTextureCoord.y < uEdgeTrim || vTextureCoord.y > (1.0 - uEdgeTrim)) {
                        gl_FragColor = vec4(0.0); // Full transparent
                        return; // Stop processing this pixel
                    }

                    // --- 2. CHROMA KEY LOGIC ---
                    vec4 color = texture(uTexture, vTextureCoord);
                    vec3 target = vec3(1.0, 1.0, 1.0);
                    float dist = distance(color.rgb, target);
                    float alpha = smoothstep(uThreshold, uThreshold + uSoftness, dist);
                    
                    // Premultiplied Alpha fix from previous step
                    gl_FragColor = vec4(color.rgb * alpha, color.a * alpha);
                }
            `;

            const removeWhiteFilter = new Filter({
                glProgram: new GlProgram({ vertex, fragment }),
                resources: {
                    uniforms: {
                        uThreshold: { value: 0.15, type: 'f32' },
                        uSoftness: { value: 0.05, type: 'f32' },
                        // NEW: Start with 1% trim (0.01). 
                        // Increase to 0.02 or 0.03 if the border persists.
                        uEdgeTrim: { value: 0.015, type: 'f32' }
                    },
                },
            });

            videoSprite.filters = [removeWhiteFilter];
            // ---------------------

            videoSprite.anchor.set(0.5);
            const globalPos = targetSprite.getGlobalPosition();
            const localPos = this.stage.toLocal(globalPos);
            videoSprite.x = localPos.x;
            videoSprite.y = localPos.y;

            const symbolConfig = this.config.symbols.find(s => s.id === targetSprite.symbolId);
            const baseConfigScale = symbolConfig ? symbolConfig.scale : 1;
            const ratioY = this.config.symbolHeight / videoTexture.height;
            const finalScale = ratioY * baseConfigScale;
            videoSprite.scale.set(finalScale);

            this.stage.addChild(videoSprite);
            targetSprite.alpha = 0;

            const onComplete = () => {
                if (videoSprite.destroyed) return;
                videoSprite.destroy();
                if (targetSprite && !targetSprite.destroyed) targetSprite.alpha = 1;
                resolve();
            };

            videoSource.autoPlay = true;
            const durationSafe = (videoElement.duration && isFinite(videoElement.duration)) ? videoElement.duration : 2;
            const safetyTimeout = setTimeout(onComplete, (durationSafe * 1000) + 500);

            videoElement.onended = () => {
                clearTimeout(safetyTimeout);
                onComplete();
            };

            videoElement.play().catch(e => {
                onComplete();
            });
        });
    }

    random() {
        this.seed += 0x6D2B79F5;
        let t = this.seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    // 3. Helper to set a specific seed manually
    setSeed(val) {
        this.seed = val;
    }
}