import GameFeature from "../../game-engine/GameFeature.ts";
import gsap from "gsap";
import { Assets, Container, Graphics, Sprite, BlurFilter } from "pixi.js";
import { SymbolDef, Grid, Timeline, FeatureEvent, TimelineEvent } from "../../game-engine/types.ts";
import SlotsBase from "../../game-engine/SlotsBase.ts";

export class BlurredBackgroundFeature extends GameFeature {

    constructor(game: SlotsBase) {
        // Pass null or undefined for the specific symbol if this feature manages multiple symbols
        super(game, "BLURRED_BACKGROUND", undefined as any);

    }

    init() {
        const padding = 15;
        const width = this.config.cols * (this.config.symbolWidth + this.config.gapX);
        const height = this.config.rows * (this.config.symbolHeight + this.config.gapY);
        const bg = new Graphics();
        bg.position.set(this.config.width / 2, this.config.height / 2);
        bg.rect(-padding, -padding, width + padding * 2, height + padding * 2)
            .fill(0x000000);
        bg.pivot.set(width / 2, height / 2);
        const blurFilter = new BlurFilter();
        blurFilter.strength = 8;
        blurFilter.resolution = this.app.renderer ? this.app.renderer.resolution : 1;

        bg.filters = [blurFilter];

        // bg.getBounds(); // Forces bounds calculation
        bg.zIndex = -1
        bg.alpha = .5
        this.stage.addChild(bg);
    }
}