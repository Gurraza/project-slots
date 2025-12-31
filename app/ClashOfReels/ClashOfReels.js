import SlotsBase from '../game-engine/SlotsBase';
import gsap from "gsap"
import { Assets, Sprite, Graphics, Text, Container } from "pixi.js"
import { MinesGame } from './MinesGame'; // Import the new game
const SYMBOLS = [
    {
        name: 'barbarian',
        weight: 1000,
        group: "low_troop",
        scale: .9,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "troops_icons/barbarian.png"
    },
    {
        name: 'archer',
        weight: 1000,
        group: "low_troop",
        scale: .9,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "troops_icons/archer.png"
    },
    {
        name: 'goblin',
        weight: 1000,
        group: "low_troop",
        scale: .9,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "troops_icons/goblin.png"
    },
    {
        name: 'wizard',
        weight: 800,
        scale: .9,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "troops_icons/wizard.png"
    },
    {
        name: 'wallbreaker',
        weight: 0,
        scale: .9,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "troops_icons/wallbreaker.png"
    },
    {
        name: 'gold',
        weight: 1000,
        group: "low_resource",
        scale: 4,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "resource/gold.png"
    },
    {
        name: 'elixir',
        weight: 1000,
        group: "low_resource",
        scale: 4,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "resource/elixir.png"
    },
    {
        name: 'darkelixir',
        weight: 1000,
        group: "low_resource",
        scale: 4,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "resource/dark_elixir.png"
    },
    {
        name: 'gem',
        weight: 800,
        scale: .8,
        payouts: { 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 7: 15 },
        path: "resource/gem.png",
    },

];
const clanCastle = {
    name: "clancastle",
    // landingEffect: "HEAVY_DROP",
    dontCluster: true,
    weight: 100,
    scale: 1.5,
    path: "clanCastle.png"
}

const builder = {
    name: "builder",
    scale: 4,
    path: "Builder.png",
    weight: [25],
    onlyAppearOnRoll: true,
    matchEffect: "builder_match",
    explodingEffect: "builder_poof",
    clusterSize: 1,
    dontCluster: true,
    prio: true,
}

const warden = {
    name: "warden",
    scale: 1,
    path: "Warden.png",
    weight: [25],
    dontCluster: true,
    onlyAppearOnRoll: true,
    matchEffect: "VIDEO_PLAY",
    explodeEffect: "warden_explode",
    // explodingEffect: "warden_poof",
    clusterSize: 1,
    prio: true,
    videoPath: "warden_anim.mp4",
    playbackRate: 2,
    payouts: { 0: 0, 1: 0.01, 2: 0.05, 3: 0.1, 4: 0.2, 5: 0.5, 6: 1.0, 7: 1.5, 8: 2.5, 9: 5.0, 10: 6, 11: 10, 12: 15, 13: 16, 14: 17, 15: 18, 16: 19 },
}

// const TownHallSymbol = {
//     name: "townhall",
//     weight: 5,
//     scale: 0.8,
//     dontCluster: true,
//     textureAtLevel: [
//         "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_1.png",
//         "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_2.png",
//         "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_3.png",
//         "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_4.png",
//         "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_5.png",
//         "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_6.png",
//         "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_7.png",
//         "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_8.png",
//         "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_9.png",
//         "/games/ClashOfReels/TH/Building_HV_Town_Hall_level_10.png",
//     ],
// }

const townHallSymbols = [
    "Building_HV_Town_Hall_level_1.png",
    "Building_HV_Town_Hall_level_2.png",
    "Building_HV_Town_Hall_level_3.png",
    "Building_HV_Town_Hall_level_4.png",
    "Building_HV_Town_Hall_level_5.png",
    "Building_HV_Town_Hall_level_6.png",
    "Building_HV_Town_Hall_level_7.png",
    "Building_HV_Town_Hall_level_8.png",
    "Building_HV_Town_Hall_level_9.png",
    "Building_HV_Town_Hall_level_10.png",
].map((fileName, index) => {
    return {
        name: `townhall_${index + 1}`,
        group: "townhall",
        weight: 10,
        scale: 0.8,
        dontCluster: true,
        path: `TH/${fileName}`
    };
});

const treasureSymbol = {
    name: "treasure",
    weight: [150, 50, 25],
    scale: 1.4,
    onlyAppearOnRoll: true,
    path: "Treasury.png",
    anticipation: {
        after: 2,
        count: 15,
    },
    onePerReel: true,
    dontCluster: true,
}

SYMBOLS.push(treasureSymbol)
SYMBOLS.push(builder)
SYMBOLS.push(clanCastle)
SYMBOLS.push(warden)
SYMBOLS.push(...townHallSymbols)

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
            extraAssets: [
                { name: "hammer", path: "Hammer.png" },
                { name: "grass", path: "grass.png" },
                { name: "mines_backgroundImage", path: "grass5b5.png" },
                { name: "bomb", path: "bomb.png" },

                { name: "super_barbarian", path: "bomb.png" },
                { name: "super_archer", path: "bomb.png" },
                { name: "super_goblin", path: "bomb.png" },
                { name: "super_wizard", path: "bomb.png" },
            ],
        };
        super(rootContainer, app, myConfig);
        this.minesBonus = new MinesGame(this.stage, app, {
            textureHidden: { texture: "grass", scale: .3 },
            backgroundImage: { texture: "mines_backgroundImage", scale: 1 },
            textureBomb: { texture: "bomb", scale: .6 },
            textureGem: { texture: "gem", scale: .6 },
            cols: 5,
            rows: 5,
            bombsCount: 5
        });

        this.init()
        this.createUI(); // Create the multiplier text
    }

    createUI() {
        this.multiplierText = new Text({
            text: "0",
            style: {
                fontFamily: "cocFont",
                fontSize: 50,
                fill: "gold",
                stroke: { color: "black", width: 4 }, // Updated v8 syntax
                dropShadow: true
            }
        });
        this.multiplierText.visible = false
        this.multiplierText.anchor.set(0.5);
        this.multiplierText.x = 1100; // Right side of screen
        this.multiplierText.y = 100;
        this.stage.addChild(this.multiplierText);
    }

    // Override the hook from SlotsBase
    onMultiplierChange(newVal) {
        if (!this.multiplierText) return;
        if (newVal === 0) {
            this.multiplierText.visible = false
        }
        else {
            this.multiplierText.visible = true
        }
        // Animate the change
        const formattedVal = Number(newVal).toFixed(2);

        // Animate the change
        this.multiplierText.text = `x${formattedVal}`;

        // Pop effect
        gsap.fromTo(this.multiplierText.scale,
            { x: 1.5, y: 1.5 },
            { x: 1, y: 1, duration: 0.5, ease: "elastic.out(1, 0.3)" }
        );
    }

    // Update your spin loop to read the timeline data
    async onCascadeEvent(event) {
        console.log(event)


        if (event.wardenData) {

        }
    }

    async spin() {
        // if (true) { // Change to 'true' to force bonus every spin
        //     await this.triggerBonusRound();
        // }
        this.setActiveGroupVariants('low_troop', 3);
        this.setActiveGroupVariants('low_resource', 3);
        const result = await super.spin();

        if (this.config.symbols.some(s => s.name == "townhall")) {
            this.grid.flat().filter(id => id === this.config.symbols.find(s => s.name === 'townhall')).forEach(async (symbol) => console.log(symbol))// await this.triggerTownHallBonus(symbol))
        }
        if (this.config.symbols.some(s => s.name == "treasure")) {
            this.grid.flat().filter(id => id === this.config.symbols.find(s => s.name === 'treasure').id).length >= 3 && await this.triggerMinesBonusRound();
        }


        return { grid: this.grid, totalWin: this.globalMultiplier };
    }

    calculateMoves() {
        const timeline = [];
        let currentGrid = this.generateRandomResult();
        let totalWin = 0; // Track total win for this spin

        // ... timeline initialization ...
        timeline.push({
            type: 'SPIN_START',
            grid: JSON.parse(JSON.stringify(currentGrid))
        });

        while (true) {
            let actionOccurred = false;

            // --- 1. TRANSFORMS (Clan Castle / Mystery Symbols) ---
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

            // --- 2. CLUSTER SEARCH ---
            // Because Warden has clusterSize: 1, he will trigger this block even if alone
            const rawClusters = this.findClusters(currentGrid);

            if (rawClusters.length > 0) {
                let stepWin = 0;

                // --- 3. CALCULATE PAYOUTS ---
                rawClusters.forEach(cluster => { // {x: 2, y: 4, value: 6}
                    console.log("a raw cluster", cluster)
                    const symbolId = cluster[0].value;
                    const config = this.config.symbols[symbolId];
                    const count = cluster.length;

                    if (config.payouts && !config.dontCluster) {
                        let payout = config.payouts[count];
                        if (payout === undefined) {
                            const maxKey = Math.max(...Object.keys(config.payouts).map(Number));
                            if (count > maxKey) payout = config.payouts[maxKey];
                        }
                        if (payout) stepWin += payout;
                    }
                });
                totalWin += stepWin;

                // --- 4. PREPARE EXPLOSIONS (Standard) ---
                // Convert raw clusters into the [Col][Row] format for the engine
                const clustersToProcess = Array.from({ length: this.config.cols }, () => []);
                rawClusters.flat().forEach(({ x, y }) => {
                    if (!clustersToProcess[x].includes(y)) {
                        clustersToProcess[x].push(y);
                    }
                });

                // --- 5. WARDEN LOGIC (The "Search & Destroy" Add-on) ---
                let wardenData = undefined;
                const wardenId = this.config.symbols.find(s => s.name === 'warden').id;

                // Scan grid to see if Warden is present
                for (let c = 0; c < this.config.cols; c++) {
                    for (let r = 0; r < this.config.rows; r++) {

                        if (currentGrid[c][r] === wardenId) {
                            // A. Setup Warden Position
                            // Note: Visual Y is flipped relative to Grid Y
                            const activeWardenPos = { x: c, y: this.config.rows - r - 1 };
                            const targets = [];
                            const resourceCandidates = {};
                            let count = 0

                            // B. Find Potential Targets (Low Resources)
                            for (let tc = 0; tc < this.config.cols; tc++) {
                                for (let tr = 0; tr < this.config.rows; tr++) {
                                    if (tc === c && tr === r) continue; // Don't target self

                                    const tId = currentGrid[tc][tr];
                                    const tDef = this.config.symbols[tId];

                                    if (tDef && tDef.group === "low_resource") {
                                        if (!resourceCandidates[tId]) resourceCandidates[tId] = [];
                                        resourceCandidates[tId].push({ x: tc, y: tr });
                                    }
                                }
                            }
                            const foundIds = Object.keys(resourceCandidates);
                            if (foundIds.length > 0) {
                                const randomId = foundIds[Math.floor(Math.random() * foundIds.length)];
                                targets.push(...resourceCandidates[randomId]);
                            }

                            totalWin += warden.payouts[targets.length]
                            // C. Pick One Resource Type to Destroy
                            // D. Create Animation Data for Frontend
                            wardenData = {
                                source: activeWardenPos,
                                targets: targets.map(t => ({
                                    x: t.x,
                                    y: this.config.rows - 1 - t.y
                                }))
                            };

                            // E. ADD TARGETS TO EXPLOSION LIST
                            // This ensures they disappear and trigger a cascade
                            targets.forEach(t => {
                                if (!clustersToProcess[t.x].includes(t.y)) {
                                    clustersToProcess[t.x].push(t.y);
                                }
                            });
                        }
                    }
                }

                // --- 6. CASCADE GENERATION ---
                const replacements = this.generateReplacements(clustersToProcess, currentGrid);
                currentGrid = this.simulateCascade(currentGrid, clustersToProcess, replacements);

                timeline.push({
                    type: 'CASCADE',
                    clusters: clustersToProcess,
                    replacements: replacements,
                    grid: JSON.parse(JSON.stringify(currentGrid)),
                    stepWin: stepWin,
                    totalWin: totalWin,
                    wardenData: wardenData // <--- Pass the data here
                });
                actionOccurred = true;
            }

            if (!actionOccurred) break;
        }
        return timeline;
    }

    handleSymbolLand(effect, sprite) {
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
        return new Promise(async (resolve) => {
            if (effect === "PULSE_GOLD") {
                // Flash white and scale up
                const tl = gsap.timeline({ onComplete: resolve });
                tl.to(sprite.scale, { x: sprite.scale.x * 1.2, y: sprite.scale.y * 1.2, duration: 0.1, yoyo: true, repeat: 3 })
                //.to(sprite, { pixi: { tint: 0xFFD700 }, duration: 0.1, yoyo: true, repeat: 3 }, "<");
            }
            else if (effect === "VIDEO_PLAY") {
                // We find the symbol ID attached to the sprite to get the name
                const symbolConfig = this.config.symbols.find(s => s.id === sprite.symbolId);
                const videoAlias = symbolConfig.name + "_anim";

                await this.playSymbolVideo(sprite, videoAlias);
                resolve();
            }
            else if (effect === "warden_match") {
                resolve()
            }
            else if (effect === "builder_match") {
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
        return new Promise(async (resolve) => {

            if (effect === "PARTICLES_GOLD") {
                const ghost = this.reels[index].spawnGhost(sprite)
                gsap.to(ghost.scale, { x: 0, y: 0, duration: 0.4 });
                gsap.to(ghost, {
                    rotation: 5, alpha: 0, duration: 0.4, onComplete: () => {
                        ghost.destroy()
                        resolve()
                    }
                });
            }
            else if (effect === "builder_poof") {
                const ghost = this.reels[index].spawnGhost(sprite)
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
        })
    }
    async triggerMinesBonusRound() {
        console.log("!!! ENTERING MINES BONUS !!!");
        await this.playBonusTransition();

        await gsap.to(this.reelContainer, { alpha: 0.2, duration: 0.5 });

        const totalTiles = this.minesBonus.config.cols * this.minesBonus.config.rows;
        const bombCount = this.minesBonus.config.bombsCount || 5; // Default safety
        const maxSafeMoves = totalTiles - bombCount;

        // 2. Generate a random limit between 1 and maxSafeMoves (Inclusive)
        // This determines "How many times can I click before the game forces a bomb?"
        const randomLimit = Math.floor(Math.random() * maxSafeMoves);
        const totalBonusWin = await this.minesBonus.play(1, randomLimit);
        if (this.globalMultiplier == 0) this.globalMultiplier = totalBonusWin
        this.onMultiplierChange(this.globalMultiplier); // Visual update hook


        await gsap.to(this.reelContainer, { alpha: 1, duration: 0.5 });
    }

    playBonusTransition() {
        return new Promise((resolve) => {
            // 1. Create the Container (Dark Overlay + Text)
            const overlay = new Container();
            overlay.alpha = 0;
            this.stage.addChild(overlay);

            // Dark Background
            const bg = new Graphics();
            bg.rect(0, 0, this.config.width, this.config.height).fill({ color: 0x000000, alpha: 0.7 });
            overlay.addChild(bg);

            // "BONUS" Text
            // Inside playBonusTransition()

            const text = new Text({
                text: "BONUS ROUND\nMINES",
                style: {
                    fontFamily: "Arial",
                    fontSize: 120,
                    fontWeight: "bold",
                    fill: "#FFD700", // <--- CHANGE THIS (Use a single string, remove the array)
                    stroke: { color: "#4a3c31", width: 8 },
                    dropShadow: true,
                    dropShadowColor: '#000000',
                    dropShadowBlur: 10,
                    dropShadowAngle: Math.PI / 6,
                    dropShadowDistance: 6,
                    align: "center"
                }
            });
            text.anchor.set(0.5);
            text.x = this.config.width / 2;
            text.y = this.config.height / 2;
            text.scale.set(0); // Start tiny
            overlay.addChild(text);

            // 2. Animate Sequence
            const tl = gsap.timeline({
                onComplete: () => {
                    // Cleanup and Resume
                    overlay.destroy({ children: true });
                    resolve();
                }
            });

            // Fade In Overlay
            tl.to(overlay, { alpha: 1, duration: 0.3 });

            // Pop Text In (Elastic bounce)
            tl.to(text.scale, { x: 1, y: 1, duration: 0.8, ease: "elastic.out(1, 0.3)" }, "-=0.1");

            // Pulse / Shake for excitement
            tl.to(text.scale, { x: 1.1, y: 1.1, duration: 0.1, yoyo: true, repeat: 3 });

            // Wait a moment for player to read it
            tl.to(text, { duration: 0.5 });

            // Zoom Out / Fade Away
            tl.to(text.scale, { x: 3, y: 3, duration: 0.3, ease: "power2.in" }, "exit");
            tl.to(overlay, { alpha: 0, duration: 0.3 }, "exit");
        });
    }
}