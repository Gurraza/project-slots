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
            clusterSize: 4
        };

        super(rootContainer, app, myConfig);
        this.init()
    }

    async spin() {

        if (this.processing) {
            this.hasClusters = false;
            return;
        }
        this.processing = true

        let result = Array.from({ length: this.config.cols }, () =>
            Array.from({ length: this.config.rows }, () =>
                Math.floor(Math.random() * this.config.symbols.length)
            )
        );

        // result = [
        //     [1, 1, 1],
        //     [0, 0, 1],
        //     [1, 1, 0]
        // ]
        console.log(result)

        await this.startSpin(result)

        this.hasClusters = true
        while (this.hasClusters) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const clusters = this.findClusters(result).filter(i => i.length >= this.config.clusterSize)
            const reelClusters = clusters.flat().reduce((acc, { x, y }) => {
                // Initialize the array at index x if it doesn't exist
                if (!acc[x]) acc[x] = [];

                // Push the value into the correct index bucket
                acc[x].push(y);

                return acc;
            }, [])
            if (reelClusters.length === 0) {
                console.log("BROKE")
                this.hasClusters = false
                break;
            }
            const reel_promises = []
            for (let i = 0; i < this.reels.length; i++) {

                // const res = this.reels[i].explodeAndCascade(reelClusters[i],
                //     Array.from(
                //         { length: reelClusters[i].length },
                //         () => Math.floor(Math.random() * this.config.symbols.length)
                //     ))
                // reel_promises.push(res)
                if (reelClusters[i]) {
                    const replacements = Array.from(
                        { length: reelClusters[i].length },
                        () => Math.floor(Math.random() * this.config.symbols.length)
                    )
                    // console.log("replacements: " + replacements)
                    const res = this.reels[i].explodeAndCascade(reelClusters[i], replacements, result[i])
                    reel_promises.push(res)
                }
                else {
                    reel_promises.push(result[i])
                }
            }
            result = await Promise.all(reel_promises);
            console.log(result)
        }
        this.processing = false
    }
}


