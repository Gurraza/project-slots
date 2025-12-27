import SlotsBase from '../game-engine/SlotsBase';

const SYMBOLS = [
    { id: 0, name: 'troop_wallbreaker', path: "/games/ClashOfReels/Troop_HV_Wall_Breaker_1_grass.png" },
    { id: 1, name: 'troop_balloon', path: "/games/ClashOfReels/Troop_HV_Balloon_1_grass.png" },
    { id: 2, name: 'troop_wizard', path: "/games/ClashOfReels/Troop_HV_Wizard_1_grass.png" },
    { id: 3, name: 'troop_goblin', path: "/games/ClashOfReels/Troop_HV_Goblin_1_grass.png" },
    { id: 4, name: 'hero_barbarianKing', path: "/games/ClashOfReels/Barbarian_King_2_grass.png" },
    { id: 5, name: 'troop_barbarian', path: "/games/ClashOfReels/Troop_HV_Barbarian_1_grass.png" },
    { id: 6, name: 'troop_giant', path: "/games/ClashOfReels/Troop_HV_Giant_1_grass.png" },
];

const TownHallSymbol = [
    "/games/ClashOfReels/Building_HV_Town_Hall_level_1.png",
    "/games/ClashOfReels/Building_HV_Town_Hall_level_2.png",
    "/games/ClashOfReels/Building_HV_Town_Hall_level_3.png",
    "/games/ClashOfReels/Building_HV_Town_Hall_level_4.png",
    "/games/ClashOfReels/Building_HV_Town_Hall_level_5.png",
    "/games/ClashOfReels/Building_HV_Town_Hall_level_6.png",
    "/games/ClashOfReels/Building_HV_Town_Hall_level_7.png",
    "/games/ClashOfReels/Building_HV_Town_Hall_level_8.png",
    "/games/ClashOfReels/Building_HV_Town_Hall_level_9.png",
    "/games/ClashOfReels/Building_HV_Town_Hall_level_10.png",
]

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
            symbolsBeforeStop: 0,
            symbols: SYMBOLS,
            clusterSize: 4,
            timeBeforeProcessingGrid: 500,
            delayBeforeCascading: 1000,
            ghostTime: 700
        };

        super(rootContainer, app, myConfig);
        this.init()
    }

    async spin() {
        if (this.processing) return;
        this.processing = true;

        let grid = this.generateRandomResult();
        this.insertInGrid()
        grid = await this.startSpin(grid);

        while (true) {
            await new Promise(resolve => setTimeout(resolve, this.config.timeBeforeProcessingGrid));

            const clusters = this.findClusters(grid)
            const replacements = this.generateReplacements(clusters)
            grid = await this.explodeAndCascade(grid, clusters, replacements)


            if (!grid) break
        }
        this.processing = false
    }
}


