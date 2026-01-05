export default class GameFeature {
    constructor(game, type, featureSymbol = null) {
        this.game = game;
        this.app = game.app
        this.type = type
        this.ui = this.game.ui
        this.featureSymbol = featureSymbol
        this.config = this.game.config
        this.stage = this.game.stage
        this.reels = this.game.reels
        this.effects = []
    }

    getSymbols() {
        if (!this.featureSymbol) return false
        return [
            this.featureSymbol
        ];
    }
    getAssets() { return []; }  // Return list of images/sounds to load

    async init() {
        this.id = this.config.symbols.find(s => s.name === this.featureSymbol?.name)?.id
    }

    // --- SIMULATION HOOKS (The Math/Logic Loop) ---
    // Called once at the very start of a spin (good for forcing symbols or resetting state)
    onSpinStart(grid) { return false }

    // Called every time the grid settles (before checking for matches)
    // Use this for "Transformation" logic (like Clan Castle turning into troops)
    onGridPreProcess(grid, timeline) { return false; }

    // Called when standard clusters are found. 
    // Use this for "Super Abilities" (Super Archer shooting arrows)
    onClustersFound(clusters, grid, timeline) { return false }

    onClustersResolve(clusters, grid, timeline) { return false }

    // Called when NO clusters are found (Grid is idle). 
    // This is the "Warden Hook" - allowing action when the game would otherwise end.
    // Return true if you modified the grid and the engine should re-scan.
    onGridIdle(grid, timeline) { return false; }

    // Called at the very end of logic calculation.
    // Use this for global multipliers (Town Hall) or triggering Bonus Games (Mines)
    onSpinEnd(grid, timeline) { return false }


    // --- VISUAL HOOKS (The Animation Loop) ---

    // Intercepts the main event loop. 
    // Return true if you handled the animation (preventing default behavior).
    async onCustomEvent(event) { return false; }

    // Inject own effects into the game.
    async playEffect(effect, sprite, symbol) { }

    applyGrid(originalGrid, newGrid) {
        for (let i = 0; i < originalGrid.length; i++) {
            // We assume 2D arrays (cols x rows)
            // This replaces the entire column array content
            originalGrid[i] = [...newGrid[i]];
        }
    }
}