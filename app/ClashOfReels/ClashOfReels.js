import SlotsBase from '../game-engine/SlotsBase';

const SYMBOLS = [
    // { id: 0, name: 'troop_wallbreaker', path: "/games/ClashOfReels/Troop_HV_Wall_Breaker_1_grass.png" },
    { id: 0, name: 'troop_barbarian', weight: 20, scale: .9, path: "troops_icons/barbarian.png" },
    { id: 1, name: 'troop_archer', weight: 20, scale: .9, path: "troops_icons/archer.png" },
    { id: 2, name: 'troop_goblin', weight: 20, scale: .9, yOff: 10, path: "troops_icons/goblin.png" },
    { id: 3, name: 'troop_wizard', weight: 20, scale: .9, path: "troops_icons/wizard.png" },
    { id: 4, name: 'resource_gold', weight: 40, scale: 4, path: "resource/gold.png" },
    { id: 5, name: 'resource_elixir', weight: 40, scale: 4, path: "resource/elixir.png" },
    { id: 6, name: 'resource_darkelixir', weight: 30, scale: 4, path: "resource/dark_elixir.png" },
    { id: 7, name: 'resource_gem', weight: 30, scale: .8, path: "resource/gem.png" },

];

const clanCastle = { id: 8, name: "clancastle", dontCluster: true, weight: 50, scale: 1.5, path: "clanCastle.png" }
SYMBOLS.push(clanCastle)
const TownHallSymbol = {
    id: 9,
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

SYMBOLS.push(TownHallSymbol)


export default class ClashOfReels extends SlotsBase {
    constructor(rootContainer, app) {
        const myConfig = {
            width: 1280,
            height: 720,
            cols: 7,
            rows: 7,
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
            timeBeforeProcessingGrid: 500,
            delayBeforeCascading: 1000,
            ghostTime: 600,
            replaceTime: 1,
            invisibleFlyby: true,
            mode: "normal",
            bounce: 2,
            bounceDuration: .5,
        };
        super(rootContainer, app, myConfig);
        this.init()
    }

    processSpecialFeatures(grid) {
        return this.simulateClanCastle(grid)
    }

    simulateClanCastle(grid) {
        const moves = [];
        const positions = this.contain(8, grid); // ID 8 is Clan Castle

        if (positions) {
            const newId = this.getRandomSymbolId(false, grid, this.config.symbols.slice(0, 4));
            positions.forEach(pos => {
                moves.push({
                    x: pos.x,
                    y: pos.y,
                    newId: newId
                });
            });
        }
        return moves;
    }
}
