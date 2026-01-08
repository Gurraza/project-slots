import { Assets, Sprite, Container, Graphics, Filter, GlProgram, Text, ColorMatrixFilter } from 'pixi.js';
import { Reel } from './Reel.js';
import { UI } from './UI.js';
import { RandomEngine, calculateMoves, generateRandomResult, getRandomSymbolId, contain, simulateCascade, generateReplacements, findClusters, simulateChangeSymbols, explode } from './Math.js';

const DEFAULT_CONFIG = {
    reelLandSymbolsDelay: 0
}

export default class SlotsBase {
    constructor(rootContainer, app, config = {}) {
        this.engine = new RandomEngine(config, this)
        console.log("engine is set")
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.grid = Array.from({ length: this.config.cols }, () =>
            Array.from({ length: this.config.rows }, () => 0)
        );
        this.state = 'IDLE';
        this.features = [];

        if (config.mode !== "simulation") {
            this.stage = rootContainer;
            this.app = app;
            // Merge game config with defaults
            this.initialGrid = Array.from({ length: this.config.cols }, () =>
                Array.from({ length: this.config.rows }, () => 0)
            );
            this.reels = [];

            // Group for the reels to center them easily
            this.reelContainer = new Container();
            this.stage.addChild(this.reelContainer);

            this.ghostContainer = new Container();
            this.stage.addChild(this.ghostContainer)
            this.ui = new UI(this);
        }
    }

    setBackground(alias) {
        Assets.load(alias || this.config.backgroundImage).then((texture) => {
            if (!this.bgSprite) {
                this.bgSprite = new Sprite()
            }
            const bg = this.bgSprite
            bg.zIndex = -100
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

    async spin() {
        if (this.processing === true && this.config.mode === "normal") return;
        console.log("This game has the seed:", this.engine.seed)
        console.log("This game has the symbols:", this.config.symbols);
        this.processing = true;
        // this.engine.setSeed(913408620296)

        this.ui.setMultiplier(0);
        const timeline = calculateMoves(this.engine, this.config.rows, this.config.cols, this.features, this.config.symbols);

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

        if (this.config.reelBackgroundImage) {
            Assets.load(this.config.reelBackgroundImage).then(texture => {
                const reelBackgroundImage = new Sprite(texture)
                reelBackgroundImage.zIndex = -1
                reelBackgroundImage.anchor.set(0)
                reelBackgroundImage.setSize((totalWidth + 300 * this.config.reelBackgroundScale), (totalHeight + 180) * this.config.reelBackgroundScale)
                reelBackgroundImage.x = this.reelContainer.x - 150 + this.config.reelBackgroundOffset.x
                reelBackgroundImage.y = this.reelContainer.y - 90 + this.config.reelBackgroundOffset.y
                this.stage.addChild(reelBackgroundImage)
            })
        }
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
            fixedSymbol.onlyAppearOnRoll = Array.isArray(symbol.weight)
            fixedSymbol.clusterSize = symbol.clusterSize ? symbol.clusterSize : this.config.clusterSize
            fixedSymbol.baseWeight = Array.isArray(fixedSymbol.weight) ? [...fixedSymbol.weight] : fixedSymbol.weight
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
        this.initialGrid = generateRandomResult(this.engine, this.config.rows, this.config.cols, this.config.symbols)
        if (this.config.mode !== "simulation") {
            await this.loadAssets()
            this.setBackground(this.config.backgroundImage)
            this.ui.init()
            this.createGrid();
            console.log("CONFIG", this.config)
            console.log("SYMBOLS", this.config.symbols)
        }
        this.features.forEach(f => f.init());

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
        const maxHits = Array.isArray(symbol.weight) ? symbol.weight.length : Infinity;
        this.reels.forEach((reel, index) => {
            const reelHasSymbol = this.grid[index].includes(symbol.id);
            const standardStop = this.config.symbolsBeforeStop + (this.config.reelLandSymbolsDelay * index);
            // Standard Logic: Check previous reels to see if we should delay THIS one
            if (foundCount >= symbol.anticipation.after && foundCount < maxHits) {
                const extraDelay = (foundCount * symbol.anticipation.count);
                // Formula: Base delay + (extra delay * how many scatters we have)
                // reel.symbolsBeforeStop = foundCount * symbol.anticipation.count;
                // reel.forceVisible = true;
                reel.symbolsBeforeStop = standardStop + extraDelay;
                reel.forceVisible = true;
            } else {
                // Reset to default if no anticipation needed (important for repeated spins)
                // reel.symbolsBeforeStop = this.config.symbolsBeforeStop + (this.config.reelLandSymbolsDelay * index)
                // reel.forceVisible = false;
                reel.symbolsBeforeStop = standardStop;
                reel.forceVisible = false;
            }
            if (reelHasSymbol) {
                foundCount += this.grid[index].filter(id => id === symbol.id).length;
            }

            // --- THIS IS THE PART THAT MAKES REEL.JS WORK ---
            if (foundCount >= symbol.anticipation.after && foundCount < maxHits && index < this.config.cols - 1) {
                reel.shouldTriggerAnticipation = true;
                reel.anticipationSymbolId = symbol.id;
            } else {
                reel.shouldTriggerAnticipation = false;
                reel.anticipationSymbolId = null;
            }
            // Increment count AFTER processing this reel 
            // (or before, depending on if you want the reel WITH the 3rd scatter to slow down)

        });
    }

    applyGroups() {
        this.config.groups.forEach(group => {
            const groupName = group.name
            const countToKeep = group.count

            const groupSymbols = this.config.symbols.filter(s => s.group === groupName);

            // 2. Shuffle them
            const shuffled = [...groupSymbols].sort(() => 0.5 - this.engine.random());

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
                    .roundRect(0, 0, w, h, this.config.borderRadius)
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
        this.initialGrid = generateRandomResult(this.engine, this.config.rows, this.config.cols, this.config.symbols);

        // 6. Rebuild Visuals
        this.createGrid();

        // 7. Re-initialize UI if needed (optional, depends if UI tracks grid size)
        // this.ui.refresh(); 
    }
}