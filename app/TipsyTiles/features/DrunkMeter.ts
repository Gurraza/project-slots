import GameFeature from "../../game-engine/GameFeature.ts";
import gsap from "gsap";
import { Text } from "pixi.js";
import { SymbolDef, Grid, Timeline, FeatureEvent, TimelineEvent } from "../../game-engine/types.ts";
import SlotsBase from "../../game-engine/SlotsBase.ts";

export class DrunkMeterFeature extends GameFeature {

    constructor(game: SlotsBase) {
        // Pass null or undefined for the specific symbol if this feature manages multiple symbols
        super(game, "TOWNHALL_FEATURE", undefined as any);
    }

    init() {
        super.init();

        // setup the beertower
    }

    getAssets() {
        return [
            { alias: "beer-tower-top", src: "BeerTower_top.png" },
            { alias: "beer-tower-bottom", src: "BeerTower_bottom.png" },
            { alias: "beer-tower-beer", src: "BeerTower_beer.png" },
        ];
    }

    onSpinEnd(grid: Grid, timeline: Timeline): boolean {
        return false
    }

    onClustersFound(clusters, grid: Grid, timeline: Timeline): boolean {
        // check if contain eater and if so add that many into the 
        return false
    }


    async onCustomEvent(event: TimelineEvent): Promise<void> {

    }
}