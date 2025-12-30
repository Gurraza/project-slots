import SlotsBase from '../game-engine/SlotsBase';
import gsap from "gsap"
import { Assets, Sprite, Graphics } from "pixi.js"

const SYMBOLS = [
    { weight: 50, name: 'troop_barbarian', group: "low_troop", scale: .9, path: "troops_icons/barbarian.png" },
    { weight: 50, name: 'troop_archer', group: "low_troop", scale: .9, path: "troops_icons/archer.png" },
    { weight: 50, name: 'troop_goblin', group: "low_troop", scale: .9, path: "troops_icons/goblin.png" },

    { weight: 35, name: 'troop_wizard', scale: .9, path: "troops_icons/wizard.png" },
    { weight: 0, name: 'troop_wallbreaker', scale: .9, path: "troops_icons/wallbreaker.png" },

    { weight: 100, name: 'resource_gold', group: "low_resource", scale: 4, path: "resource/gold.png" },
    { weight: 100, name: 'resource_elixir', group: "low_resource", scale: 4, path: "resource/elixir.png" },
    { weight: 100, name: 'resource_darkelixir', group: "low_resource", scale: 4, path: "resource/dark_elixir.png" },

    {
        weight: 70,
        name: 'resource_gem',
        scale: .8,
        path: "resource/gem.png",
    },

];
const clanCastle = {
    name: "clancastle",
    // landingEffect: "HEAVY_DROP",
    dontCluster: true,
    weight: 30,
    scale: 1.5,
    path: "clanCastle.png"
}

const builder = {
    name: "builder",
    scale: 4,
    path: "Builder.png",
    weight: [5],
    onlyAppearOnRoll: true,
    matchEffect: "builder_match",
    explodingEffect: "builder_poof",
    clusterSize: 1,
    prio: true,
}

const warden = {
    name: "warden",
    scale: 1,
    path: "Warden.png",
    weight: [5],
    onlyAppearOnRoll: true,
    matchEffect: "PULSE_GOLD",
    // explodingEffect: "warden_poof",
    clusterSize: 1,
    prio: true,
}
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
    // anticipation: {
    //     after: 2,
    //     count: 15,
    // },
}
const treasureSymbol = {
    name: "treasure",
    weight: [5, 4, 1],
    scale: 1.4,
    onlyAppearOnRoll: true,
    path: "Treasury.png",
    anticipation: {
        after: 2,
        count: 15,
    },
    onePerReel: true,
}

SYMBOLS.push(TownHallSymbol)
SYMBOLS.push(treasureSymbol)
SYMBOLS.push(builder)
SYMBOLS.push(clanCastle)
SYMBOLS.push(warden)

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
            motionBlurStrength: .8,
            defaultLandingEffect: "HEAVY_LAND",
            defaultMatchEffect: "PULSE_GOLD",
            defaultExplodeEffect: "PARTICLES_GOLD",
            extraAssets: [{ name: "hammer", path: "Hammer.png" }]
        };

        super(rootContainer, app, myConfig);
        this.init()
    }

    async spin() {
        this.setActiveGroupVariants('low_troop', 2);
        this.setActiveGroupVariants('low_resource', 2);
        return super.spin();
    }

    // 1. OVERRIDE THE HOOK
    async onCascadeEvent(event) {
        // Check if our calculation logic passed any Warden Data
        if (event.wardenData) {
            // await this.animateWardenBeams(event.wardenData);

            // OPTIONAL: Do something with the targets now that beams hit
            // event.wardenData.targets.forEach(target => { ... })
        }
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

            const moves = this.simulateChangeSymbols(currentGrid, clanCastle.id, this.config.symbols.filter(s => s.group == "low_troop"));
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
                let clustersToProcess = clusters;
                let wardenData = undefined
                const priorityClusters = clusters.map(() => []);
                let foundPrioritySymbol = false;

                for (let colIndex = 0; colIndex < clusters.length; colIndex++) {
                    const col = clusters[colIndex];
                    if (!col || col.length === 0) continue;

                    for (const rowIndex of col) {
                        const symbolId = currentGrid[colIndex][rowIndex];
                        const symbolDef = this.config.symbols[symbolId];

                        if (symbolDef && symbolDef.prio === true) {
                            foundPrioritySymbol = true;
                            priorityClusters[colIndex].push(rowIndex);
                        }

                        if (symbolId === warden.id) {
                            // Source: Visual Coordinate (Flipped because Row 0 is Bottom)
                            const activeWardenPos = { x: colIndex, y: this.config.rows - rowIndex - 1 };
                            const targets = [];

                            // 1. Map all "low_resource" symbols currently on the grid
                            const resourceCandidates = {}; // Object to group coords by Symbol ID

                            for (let c = 0; c < this.config.cols; c++) {
                                for (let r = 0; r < this.config.rows; r++) {
                                    // Skip the Warden himself (logic safety)
                                    if (c === colIndex && r === rowIndex) continue;

                                    const sId = currentGrid[c][r];
                                    const sDef = this.config.symbols[sId];

                                    // Check if this symbol belongs to the target group
                                    if (sDef && sDef.group === "low_resource") {
                                        if (!resourceCandidates[sId]) {
                                            resourceCandidates[sId] = [];
                                        }
                                        // Store DATA coordinates (0 is bottom)
                                        resourceCandidates[sId].push({ x: c, y: r });
                                    }
                                }
                            }

                            // 2. Pick a random Symbol ID from those found
                            const foundIds = Object.keys(resourceCandidates);
                            if (foundIds.length > 0) {
                                const randomId = foundIds[Math.floor(Math.random() * foundIds.length)];
                                // 3. Target ALL instances of that symbol
                                targets.push(...resourceCandidates[randomId]);
                            }

                            // 4. Create Animation Data (Convert Targets to VISUAL coordinates)
                            wardenData = {
                                source: activeWardenPos,
                                targets: targets.map(t => ({
                                    x: t.x,
                                    y: this.config.rows - 1 - t.y // Flip Y for Top-Down renderer
                                }))
                            }

                            // 5. Add targets to Game Logic (Keep DATA coordinates)
                            targets.forEach(t => {
                                if (!priorityClusters[t.x].includes(t.y)) {
                                    priorityClusters[t.x].push(t.y);
                                }
                            });

                        }
                    }
                }
                if (foundPrioritySymbol) {
                    clustersToProcess = priorityClusters;
                }

                const replacements = this.generateReplacements(clustersToProcess, currentGrid);
                currentGrid = this.simulateCascade(currentGrid, clustersToProcess, replacements);

                timeline.push({
                    type: 'CASCADE',
                    clusters: clustersToProcess,
                    replacements: replacements,
                    grid: JSON.parse(JSON.stringify(currentGrid)),
                    wardenData
                });
                actionOccurred = true;
            }

            if (!actionOccurred) break;
        }
        return timeline;
    }

    handleSymbolLand(effect, sprite) {
        console.log(effect)
        gsap.killTweensOf(sprite.scale);
        const baseScaleX = sprite.scale.x;
        const baseScaleY = sprite.scale.y;

        return new Promise(resolve => {
            if (effect === "HEAVY_LAND") {
                gsap.fromTo(sprite, { y: sprite.y - 10 }, { y: sprite.y, duration: 0.2, ease: "bounce.out", onComplete: resolve });
            }
            else {
                resolve();
            }
        });
    }

    handleSymbolMatch(effect, sprite) {
        return new Promise(resolve => {
            if (effect === "PULSE_GOLD") {
                // Flash white and scale up
                const tl = gsap.timeline({ onComplete: resolve });
                tl.to(sprite.scale, { x: sprite.scale.x * 1.2, y: sprite.scale.y * 1.2, duration: 0.1, yoyo: true, repeat: 3 })
                    .to(sprite, { pixi: { tint: 0xFFD700 }, duration: 0.1, yoyo: true, repeat: 3 }, "<");
            }
            else if (effect === "warden_match") {
                resolve()
            }
            else if (effect === "builder_match") {
                console.log("builder_land")
                const hammerTexture = Assets.get("hammer");
                const hammer = new Sprite(hammerTexture);

                this.stage.addChild(hammer);

                const globalPos = sprite.getGlobalPosition();
                hammer.anchor.set(0.5, 1);
                hammer.x = -100;
                hammer.y = globalPos.y + (sprite.height / 2);
                hammer.scale.set(.1);

                // 3. Animation Timeline
                const tl = gsap.timeline({
                    onComplete: () => {
                        hammer.destroy();
                        resolve();
                    }
                });

                // Glide In
                tl.to(hammer, {
                    x: globalPos.x,
                    duration: 0.4,
                    ease: "back.out(1)"
                });

                // Smash Down
                tl.to(hammer, {
                    rotation: -0.5, // Cock back
                    duration: 0.1
                })
                    .to(hammer, {
                        rotation: 0.5, // BAM!
                        duration: 0.1,
                        ease: "power1.in",
                        onComplete: () => {
                            // Optional: Shake the Builder symbol
                            gsap.to(sprite, { x: sprite.x + 5, yoyo: true, repeat: 3, duration: 0.05 });
                        }
                    });

                // Wait a beat
                tl.to(hammer, { duration: 0.2 });

                // Fly Out Right
                tl.to(hammer, {
                    x: this.config.width + 200,
                    duration: 0.4,
                    ease: "power1.in"
                });
            }
            else {
                resolve();
            }
        });
    }

    handleSymbolExplode(effect, sprite, index) {
        if (effect === "PARTICLES_GOLD") {
            const ghost = this.reels[index].spawnGhost(sprite)
            gsap.to(ghost.scale, { x: 0, y: 0, duration: 0.4 });
            gsap.to(ghost, {
                rotation: 5, alpha: 0, duration: 0.4, onComplete: () => {
                    console.log("destory?")
                    ghost.destroy()
                }
            });
        }
        else if (effect === "builder_poof") {
            console.log("builder_poof")
            gsap.to(ghost, {
                alpha: 0,
                y: ghost.y - 50,
                duration: 0.5,
                onComplete: () => {
                    ghost.destroy();
                    resolve();
                }
            });
        }
        else {
            console.log("PLEASE2")
        }
    }
}


function shuffle(array) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
}