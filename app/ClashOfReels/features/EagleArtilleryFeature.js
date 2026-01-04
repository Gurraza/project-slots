import GameFeature from "@/app/game-engine/GameFeature";


const featureSymbol = {
    name: "eagleartillery",
    scale: 1,
    path: "Star.png",
    weight: [0],
    dontCluster: true,
    onlyAppearOnRoll: true,
    prio: true,
    payouts: { 0: 0, 1: 0.01, 2: 0.05, 3: 0.1, 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15, 13: 16, 14: 17, 15: 18, 16: 19 },
}

export class EagleArtilleryFeature extends GameFeature {
    constructor(game) {
        super(game, "EAGLE_ARTILLERY", featureSymbol)
    }
}