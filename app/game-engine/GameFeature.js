// features/GameFeature.js

export default class GameFeature {
    constructor(game, type) {
        this.game = game;
        this.type = type
        this.config = this.game.config
    }

    // --- CONFIGURATION ---
    getSymbols() { return []; } // Return new symbol definitions
    getAssets() { return []; }  // Return list of images/sounds to load
    async init() { }             // Setup UI containers (like Resource Bars)

    // --- SIMULATION HOOKS (The Math/Logic Loop) ---
    // Called once at the very start of a spin (good for forcing symbols or resetting state)
    onSpinStart(grid) { }

    // Called every time the grid settles (before checking for matches)
    // Use this for "Transformation" logic (like Clan Castle turning into troops)
    onGridPreProcess(grid, timeline) { return false; }

    // Called when standard clusters are found. 
    // Use this for "Super Abilities" (Super Archer shooting arrows)
    onClustersFound(clusters, grid, timeline) { }

    // Called when NO clusters are found (Grid is idle). 
    // This is the "Warden Hook" - allowing action when the game would otherwise end.
    // Return true if you modified the grid and the engine should re-scan.
    onGridIdle(grid, timeline) { return false; }

    // Called at the very end of logic calculation.
    // Use this for global multipliers (Town Hall) or triggering Bonus Games (Mines)
    onSpinEnd(grid, timeline, totalWin) { }


    // --- VISUAL HOOKS (The Animation Loop) ---

    // Intercepts the main event loop. 
    // Return true if you handled the animation (preventing default behavior).
    async onCustomEvent(event) { return false; }

    // Called specifically when a symbol lands (e.g., heavy drop effects)
    async onSymbolLand(sprite, symbolDef) { }

    // Called specifically when a symbol is part of a win (e.g., Builder Hammer)
    async onSymbolMatch(sprite, symbolDef) { }

    // Called when a symbol is destroyed (e.g., Soul flying to UI bar)
    async onSymbolExplode(sprite, symbolDef) { }
}