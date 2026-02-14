import { Assets, Sprite, Container, Graphics, Filter, GlProgram, Application, Texture, TextureSource } from 'pixi.js';
import { Reel } from './Reel.ts'; // Assumes .ts or .js resolution
import { getPos, UI } from './UI.ts';
import { RandomEngine, calculateMoves, contain, generateRandomResult } from './Math.ts';
import { SymbolDef, GameConfig, Grid } from './types.ts';
import GameFeature from './GameFeature.ts';

const DEFAULT_CONFIG: Partial<GameConfig> = {
    reelLandSymbolsDelay: 0
}

export default class SlotsBase {
    public app!: Application;
    public stage!: Container;

    public engine: RandomEngine;
    public config: GameConfig;
    public grid: Grid;
    public initialGrid: Grid;

    public reels: Reel[] = [];
    public features: GameFeature[] = [];

    // Containers
    public reelContainer!: Container;
    public ghostContainer!: Container;
    public backgroundCellsContainer?: Container;

    // Visuals
    public bgSprite?: Sprite;
    public gridMask?: Graphics;
    public ui!: UI;

    public processing: boolean = false;

    public stickyCells = []

    constructor(rootContainer: Container, app: Application, config: Partial<GameConfig> = {}) {
        // @ts-ignore - Assuming RandomEngine handles the partial config correctly
        this.engine = new RandomEngine(config, this);
        console.log("engine is set");

        this.config = { ...DEFAULT_CONFIG, ...config } as GameConfig;

        // Initialize empty grid
        this.grid = Array.from({ length: this.config.cols }, () =>
            Array.from({ length: this.config.rows }, () => 0)
        );
        this.initialGrid = []; // Will be set in init()

        if (config.mode !== "simulation") {
            this.stage = rootContainer;
            this.app = app;

            this.initialGrid = Array.from({ length: this.config.cols }, () =>
                Array.from({ length: this.config.rows }, () => 0)
            );

            // Group for the reels to center them easily
            this.reelContainer = new Container();
            this.stage.addChild(this.reelContainer);

            this.ghostContainer = new Container();
            this.stage.addChild(this.ghostContainer);
            this.ui = new UI(this);
        }
    }

    setBackground(alias?: string) {
        Assets.load(alias || this.config.backgroundImage || "").then((texture) => {
            if (!this.bgSprite) {
                this.bgSprite = new Sprite();
            }
            const bg = this.bgSprite;
            bg.zIndex = -1000;
            bg.texture = texture;
            bg.anchor.set(0.5);
            bg.x = this.config.width / 2;
            bg.y = this.config.height / 2;
            bg.scale.set(Math.max(this.config.width / texture.width, this.config.height / texture.height));
            this.stage.addChildAt(bg, 0);
        });
    }

    registerFeature(feature: GameFeature, first = false) {
        console.log(this.features, this.config.symbols)
        if (first) {
            this.features.unshift(feature)

        }
        else {
            this.features.push(feature);

        }
        const newSymbols = feature.getSymbols ? feature.getSymbols() : null;
        if (newSymbols) {
            this.config.symbols.push(...newSymbols);
        }
        this.fixSymbols()
        // feature.init()
    }

    unregisterFeature(featureType: string) {
        const feature = this.features.find(f => f.type == featureType)

        // 1. Lifecycle Cleanup
        if (feature.cleanup) {
            feature.cleanup();
        }

        // 2. Remove the feature from execution list
        this.features = this.features.filter(f => f.type != featureType)

        // 3. Remove the feature's symbol
        this.config.symbols.filter((symbol: SymbolDef) => {
            !feature.getSymbols().map(s => s.name).includes(symbol.name)
        })

        this.config.symbols = this.config.symbols.map((symbol: SymbolDef, index: number) => {
            return { ...symbol, id: index }
        })
    }

    async spin() {
        // if (this.processing === true && this.config.mode === "normal") {
        //     console.log("CCC")
        //     return;
        // }
        // this.engine.setSeed(563172570139)
        // this.engine.setSeed(1698311012251)
        // this.engine.setSeed(563172570139)
        // this.engine.setSeed(697883286926)
        // this.engine.setSeed(99260448843)
        // this.engine.setSeed(498270901918)
        console.log("This game has the seed:", this.engine.seed);
        console.log("This game has the symbols:", this.config.symbols);

        this.onNewSpin()
        this.processing = true;
        this.ui.setMultiplier(0);
        const timeline = calculateMoves(this.engine, this.config.rows, this.config.cols, this.features, this.config.symbols, this.stickyCells);

        console.log("PREDICTED PAYOUT:", timeline[timeline.length - 1].totalWin || 0);
        console.log("PREDICTED GAME FLOW:", timeline);

        this.grid = timeline[0].grid;


        const stickyGhosts = []
        this.stickyCells.forEach(cell => {
            stickyGhosts.push(this.createStickyGhosts(cell.col, cell.row))
        })
        await this.spinReels();
        stickyGhosts.forEach(g => g.destroy())
        for (let i = 1; i < timeline.length; i++) {
            await new Promise(r => setTimeout(r, this.config.timeBeforeProcessingGrid));
            const event = timeline[i];

            if (event.type === 'EXPLODE') {
                await this.triggerMatchAnimations(event.clusters);
                await this.explodeAndCascade(event.clusters, event.replacements);
                this.ui.setMultiplier(event.totalWin);
                this.grid = event.grid;
            }
            else {
                for (const feature of this.features) {
                    if (feature.type === event.type) {
                        await feature.onCustomEvent(event);
                        break;
                    }
                }
            }
        }

        if (this.config.mode === "normal") {
            this.processing = false;
        }

        if (this.config.freespins > 0) {
            this.setFreespins(this.config.freespins - 1)
            await this.spin()
        }
        // return { grid: this.grid, totalWin: this.ui.globalMultiplier };
    }

    async spinReels(): Promise<number[][]> {
        const resultData = this.grid;
        if (resultData.length !== this.config.cols || resultData.some(i => i.length !== this.config.rows)) {
            throw Error("Wrong structure of result data");
        }

        const spinPromises = this.reels.map((r, i) => (async () => {
            await new Promise(resolve =>
                setTimeout(resolve, i * this.config.staggerTime)
            );
            await r.spin(resultData[i]);
            this.applyAnticipation(i)
            return resultData[i];
        })());

        const finalResults = await Promise.all(spinPromises);

        this.reels.forEach(r => r.clearAnticipation());
        return finalResults;
    }

    createGrid() {
        // this.drawBackgroundCells(0x777777); // Fixed hex format
        const totalWidth = (this.config.cols * this.config.symbolWidth) +
            ((this.config.cols - 1) * this.config.gapX);

        const totalHeight = (this.config.rows * this.config.symbolHeight) +
            ((this.config.rows - 1) * this.config.gapY);

        const offset = getPos(this.config.foregroundOffset, this.config)
        this.reelContainer.x = (this.config.width - totalWidth) / 2 + offset.x;
        this.reelContainer.y = (this.config.height - totalHeight) / 2 + offset.y

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
        this.stage.addChild(this.gridMask);

        if (this.config.reelBackgroundImage) {
            Assets.load(this.config.reelBackgroundImage).then(texture => {
                const reelBackgroundImage = new Sprite(texture);
                reelBackgroundImage.zIndex = -1;
                reelBackgroundImage.anchor.set(0);
                reelBackgroundImage.setSize(
                    // (totalWidth + 300 * this.config.reelBackgroundScale),
                    // (totalHeight + 180) * this.config.reelBackgroundScale
                    (totalWidth + 150 * this.config.reelBackgroundScale),
                    (totalHeight + 150) * this.config.reelBackgroundScale
                );
                reelBackgroundImage.x = this.reelContainer.x - 150 + this.config.reelBackgroundOffset.x;
                reelBackgroundImage.y = this.reelContainer.y - 90 + this.config.reelBackgroundOffset.y;
                this.stage.addChild(reelBackgroundImage);
            });
        }
    }

    update(delta: number) {
        this.reels.forEach(r => r.update(delta));
    }

    destroy() {
        this.stage.removeChildren();
    }

    async init(generateGrid = true) {
        this.fixSymbols()
        this.initialGrid = generateRandomResult(this.engine, this.config.rows, this.config.cols, this.config.symbols);

        if (this.config.mode !== "simulation") {
            await this.loadAssets();
            this.setBackground(this.config.backgroundImage);
            this.ui.init();
            this.createGrid();
            console.log("CONFIG", this.config);
            // console.log("SYMBOLS", this.config.symbols);
        }

        this.features.forEach(f => {
            if (f.init) f.init();
        });
    }

    fixSymbols() {

        // Map symbols to ensure runtime properties exist
        this.config.symbols = this.config.symbols.map((symbol, index) => {
            if (symbol.weight == 0) return symbol
            const fixedSymbol = symbol;
            fixedSymbol.id = index;
            fixedSymbol.onlyAppearOnRoll = Array.isArray(symbol.weight);
            fixedSymbol.clusterSize = symbol.clusterSize ? symbol.clusterSize : this.config.clusterSize;
            fixedSymbol.baseWeight = Array.isArray(fixedSymbol.weight) ? [...fixedSymbol.weight] : fixedSymbol.weight;
            fixedSymbol.landingEffect = symbol.landingEffect ? symbol.landingEffect : this.config.defaultLandingEffect;
            fixedSymbol.matchEffect = symbol.matchEffect ? symbol.matchEffect : this.config.defaultMatchEffect;
            fixedSymbol.explodeEffect = symbol.explodeEffect ? symbol.explodeEffect : this.config.defaultExplodeEffect;
            fixedSymbol.scale = symbol.scale ? symbol.scale : 1

            if (this.config.invisibleFlyby) {
                fixedSymbol.anticipation = undefined;
            }
            // if (fixedSymbol.path) {
            //     return {
            //         ...fixedSymbol,
            //         path: (this.config.pathPrefix + fixedSymbol.path)
            //     };
            // }
            if (fixedSymbol.path) {
                // We do NOT add pathPrefix here. We need the raw string to match the JSON keys.
                return fixedSymbol;
            }
            else return fixedSymbol;
        });
    }

    async loadAssets() {
        // -----------------------------------------------------------------
        // STEP 1: Load "Container" Assets (Spritesheets, Backgrounds, etc.)
        // -----------------------------------------------------------------
        const extraAssetsAliases: string[] = [];
        // Load Extra Assets (This includes your spritesheet JSON)
        if (this.config.extraAssets) {
            this.config.extraAssets.forEach(asset => {
                // Note: If using a spritesheet, pathPrefix is usually applied here
                const src = this.config.pathPrefix + asset.src;
                Assets.add({ alias: asset.alias, src: src });
                extraAssetsAliases.push(asset.alias);
            });
        }
        if (extraAssetsAliases.length > 0) {
            await Assets.load(extraAssetsAliases);
        }
        const globalAliases: string[] = [];

        // Load Feature Assets
        this.features.forEach(feature => {
            if (feature.getAssets) {
                const assets = feature.getAssets();
                if (assets) {
                    assets.forEach(asset => {
                        if (!Assets.cache.has(asset.src)) {
                            const src = this.config.pathPrefix + asset.src;
                            Assets.add({ alias: asset.alias, src: src });
                            globalAliases.push(asset.alias);

                        }
                    });
                }
            }
        });

        // WAIT for the spritesheet to be parsed and textures created
        if (globalAliases.length > 0) {
            await Assets.load(globalAliases);
        }

        // -----------------------------------------------------------------
        // STEP 2: Resolve Symbols (Cache vs. Download)
        // -----------------------------------------------------------------
        const standaloneAliases: string[] = [];

        this.config.symbols.forEach((symbol: SymbolDef) => {
            // A. Handle "Texture Levels" (rare case in your logic)
            // I think i can remove this.
            if (symbol.textureAtLevel && Array.isArray(symbol.textureAtLevel)) {
                symbol.textureAtLevel.forEach((path, index) => {
                    const alias = `${symbol.name}_level_${index + 1}`;
                    // Check if this level exists in the spritesheet cache
                    if (Assets.cache.has(path)) {
                        // It exists in the sheet!
                    } else {
                        // Load from file
                        Assets.add({ alias: alias, src: path });
                        standaloneAliases.push(alias);
                    }
                });
            }
            // B. Handle Standard Paths
            else if (symbol.path) {
                // CHECK: Does this frame exist in the cache (from the spritesheet)?
                if (Assets.cache.has(symbol.path)) {
                    // Yes: Assign immediately
                    symbol.texture = Assets.get(symbol.path);
                } else {
                    // No: It must be a standalone file. Queue it for download.
                    Assets.add({ alias: symbol.name, src: this.config.pathPrefix + symbol.path });
                    standaloneAliases.push(symbol.name);
                }
            }
        });

        // -----------------------------------------------------------------
        // STEP 3: Load any remaining Standalone Files
        // -----------------------------------------------------------------
        if (standaloneAliases.length > 0) {
            await Assets.load(standaloneAliases);

            // Assign textures for the newly loaded standalone files
            this.config.symbols.forEach((symbol: SymbolDef) => {
                if (!symbol.texture) { // Only if we haven't assigned it from the sheet yet
                    if (symbol.path) {
                        symbol.texture = Assets.get(symbol.name);
                    }
                    else if (symbol.textureAtLevel) {
                        symbol.texture = Assets.get(symbol.name + "_level_1");
                    }
                }
            });
        }
    }

    applyAnticipation(reelIndex: number) {
        const symbol = this.config.symbols.find((s: SymbolDef) => {
            if (!s.anticipation) return false;

            // SAFE CHECK: Handle both Array weights and Number weights
            if (Array.isArray(s.weight)) {
                // Check if ANY reel has a weight > 0
                return s.weight.some(w => w > 0);
            } else {
                // Standard number check
                return s.weight > 0;
            }
        });
        if (!symbol) return
        const positions = contain(symbol.id, this.grid)

        positions.forEach((pos, index) => {
            if (pos.x > reelIndex) return
            if (index >= symbol.anticipation.after - 1) {
                this.reels.forEach((reel: Reel) => {
                    reel.speedMultiplier = .2
                    reel.anticipate(symbol)
                })
            }

        })
    }

    applyGroups() {
        this.config.groups?.forEach(group => {
            const groupName = group.name;
            const countToKeep = group.count;

            const groupSymbols = this.config.symbols.filter(s => s.group === groupName);

            // Shuffle them
            const shuffled = [...groupSymbols].sort(() => 0.5 - this.engine.random());

            // Remap Weights
            groupSymbols.forEach(symbol => {
                if (shuffled.indexOf(symbol) < countToKeep) {
                    // Restore original probability
                    if (symbol.baseWeight !== undefined) {
                        symbol.weight = symbol.baseWeight;
                    }
                } else {
                    // Disable
                    symbol.weight = 0;
                }
            });
        });
    }

    async explodeAndCascade(clusters: any[], replacements: any[]) {
        const grid = this.grid;

        if (clusters.length === 0) {
            return false;
        }
        const reel_promises: Promise<any>[] = [];

        for (let i = 0; i < this.reels.length; i++) {
            if (clusters[i]) {
                const res = this.reels[i].explodeAndCascade(clusters[i], replacements[i], grid[i]);
                reel_promises.push(res);
            }
            else {
                reel_promises.push(Promise.resolve(grid[i]));
            }
        }
        return await Promise.all(reel_promises);
    }

    drawBackgroundCells(backgroundColor: number | string = 0x000000) {
        if (this.backgroundCellsContainer) {
            this.backgroundCellsContainer.destroy({ children: true });
        }

        const bgContainer = new Container();
        this.backgroundCellsContainer = bgContainer;

        for (let i = 0; i < this.config.cols; i++) {
            for (let j = 0; j < this.config.rows; j++) {

                const bg = new Sprite();
                bg.texture = Assets.get("rage_spell_background");

                const x = i * (this.config.symbolWidth + this.config.gapX);
                const y = j * (this.config.symbolHeight + this.config.gapY);
                const w = this.config.symbolWidth;
                const h = this.config.symbolHeight;

                bg.x = x;
                bg.y = y;
                bg.width = w;
                bg.height = h;
                bg.alpha = 0.7;

                // @ts-ignore - Pixi tint supports number/string but TS definitions can be strict
                bg.tint = backgroundColor;

                const mask = new Graphics()
                    .roundRect(0, 0, w, h, this.config.borderRadius)
                    .fill("white");

                mask.x = x;
                mask.y = y;
                bg.mask = mask;

                bgContainer.addChild(bg);
                bgContainer.addChild(mask);
            }
        }
        this.reelContainer.addChildAt(bgContainer, 0);
    }

    async insertIntoGrid(position: { x: number; y: number }, symbolId: number): Promise<number> {
        return new Promise(async (resolve) => {
            const col = position.x;
            const row = position.y;

            // Capture old value
            const hereBefore = this.grid[col][row];

            // Update Data Grid
            this.grid[col][row] = symbolId;

            // Trigger Visual Update
            const reel = this.reels[col];
            if (reel) {
                await reel.animateSymbolReplacement(row, symbolId);
            }

            resolve(hereBefore);
        });
    }

    async triggerMatchAnimations(clusters: any[]) {
        const promises: Promise<any>[] = [];
        // clusters is an array of arrays: [[rowIdx, rowIdx], [], [rowIdx]...]
        for (let col = 0; col < this.config.cols; col++) {
            if (clusters[col] && clusters[col].length > 0) {
                promises.push(this.reels[col].playMatchEffects(clusters[col]));
            }
        }
        await Promise.all(promises);
    }

    async playSymbolVideo(targetSprite: Sprite & { symbolId?: number }, videoAlias: string): Promise<void> {
        return new Promise((resolve) => {
            const videoAsset = Assets.get(videoAlias);
            if (!videoAsset) {
                console.warn(`Video alias ${videoAlias} not found`);
                resolve();
                return;
            }

            // Cast to Texture to access properties
            const videoTexture = videoAsset as Texture;
            const videoSource = videoTexture.source;
            const videoElement = videoSource.resource as HTMLVideoElement;

            // Wait for dimensions
            if (videoTexture.width === 0 || videoTexture.height === 0) {
                const onLoaded = () => {
                    videoElement.removeEventListener('loadedmetadata', onLoaded);
                    this.playSymbolVideo(targetSprite, videoAlias).then(resolve);
                };
                videoElement.addEventListener('loadedmetadata', onLoaded);
                return;
            }

            // Calculate pixel cut
            const pixelsToCut = 50;
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

            const fragment = `
                in vec2 vTextureCoord;
                uniform sampler2D uTexture; 
                uniform float uThreshold; 
                uniform float uSoftness;
                uniform vec2 uTrim; 

                void main(void) {
                    if (vTextureCoord.x < uTrim.x || vTextureCoord.x > (1.0 - uTrim.x) ||
                        vTextureCoord.y < uTrim.y || vTextureCoord.y > (1.0 - uTrim.y)) {
                        gl_FragColor = vec4(0.0);
                        return; 
                    }

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
                        uTrim: { value: { x: trimX, y: trimY }, type: 'vec2<f32>' }
                    },
                },
            });

            videoSprite.filters = [removeWhiteFilter];

            videoSprite.anchor.set(0.5);
            const globalPos = targetSprite.getGlobalPosition();
            const localPos = this.stage.toLocal(globalPos);
            videoSprite.x = localPos.x;
            videoSprite.y = localPos.y;

            // Handle optional symbolId on sprite
            const sId = targetSprite.symbolId;
            let playbackRate = 1;

            if (sId !== undefined) {
                const symbolConfig = this.config.symbols.find(s => s.id === sId);
                const baseConfigScale = symbolConfig?.scale || 1;
                const ratioY = this.config.symbolHeight / videoTexture.height;
                const finalScale = ratioY * baseConfigScale;
                videoSprite.scale.set(finalScale);

                if (symbolConfig?.playbackRate) playbackRate = symbolConfig.playbackRate;
            }

            videoElement.playbackRate = playbackRate;

            this.stage.addChild(videoSprite);
            targetSprite.alpha = 0;

            const onComplete = () => {
                if (videoSprite.destroyed) return;
                videoSprite.destroy();
                if (targetSprite && !targetSprite.destroyed) targetSprite.alpha = 1;
                resolve();
            };

            // videoSource.autoPlay = true;
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

    spawnGhost(originalSymbol: Sprite, time?: number): Sprite {
        const ghost = new Sprite(originalSymbol.texture);
        ghost.anchor.x = originalSymbol.anchor.x;
        ghost.anchor.y = originalSymbol.anchor.y;

        ghost.width = originalSymbol.width;
        ghost.height = originalSymbol.height;
        const origin = this.stage.toLocal(originalSymbol.getGlobalPosition());
        ghost.x = origin.x;
        ghost.y = origin.y;

        ghost.alpha = 1;

        this.stage.addChild(ghost);

        setTimeout(() => {
            if (!ghost.destroyed) ghost.destroy();
        }, time || 5000);
        return ghost;
    }

    async handleSymbolLand(effect: string | undefined, sprite: Sprite & { symbolId?: number }, index?: number) {
        if (!effect || sprite.symbolId === undefined) return;

        for (let i = 0; i < this.features.length; i++) {
            if (this.features[i].effects.find(s => s == effect)) {
                const symbolDef = this.config.symbols.find(s => sprite.symbolId === s.id);
                await this.features[i].playEffect(effect, sprite, symbolDef);
                // const p = await this.features[i].playEffect(effect, sprite, symbolDef);
                // if (p) return p;
            }
        }
    }

    async handleSymbolMatch(effect: string | undefined, sprite: Sprite & { symbolId?: number }) {
        if (!effect || sprite.symbolId === undefined) return;

        for (let i = 0; i < this.features.length; i++) {
            if (this.features[i].effects.find(s => s == effect)) {
                const symbolDef = this.config.symbols.find(s => sprite.symbolId === s.id);
                await this.features[i].playEffect(effect, sprite, symbolDef);
                // const p = await this.features[i].playEffect(effect, sprite, symbolDef);
                // if (p) return p;
            }
        }
    }

    async handleSymbolExplode(effect: string | undefined, sprite: Sprite & { symbolId?: number }) {
        if (!effect || sprite.symbolId === undefined) return;

        for (let i = 0; i < this.features.length; i++) {
            if (this.features[i].effects.find(s => s == effect)) {
                const symbolDef = this.config.symbols.find(s => sprite.symbolId === s.id);
                await this.features[i].playEffect(effect, sprite, symbolDef);
                // const p = await this.features[i].playEffect(effect, sprite, symbolDef);
                // if (p) return p;
            }
        }
    }

    changeGridSize(newCols: number, newRows: number) {
        if (this.config.cols === newCols && this.config.rows === newRows) return;

        console.log(`Resizing Grid to ${newCols}x${newRows}`);

        // Destroy visuals
        this.reels.forEach(reel => reel.destroy());
        this.reels = [];
        this.reelContainer.removeChildren();

        this.config.cols = newCols;
        this.config.rows = newRows;

        // Reset Data Grids
        this.grid = Array.from({ length: this.config.cols }, () =>
            Array.from({ length: this.config.rows }, () => 0)
        );

        this.initialGrid = generateRandomResult(this.engine, this.config.rows, this.config.cols, this.config.symbols);

        this.createGrid();
    }

    onNewSpin() { /* to be overwritten by PixiCanvas.tsx */ }

    setFreespins(to: number): void {
        if (to < 0) {
            throw Error("Can't set freespins to negative. Tried to set it to: " + to)
        }

        if (this.config.freespins === 0 && to > 0) {
            this.features.forEach((feature: GameFeature) => {
                feature.onActivateFreespins()
            })
        }

        this.config.freespins = to

        if (to === 0) {
            this.features.forEach((feature: GameFeature) => {
                feature.onDeactivateFreespins()
            })
        }
    }

    getSymbol(col: number, row: number) {
        const reel = this.reels[col];
        // Find the symbol closest to the expected Y position
        // This assumes row 0 is at y=0, row 1 is at y=slotHeight, etc.
        // Adjust logic if your grid is centered differently.
        const targetY = ((this.config.rows - 1 - row) * reel.slotHeight) + (reel.slotHeight / 2);

        // Allow a small margin of error for floating point positions
        const res = reel.symbols.find(s => Math.abs(s.y - targetY) < 5);
        return res
    }

    makeCellSticky(col: number, row: number) {
        // this.reels[col].sort()
        // this.getSymbol(col, row).isSticky = true
        // this.getSymbol(col, row).zIndex = 1
        const wildAmount = contain(0, this.grid).length
        const maxSymbols = this.config.cols * (this.config.rows)
        // console.log("wildamount", wildAmount, "maxSymbols", maxSymbols)

        const symbolHere = wildAmount === maxSymbols ? this.initialGrid[col][row] : this.grid[col][row]
        // console.log("symbolHere", this.config.symbols.find(s => s.id == symbolHere).name)
        this.stickyCells.push({ col: col, row: row, id: symbolHere })
    }

    createStickyGhosts(col, row) {
        const symb = this.getSymbol(col, row);
        return this.spawnGhost(symb, 9999)
    }
}