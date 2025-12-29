import SlotsBase from '../game-engine/SlotsBase';

const SYMBOLS = [
    // { id: 0, name: 'troop_wallbreaker', path: "/games/ClashOfReels/Troop_HV_Wall_Breaker_1_grass.png" },
    { id: 0, name: 'troop_barbarian', weight: 20, scale: 1, path: "/games/ClashOfReels/Troop_HV_Barbarian_1_grass.png" },
    { id: 1, name: 'troop_archer', weight: 20, path: "/games/ClashOfReels/Troop_HV_Archer_1_grass.png" },
    { id: 2, name: 'troop_goblin', weight: 20, scale: 1, yOff: 10, path: "/games/ClashOfReels/Troop_HV_Goblin_1_grass.png" },
    { id: 3, name: 'troop_wizard', weight: 20, path: "/games/ClashOfReels/Troop_HV_Wizard_1_grass.png" },
    { id: 4, name: 'resource_gold', weight: 40, scale: 3, path: "/games/ClashOfReels/Icon_HV_Resource_Gold_1.png" },
    { id: 5, name: 'resource_elixir', weight: 40, scale: 3, path: "/games/ClashOfReels/Icon_HV_Resource_Elixir_1.png" },
    { id: 6, name: 'resource_darkelixir', weight: 30, scale: 3, path: "/games/ClashOfReels/Icon_HV_Resource_Dark_Elixir_1.png" },
    { id: 7, name: 'resource_gem', weight: 30, scale: .7, path: "/games/ClashOfReels/Icon_HV_Resource_Gem.png" },

];

const clanCastle = { id: 8, name: "clancastle", dontCluster: true, weight: 5, scale: 1.2, path: "/games/ClashOfReels/Building_HV_Clan_Castle_level_4.png" }
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
            ghostTime: 1000,
            invisibleFlyby: true
        };
        super(rootContainer, app, myConfig);
        this.init()
    }

    async spin() {
        if (this.processing) return;
        this.processing = true;
        this.grid = this.generateRandomResult();
        console.log(this.grid)
        await this.startSpin();
        console.log(this.grid)

        while (true) {
            await this.clanCastleLogic()
            await new Promise(resolve => setTimeout(resolve, this.config.timeBeforeProcessingGrid));
            const clusters = this.findClusters(this.grid)
            if (clusters.length === 0) break
            const replacements = this.generateReplacements(clusters)
            const nextGrid = await this.explodeAndCascade(clusters, replacements)
            console.log(nextGrid)
            this.grid = nextGrid
        }
        this.processing = false
    }

    async clanCastleLogic() {
        console.log(this.grid)
        const positions = this.contain(clanCastle.id)
        console.log(positions)
        if (positions) {
            const toChangeTo = this.getRandomSymbolId()
            console.log(positions)
            console.log(toChangeTo)
            const promises = []
            positions.forEach(position => {
                const promise = this.insertIntoGrid(position, toChangeTo)
                promises.push(promise)
            })
            await Promise.all(promises)
        }

    }
}
