import SlotsBase from '../game-engine/SlotsBase';

const SYMBOLS = [
    { name: 'troop_barbarian', weight: 20, scale: .9, path: "troops_icons/barbarian.png" },
    { name: 'troop_archer', weight: 20, scale: .9, path: "troops_icons/archer.png" },
    { name: 'troop_goblin', weight: 20, scale: .9, yOff: 10, path: "troops_icons/goblin.png" },
    { name: 'troop_wizard', weight: 20, scale: .9, path: "troops_icons/wizard.png" },
    { name: 'troop_wallbreaker', weight: 10, scale: .9, path: "troops_icons/wallbreaker.png" },
    { name: 'resource_gold', weight: 40, scale: 4, path: "resource/gold.png" },
    { name: 'resource_elixir', weight: 40, scale: 4, path: "resource/elixir.png" },
    { name: 'resource_darkelixir', weight: 30, scale: 4, path: "resource/dark_elixir.png" },
    { name: 'resource_gem', weight: 30, scale: .8, path: "resource/gem.png" },

];

const clanCastle = { name: "clancastle", dontCluster: true, weight: 50, scale: 1.5, path: "clanCastle.png" }
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
    weight: [10, 5, 1],
    scale: 1.4,
    onlyAppearOnRoll: false,
    path: "Icon_HV_Treasury.png",
    // anticipation: {
    //     after: 1,
    //     count: 15,
    // },
    border: "red"
}

// SYMBOLS.push(TownHallSymbol)
SYMBOLS.push(treasureSymbol)

export default class ClashOfReels extends SlotsBase {
    constructor(rootContainer, app) {
        const myConfig = {
            width: 1280,
            height: 720,
            cols: 6,
            rows: 5,
            pathPrefix: "/games/ClashOfReels/",
            symbolWidth: 80,
            symbolHeight: 80,
            spinSpeed: 20,
            spinAcceleration: 1,
            spinDeacceleration: 0.9,
            staggerTime: 100,
            gapX: 5,
            gapY: 5,
            backgroundImage: "/games/ClashOfReels/background.jpg",
            symbolsBeforeStop: 5,
            symbols: SYMBOLS,
            clusterSize: 4,
            timeBeforeProcessingGrid: 400,
            delayBeforeCascading: 600,
            ghostTime: 400,
            replaceTime: .6,
            invisibleFlyby: true,
            mode: "normal",
            bounce: 0,
            bounceDuration: .5,
        };
        super(rootContainer, app, myConfig);
        this.init()
    }

    processSpecialFeatures(grid) {
        return this.simulateChangeSymbols(grid)
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

            const moves = this.simulateChangeSymbols(currentGrid, clanCastle.id);
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
            console.log(clusters)
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
