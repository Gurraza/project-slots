import { Assets, Sprite, Container, Graphics, Filter, GlProgram, Application, Texture, TextureSource } from 'pixi.js';
import { Reel } from './Reel.ts'; // Assumes .ts or .js resolution
import { UI } from './UI.ts';
import { RandomEngine, calculateMoves, contain, generateRandomResult } from './Math.ts';
import { SymbolDef, GameConfig, Grid } from './types.ts';
import GameFeature from './GameFeature.ts';

export interface AnticipationConfig {
    after: number;
    count: number;
}


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
            bg.zIndex = -100;
            bg.texture = texture;
            bg.anchor.set(0.5);
            bg.x = this.config.width / 2;
            bg.y = this.config.height / 2;
            bg.scale.set(Math.max(this.config.width / texture.width, this.config.height / texture.height));
            this.stage.addChildAt(bg, 0);
        });
    }

    registerFeature(feature: GameFeature) {
        console.log(this.features, this.config.symbols)
        this.features.push(feature);
        const newSymbols = feature.getSymbols ? feature.getSymbols() : null;
        if (newSymbols) {
            this.config.symbols.push(...newSymbols);
        }
        console.log(this.features, this.config.symbols)
    }

    async spin() {
        if (this.processing === true && this.config.mode === "normal") return;
        // this.engine.setSeed(313572660444)
        console.log("This game has the seed:", this.engine.seed);
        console.log("This game has the symbols:", this.config.symbols);

        this.processing = true;
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

        return { grid: this.grid, totalWin: this.ui.globalMultiplier };
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
        this.drawBackgroundCells(0x777777); // Fixed hex format
        const totalWidth = (this.config.cols * this.config.symbolWidth) +
            ((this.config.cols - 1) * this.config.gapX);

        const totalHeight = (this.config.rows * this.config.symbolHeight) +
            ((this.config.rows - 1) * this.config.gapY);

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
        this.stage.addChild(this.gridMask);

        if (this.config.reelBackgroundImage) {
            Assets.load(this.config.reelBackgroundImage).then(texture => {
                const reelBackgroundImage = new Sprite(texture);
                reelBackgroundImage.zIndex = -1;
                reelBackgroundImage.anchor.set(0);
                reelBackgroundImage.setSize(
                    (totalWidth + 300 * this.config.reelBackgroundScale),
                    (totalHeight + 180) * this.config.reelBackgroundScale
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

    async init() {
        // Map symbols to ensure runtime properties exist
        this.config.symbols = this.config.symbols.map((symbol, index) => {
            const fixedSymbol = symbol;
            fixedSymbol.id = index;
            fixedSymbol.onlyAppearOnRoll = Array.isArray(symbol.weight);
            fixedSymbol.clusterSize = symbol.clusterSize ? symbol.clusterSize : this.config.clusterSize;
            fixedSymbol.baseWeight = Array.isArray(fixedSymbol.weight) ? [...fixedSymbol.weight] : fixedSymbol.weight;
            fixedSymbol.landingEffect = symbol.landingEffect ? symbol.landingEffect : this.config.defaultLandingEffect;
            fixedSymbol.matchEffect = symbol.matchEffect ? symbol.matchEffect : this.config.defaultMatchEffect;
            fixedSymbol.explodeEffect = symbol.explodeEffect ? symbol.explodeEffect : this.config.defaultExplodeEffect;

            if (this.config.invisibleFlyby) {
                fixedSymbol.anticipation = undefined;
            }
            if (fixedSymbol.path) {
                return {
                    ...fixedSymbol,
                    path: (this.config.pathPrefix + fixedSymbol.path)
                };
            }
            else return fixedSymbol;
        });

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

    async loadAssets() {
        // 1. Register all assets with Pixi
        const aliases: string[] = [];
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

        // 2. Load Extra Game Assets
        if (this.config.extraAssets) {
            this.config.extraAssets.forEach(asset => {
                Assets.add({ alias: asset.alias, src: this.config.pathPrefix + asset.src });
                aliases.push(asset.alias);
            });
        }

        this.features.forEach(feature => {
            if (feature.getAssets) {
                const assets = feature.getAssets();
                if (assets) {
                    assets.forEach(asset => {
                        Assets.add({ alias: asset.alias, src: this.config.pathPrefix + asset.src });
                        aliases.push(asset.alias);
                    });
                }
            }
        });

        // 3. WAIT for all assets to finish downloading
        await Assets.load(aliases);

        this.config.symbols.forEach(symbol => {
            if (symbol.path) {
                symbol.texture = Assets.get(symbol.name);
            }
            else if (symbol.textureAtLevel) {
                symbol.texture = Assets.get(symbol.name + "_level_1");
            }
        });
    }

    applyAnticipation(reelIndex: number) {
        const symbol: SymbolDef = this.config.symbols.find((s: SymbolDef) => s.anticipation)
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

    aapplyAnticipation(symbol: SymbolDef) {
        if (!symbol.anticipation) return;

        let foundCount = 0;
        const maxHits = Array.isArray(symbol.weight) ? symbol.weight.length : Infinity;

        this.reels.forEach((reel, index) => {
            const reelHasSymbol = this.grid[index].includes(symbol.id);
            const standardStop = this.config.symbolsBeforeStop + (this.config.reelLandSymbolsDelay * index);

            // Note: Typescript knows symbol.anticipation is defined here because of the guard clause at top
            if (foundCount >= symbol.anticipation!.after && foundCount < maxHits) {
                const extraDelay = (foundCount * symbol.anticipation!.count);
                reel.symbolsBeforeStop = standardStop + extraDelay;
                reel.forceVisible = true;
            } else {
                reel.symbolsBeforeStop = standardStop;
                reel.forceVisible = false;
            }

            if (reelHasSymbol) {
                foundCount += this.grid[index].filter(id => id === symbol.id).length;
            }

            if (foundCount >= symbol.anticipation!.after && foundCount < maxHits && index < this.config.cols - 1) {
                reel.shouldTriggerAnticipation = true;
                reel.anticipationSymbolId = symbol.id;
            } else {
                reel.shouldTriggerAnticipation = false;
                reel.anticipationSymbolId = -1; // -1 or null
            }
        });
    }

    applyGroups() {
        this.config.groups.forEach(group => {
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

    spawnGhost(originalSymbol: Sprite): Sprite {
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
        }, 5000);
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
}