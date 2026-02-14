import { Application, Container, Sprite } from "pixi.js";
import SlotsBase from "./SlotsBase.ts";
import { GameConfig, Grid, SymbolDef, Timeline, TimelineEvent } from "./types.ts";
import { RandomEngine } from "./Math.ts";
import { UI } from "./UI.ts";
import { Reel } from "./Reel.ts";

export default class GameFeature {
    public app: Application
    public engine: RandomEngine
    public ui: UI
    public effects: string[]
    public stage: Container
    public reels: Reel[]
    public id: number
    public config: GameConfig
    public game: SlotsBase
    public type: string
    public featureSymbol: SymbolDef | null

    constructor(game: SlotsBase, type: string, featureSymbol: SymbolDef | null) {
        this.game = game;
        this.app = game.app
        this.type = type
        this.engine = game.engine
        this.ui = this.game.ui
        this.stage = this.game.stage
        this.reels = this.game.reels
        this.effects = []
        this.config = game.config
        this.featureSymbol = featureSymbol
    }

    getSymbols(): SymbolDef[] {
        if (!this.featureSymbol) return []
        return [
            this.featureSymbol
        ];
    }
    getAssets() { return []; }  // Return list of images/sounds to load

    init() {
        this.id = this.config.symbols.find(s => s.name === this.featureSymbol?.name)?.id
    }

    // --- SIMULATION HOOKS (The Math/Logic Loop) ---
    // Called once at the very start of a spin (good for forcing symbols or resetting state)
    onSpinStart(grid: Grid): boolean { return false }

    // Called every time the grid settles (before checking for matches)
    // Use this for "Transformation" logic (like Clan Castle turning into troops)
    onGridPreProcess(grid: Grid, timeline: Timeline): boolean { return false; }

    // Called when standard clusters are found. 
    // Use this for "Super Abilities" (Super Archer shooting arrows)
    onClustersFound(clusters, grid: Grid, timeline: Timeline): boolean { return false }

    onClustersResolve(clusters, grid: Grid, timeline: Timeline): boolean { return false }

    // Called when NO clusters are found (Grid is idle). 
    // This is the "Warden Hook" - allowing action when the game would otherwise end.
    // Return true if you modified the grid and the engine should re-scan.
    onGridIdle(grid: Grid, timeline: Timeline): boolean { return false; }

    // Called at the very end of logic calculation.
    // Use this for global multipliers (Town Hall) or triggering Bonus Games (Mines)
    onSpinEnd(grid: Grid, timeline: Timeline): boolean { return false }


    // --- VISUAL HOOKS (The Animation Loop) ---

    // Intercepts the main event loop. 
    // Return true if you handled the animation (preventing default behavior).
    async onCustomEvent(event: TimelineEvent): Promise<void> { }

    onActivateFreespins(): void { }
    onDeactivateFreespins(): void { }

    // Inject own effects into the game.
    async playEffect(effect: string, sprite: Sprite, symbol: SymbolDef) { }

    applyGrid(originalGrid: Grid, newGrid: Grid) {
        for (let i = 0; i < originalGrid.length; i++) {
            // We assume 2D arrays (cols x rows)
            // This replaces the entire column array content
            originalGrid[i] = [...newGrid[i]];
        }
    }

    cleanup() {

    }
}