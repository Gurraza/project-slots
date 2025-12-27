import SlotsBase from '../game-engine/SlotsBase';

const SYMBOLS = [
    { id: 0, name: 'troop_wallbreaker', path: "/games/ClashOfReels/Troop_HV_Wall_Breaker_1_grass.png" },
    { id: 1, name: 'troop_goblin', path: "/games/ClashOfReels/Troop_HV_Goblin_1_grass.png" },
    { id: 2, name: 'hero_barbarianKing', path: "/games/ClashOfReels/Barbarian_King_2_grass.png" },
    { id: 3, name: 'troop_balloon', path: "/games/ClashOfReels/Troop_HV_Balloon_1_grass.png" },
    { id: 4, name: 'troop_barbarian', path: "/games/ClashOfReels/Troop_HV_Barbarian_1_grass.png" },
    { id: 5, name: 'troop_giant', path: "/games/ClashOfReels/Troop_HV_Giant_1_grass.png" },
    { id: 6, name: 'troop_wizard', path: "/games/ClashOfReels/Troop_HV_Wizard_1_grass.png" },
];

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
            gapX: 0,
            gapY: 10,
            backgroundImage: "/games/ClashOfReels/background.jpg",
            symbolsBeforeStop: 20,
            symbols: SYMBOLS
        };

        super(rootContainer, app, myConfig);
        this.init()
    }

    spin() {
        const result = [
            [4, 4, 4, 4, 4, 4, 4],
            [4, 4, 4, 4, 4, 4, 4],
            [4, 4, 4, 4, 4, 4, 4],
            [4, 4, 4, 4, 4, 4, 4],
            [4, 4, 4, 4, 4, 4, 4],
            [4, 4, 4, 4, 4, 4, 4],
            [4, 4, 4, 4, 4, 4, 4],
        ];
        this.startSpin(result).then(res => {
            console.log(res)
            // setTimeout(() => {
            //     // this.reels[0].explodeAndDrop([0, 1, 2], [3, 3, 3])
            //     // this.reels[0].explodeAndDrop([1], [0])
            //     // this.reels[0].explodeAndDrop([2], [0])

            // }, 1000)
        })
    }
}


