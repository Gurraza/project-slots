import { Assets, Sprite, Container, Graphics, Filter, GlProgram, Text, ColorMatrixFilter } from 'pixi.js';
import { Reel } from './Reel';
import gsap from "gsap"
import { UI } from './UI';
const DEFAULT_CONFIG = {}

export default class SlotsBase {
    constructor(rootContainer, app, config = {}) {
        this.stage = rootContainer;
        this.app = app;
        this.seed = Math.floor(Math.random() * 0xFFFFFFFF); // Default random seed
        // Merge game config with defaults
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.grid = Array.from({ length: this.config.cols }, () =>
            Array.from({ length: this.config.rows }, () => 0)
        );
        this.initialGrid = Array.from({ length: this.config.cols }, () =>
            Array.from({ length: this.config.rows }, () => 0)
        );
        this.reels = [];
        this.state = 'IDLE';
        this.timeSinceStart = 0;
        this.features = [];

        // Group for the reels to center them easily
        this.reelContainer = new Container();
        this.stage.addChild(this.reelContainer);

        this.ghostContainer = new Container();
        this.stage.addChild(this.ghostContainer)
        this.ui = new UI(this);
    }

    setBackground(alias) {
        Assets.load(alias || this.config.backgroundImage).then((texture) => {
            if (!this.bgSprite) {
                this.bgSprite = new Sprite()
            }
            const bg = this.bgSprite
            bg.texture = texture
            bg.anchor.set(0.5);
            bg.x = this.config.width / 2;
            bg.y = this.config.height / 2;
            bg.scale.set(Math.max(this.config.width / texture.width, this.config.height / texture.height));
            this.stage.addChildAt(bg, 0);
        })
    }

    registerFeature(feature) {
        this.features.push(feature);
        const newSymbols = feature.getSymbols();
        if (newSymbols) {
            this.config.symbols.push(...newSymbols);
        }
    }

    async spin(seed) {

        if (this.processing === true && this.config.mode === "normal") return;
        if (seed) this.setSeed(seed)
        console.log("This game has the seed:", this.seed)
        this.processing = true;

        this.ui.setMultiplier(0);
        const timeline = this.calculateMoves(this.features);

        console.log("PREDICTED PAYOUT:", timeline[timeline.length - 1].totalWin || 0);
        console.log("PREDICTED GAME FLOW:", timeline);

        this.grid = timeline[0].grid;
        await this.spinReels();

        for (let i = 1; i < timeline.length; i++) {
            await new Promise(r => setTimeout(r, this.config.timeBeforeProcessingGrid));
            const event = timeline[i];

            if (event.type === 'EXPLODE') {
                await this.triggerMatchAnimations(event.clusters);
                await this.explodeAndCascade(event.clusters, event.replacements);
                this.ui.setMultiplier(event.totalWin)


                this.grid = event.grid;
            }
            else {
                for (const feature of this.features) {
                    if (feature.type === event.type) {
                        await feature.onCustomEvent(event);
                        break
                    }
                }
            }
        }

        if (this.config.mode === "normal") {
            this.processing = false;
        }

        return { grid: this.grid, totalWin: this.globalMultiplier };
        // result = { grid: this.grid, timeline: timeline }
    }

    async spinReels() {
        const resultData = this.grid
        if (resultData.length !== this.config.cols || resultData.some(i => i.length !== this.config.rows)) {
            throw Error("Wrong structure of result data");
        }

        this.config.symbols.forEach(symbol => {
            if (symbol.anticipation) {
                this.applyAnticipation(symbol)
            }
        })

        this.timeSinceStart = 0;

        const spinPromises = this.reels.map((r, i) => (async () => {
            await new Promise(resolve =>
                setTimeout(resolve, i * this.config.staggerTime)
            );
            await r.spin(resultData[i]);

            return resultData[i];
        })());

        const finalResults = await Promise.all(spinPromises);

        this.reels.forEach(r => r.clearAnticipation());
        return finalResults
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
        if (this.gridMask) {
            this.gridMask.destroy();
        }
        this.gridMask = new Graphics();
        this.gridMask.rect(
            this.reelContainer.x,
            this.reelContainer.y,
            totalWidth,
            totalHeight
        );
        this.gridMask.fill(0x000000);
        this.reelContainer.mask = this.gridMask;
        this.stage.addChild(this.gridMask)
    }


    update(delta) {
        this.reels.forEach(r => r.update(delta));
    }

    destroy() {
        this.stage.removeChildren();
    }

    async init() {

        this.config.symbols = this.config.symbols.map((symbol, index) => {
            const fixedSymbol = symbol
            fixedSymbol.id = index
            fixedSymbol.baseWeight = fixedSymbol.weight
            fixedSymbol.landingEffect = symbol.landingEffect ? symbol.landingEffect : this.config.defaultLandingEffect
            fixedSymbol.matchEffect = symbol.matchEffect ? symbol.matchEffect : this.config.defaultMatchEffect
            fixedSymbol.explodeEffect = symbol.explodeEffect ? symbol.explodeEffect : this.config.defaultExplodeEffect
            if (this.config.invisibleFlyby) {
                fixedSymbol.anticipation = undefined
            }
            if (fixedSymbol.path) return {
                ...fixedSymbol,
                path: (this.config.pathPrefix + fixedSymbol.path)
            }
            else return fixedSymbol
        });
        this.features.forEach(f => f.init());
        await this.loadAssets()

        this.setBackground(this.config.backgroundImage)
        this.initialGrid = this.generateRandomResult()
        this.createGrid();
        this.ui.init()

        console.log("CONFIG", this.config)
        console.log("SYMBOLS", this.config.symbols)
    }

    async loadAssets() {
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
                Assets.add({ alias: asset.alias, src: this.config.pathPrefix + asset.src });
                aliases.push(asset.alias);
            });
        }

        this.features.forEach(feature => {
            if (feature.getAssets) {
                const assets = feature.getAssets();
                assets.forEach(asset => {
                    Assets.add({ alias: asset.alias, src: this.config.pathPrefix + asset.src });
                    aliases.push(asset.alias);
                });
            }
            // Initialize the feature (create UI, etc.)
            if (feature.init) feature.init();
        });

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
    }

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

    applyGroups() {
        this.config.groups.forEach(group => {
            const groupName = group.name
            const countToKeep = group.count

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
    // You can now pass hex values (0x00FF00) or strings ("green", "#FF00FF") 
    // depending on your Pixi version (v7+ supports strings natively).
    drawBackgroundCells(backgroundColor = 0x000000) {

        // 1. Check if we already have a container and remove it to prevent duplicates
        if (this.backgroundCellsContainer) {
            this.backgroundCellsContainer.destroy({ children: true });
        }

        const bgContainer = new Container();
        this.backgroundCellsContainer = bgContainer; // Keep a reference to destroy later if needed

        // CONFIGURATION
        this.bgContainer = [];

        // We remove the grayFilter because 'tint' is much more performant 
        // and filters break batch rendering.

        for (let i = 0; i < this.config.cols; i++) {
            this.bgContainer.push([]);
            for (let j = 0; j < this.config.rows; j++) {

                const bg = new Sprite();
                bg.texture = Assets.get("rage_spell_background");

                // --- POSITIONING ---
                const x = i * (this.config.symbolWidth + this.config.gapX);
                const y = j * (this.config.symbolHeight + this.config.gapY);
                const w = this.config.symbolWidth;
                const h = this.config.symbolHeight;

                bg.x = x;
                bg.y = y;
                bg.width = w;
                bg.height = h;
                bg.alpha = 0.7;

                // --- COLORING ---
                // This applies the color passed in the function argument
                bg.tint = backgroundColor;

                // --- MASKING ---
                const mask = new Graphics()
                    .roundRect(0, 0, w, h, 15)
                    .fill("white"); // Color of mask doesn't matter, only alpha

                mask.x = x;
                mask.y = y;
                bg.mask = mask;

                this.bgContainer[i].push(bg);
                bgContainer.addChild(bg);
                bgContainer.addChild(mask);
            }
        }
        // Add to reelContainer so it centers automatically with the game
        this.reelContainer.addChildAt(bgContainer, 0);
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
            // videoElement.playbackRate = this.config.symbols[targetSprite.symbolId].playbackRate || 1

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
            const pixelsToCut = 50; // <--- CHANGE THIS VALUE TO CUT MORE/LESS
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
            videoElement.playbackRate = symbolConfig.playbackRate//this.config.symbols[targetSprite.symbolId].playbackRate || 1

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

    spawnGhost(originalSymbol) {
        const ghost = new Sprite(originalSymbol.texture);
        ghost.anchor.x = originalSymbol.anchor.x;
        ghost.anchor.y = originalSymbol.anchor.y;
        // ghost.anchor.set(0.5);
        ghost.width = originalSymbol.width;
        ghost.height = originalSymbol.height;
        const origin = this.stage.toLocal(originalSymbol.getGlobalPosition())
        ghost.x = origin.x// originalSymbol.x;
        ghost.y = origin.y//originalSymbol.y;

        ghost.alpha = 1;

        this.stage.addChild(ghost);

        // Safety cleanup if animation fails
        setTimeout(() => {
            if (!ghost.destroyed) ghost.destroy()
        }, 5000);
        return ghost
    }
    /**
     * @param {grid:number[][]}
     * @param {where:number[posX][posY]}
     */
    explode(grid, where, timeline, win) {
        const replacements = this.generateReplacements(where, grid);
        // console.log("clustersToProcess", clustersToProcess, "replacements", replacements)
        const newGrid = this.simulateCascade(grid, where, replacements);

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


    calculateMoves(features) {
        const timeline = [];
        let currentGrid = this.generateRandomResult();

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

            const rawClusters = this.findClusters(currentGrid);
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

    async handleSymbolLand(effect, sprite) {
        for (let i = 0; i < this.features.length; i++) {
            if (this.features[i].effects.find(s => s == effect)) {
                const symbolDef = this.config.symbols.find(s => sprite.symbolId === s.id)
                const p = await this.features[i].playEffect(effect, sprite, symbolDef);
                if (p) return p;
            }
        }
    }

    async handleSymbolMatch(effect, sprite) {
        for (let i = 0; i < this.features.length; i++) {
            if (this.features[i].effects.find(s => s == effect)) {
                const symbolDef = this.config.symbols.find(s => sprite.symbolId === s.id)
                const p = await this.features[i].playEffect(effect, sprite, symbolDef);
                if (p) return p;
            }
        }
    }

    async handleSymbolExplode(effect, sprite) {
        for (let i = 0; i < this.features.length; i++) {
            if (this.features[i].effects.find(s => s == effect)) {
                const symbolDef = this.config.symbols.find(s => sprite.symbolId === s.id)
                const p = await this.features[i].playEffect(effect, sprite, symbolDef);
                if (p) return p;
            }
        }
    }

    // In SlotsBase.js

    changeGridSize(newCols, newRows) {
        // 1. Don't do anything if size is the same
        if (this.config.cols === newCols && this.config.rows === newRows) return;

        console.log(`Resizing Grid to ${newCols}x${newRows}`);

        // 2. Destroy existing visuals
        this.reels.forEach(reel => reel.destroy());
        this.reels = [];
        this.reelContainer.removeChildren(); // Clean container

        // 3. Update Config
        this.config.cols = newCols;
        this.config.rows = newRows;

        // 4. Reset Data Grids
        this.grid = Array.from({ length: this.config.cols }, () =>
            Array.from({ length: this.config.rows }, () => 0)
        );

        // 5. Regenerate initial data for the new size
        this.initialGrid = this.generateRandomResult();

        // 6. Rebuild Visuals
        this.createGrid();

        // 7. Re-initialize UI if needed (optional, depends if UI tracks grid size)
        // this.ui.refresh(); 
    }
}