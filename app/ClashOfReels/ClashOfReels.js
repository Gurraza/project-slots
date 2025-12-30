import SlotsBase from '../game-engine/SlotsBase';

const SYMBOLS = [
    { weight: 50, name: 'troop_barbarian', group: "low_troop", scale: .9, path: "troops_icons/barbarian.png" },
    { weight: 50, name: 'troop_archer', group: "low_troop", scale: .9, path: "troops_icons/archer.png" },
    { weight: 50, name: 'troop_goblin', group: "low_troop", scale: .9, path: "troops_icons/goblin.png" },

    { weight: 35, name: 'troop_wizard', scale: .9, path: "troops_icons/wizard.png" },
    { weight: 0, name: 'troop_wallbreaker', scale: .9, path: "troops_icons/wallbreaker.png" },

    { weight: 100, name: 'resource_gold', group: "low_resource", scale: 4, path: "resource/gold.png" },
    { weight: 100, name: 'resource_elixir', group: "low_resource", scale: 4, path: "resource/elixir.png" },
    { weight: 100, name: 'resource_darkelixir', group: "low_resource", scale: 4, path: "resource/dark_elixir.png" },

    { weight: 70, name: 'resource_gem', scale: .8, path: "resource/gem.png" },

];
const clanCastle = { name: "clancastle", dontCluster: true, weight: 30, scale: 1.5, path: "clanCastle.png" }

SYMBOLS.push(clanCastle)
const TownHallSymbol = {
    name: "townhall",
    weight: [5, 4, 1],
    scale: 0.8,
    onlyAppearOnRoll: true,
    textureAtLevel: [
        "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_1.png",
        "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_2.png",
        "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_3.png",
        "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_4.png",
        "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_5.png",
        "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_6.png",
        "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_7.png",
        "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_8.png",
        "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_9.png",
        "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_10.png",
    ],
    anticipation: {
        after: 2,
        count: 15,
    },
    border: "red"
}
const treasureSymbol = {
    name: "treasure",
    weight: [100, 50, 1],
    scale: 1.4,
    onlyAppearOnRoll: true,
    path: "Treasury.png",
    anticipation: {
        after: 2,
        count: 15,
    },
    border: "red",
    onePerReel: true,
}

// SYMBOLS.push(TownHallSymbol)
SYMBOLS.push(treasureSymbol)

export default class ClashOfReels extends SlotsBase {

    static backgroundImage = "/games/ClashOfReels/background.jpg"
    constructor(rootContainer, app) {
        const myConfig = {
            width: 1280,
            height: 720,
            cols: 7,
            rows: 7,
            pathPrefix: "/games/ClashOfReels/",
            symbolWidth: 80,
            symbolHeight: 80,
            spinSpeed: 25,
            spinAcceleration: 1,
            spinDeacceleration: 0.9,
            staggerTime: 100,
            gapX: 5,
            gapY: 5,
            symbolsBeforeStop: 12,
            symbols: SYMBOLS,
            clusterSize: 4,
            timeBeforeProcessingGrid: 400,
            delayBeforeCascading: 600,
            ghostTime: 400,
            replaceTime: .6,
            invisibleFlyby: false,
            mode: "normal",
            bounce: 0,
            bounceDuration: .5,
            motionBlurStrength: .8
        };

        super(rootContainer, app, myConfig);
        this.init()
    }

    async spin() {
        this.setActiveGroupVariants('low_troop', 2);
        this.setActiveGroupVariants('low_resource', 2);
        return super.spin();
    }

    calculateMoves() {
        const timeline = [];
        let currentGrid = this.generateRandomResult();
        timeline.push({
            type: 'SPIN_START',
            grid: JSON.parse(JSON.stringify(currentGrid)) // Deep copy
        });

        while (true) {
            let actionOccurred = false;

            const moves = this.simulateChangeSymbols(currentGrid, clanCastle.id, this.config.symbols.filter(s => s.group == "low_troop" || s.group == "low_resource"));
            if (moves && moves.length > 0) {
                moves.forEach(move => {
                    if (currentGrid[move.x] && currentGrid[move.x][move.y] !== undefined) {
                        currentGrid[move.x][move.y] = move.newId;
                    }
                });

                timeline.push({
                    type: 'TRANSFORM',
                    changes: moves,
                    grid: JSON.parse(JSON.stringify(currentGrid))
                });
                actionOccurred = true;
            }


            const clusters = this.findClusters(currentGrid);
            const hasClusters = clusters && clusters.some(col => col.length > 0);

            if (hasClusters) {
                const replacements = this.generateReplacements(clusters, currentGrid);
                currentGrid = this.simulateCascade(currentGrid, clusters, replacements);
                timeline.push({
                    type: 'CASCADE',
                    clusters: clusters,
                    replacements: replacements,
                    grid: JSON.parse(JSON.stringify(currentGrid))
                });
                actionOccurred = true;
            }

            if (!actionOccurred) break;
        }
        return timeline;
    }
}
