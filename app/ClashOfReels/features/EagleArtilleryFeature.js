import GameFeature from "@/app/game-engine/GameFeature";

export class EagleArtilleryFeature extends GameFeature {
    constructor(game) {
        super(game, "EAGLE_ARTILLERY")
        this.game = game
    }
}