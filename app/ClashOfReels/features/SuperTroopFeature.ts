import GameFeature from "../../game-engine/GameFeature"
import gsap from "gsap"

const featureSymbols = [
    {
        name: 'super_barbarian',
        matchesWith: 'barbarian', // Critical for clustering
        isSuper: true,
        weight: 0, // 0 weight because they only appear via Clan Castle
        scale: .9,
        payouts: { 3: 1.0, 4: 2.0, 5: 5.0 }, // Higher payouts?
        path: "super/super_barbarian.png", // Ensure this exists or use placeholder
        superAbility: "EXPLODE_NEIGHBORS",
        explodeEffect: "CAMERA_SHAKE",
        multiplier: 2,
    },
    {
        name: 'super_archer',
        matchesWith: 'archer',
        isSuper: true,
        weight: 0,
        scale: .9,
        payouts: { 3: 1.0, 4: 2.0, 5: 5.0 },
        path: "super/super_archer.png",
        superAbility: "SHOOT_ARROWS",
        explodeEffect: "CAMERA_SHAKE",
        multiplier: 2,
    },
    {
        name: 'super_goblin',
        matchesWith: 'goblin',
        isSuper: true,
        weight: 0,
        scale: .9,
        payouts: { 3: 1.0, 4: 2.0, 5: 5.0 },
        path: "super/super_goblin.png",
        superAbility: "EXPLODE_NEIGHBORS",
        explodeEffect: "CAMERA_SHAKE",
        multiplier: 2,
    },
    {
        name: 'super_wizard',
        matchesWith: 'wizard',
        isSuper: true,
        weight: 0,
        scale: .9,
        payouts: { 3: 1.0, 4: 2.0, 5: 5.0 },
        path: "super/super_wizard.png",
        superAbility: "EXPLODE_NEIGHBORS",
        explodeEffect: "CAMERA_SHAKE",
        multiplier: 2,
    }
];

export class SuperTroopFeature extends GameFeature {
    constructor(game) {
        super(game, "SUPER_TROOP_FEATURE", null)
        this.effects = [
            "CAMERA_SHAKE"
        ]
    }

    getSymbols() {
        return featureSymbols;
    }


    async init() {

    }

    onClustersResolve(clusters, grid, timeline) {
        let abilityTriggered = false;

        clusters.forEach(cluster => {
            // Check if this cluster has a super symbol
            const superNode = cluster.find(node => {
                const sym = this.config.symbols[node.value];
                return sym.isSuper;
            });

            if (superNode) {
                const symConfig = this.config.symbols[superNode.value];

                // 1. Push a specific event for the ability triggers
                // This decouples the "Ability" from the "Cascade"
                timeline.push({
                    type: this.type,
                    symbolName: symConfig.name,
                    ability: symConfig.superAbility,
                    origin: { x: superNode.x, y: superNode.y },
                    grid: JSON.parse(JSON.stringify(grid)) // Snapshot before explosion
                });

                abilityTriggered = true;
            }
        });

        return abilityTriggered;
    }

    async playEffect(effect, sprite, symbol) {
        if (effect === "CAMERA_SHAKE") {
            const whatToMove = this.stage
            const startX = whatToMove.x
            const startY = whatToMove.y
            const duration = 0.5;   // Total time
            const shakes = 15;      // How many rapid movements
            const intensity = 5;    // Max pixel offset (Amplitutde)
            const keyframes = [];

            for (let i = 0; i < shakes; i++) {
                const decay = 1 - (i / shakes);
                const x = (Math.random() * intensity * 2 - intensity) * decay;
                const y = (Math.random() * intensity * 2 - intensity) * decay;

                keyframes.push({
                    x: startX + x,
                    y: startY + y,
                    duration: duration / shakes
                });
            }

            keyframes.push({ x: startX, y: startY, rotation: 0, duration: 0.1, ease: "power2.out" });


            await gsap.to(this.stage, {
                keyframes: keyframes,
            });
        }
    }


    async onCustomEvent(event) {
        console.log("super event", event)
    }

}