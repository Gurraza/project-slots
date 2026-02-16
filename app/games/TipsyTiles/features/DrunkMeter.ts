import GameFeature from "../../../game-engine/GameFeature.ts";
import gsap from "gsap";
import { Assets, Container, Graphics, Sprite, Text } from "pixi.js";
import { SymbolDef, Grid, Timeline, FeatureEvent, TimelineEvent, Transform } from "../../../game-engine/types.ts";
import SlotsBase from "../../../game-engine/SlotsBase.ts";
import { transform } from "typescript";
import { getPos } from "../../../game-engine/UI.ts";

export class DrunkMeterFeature extends GameFeature {
    private beerTowerContainer: Container;
    private beerTowerTop: Sprite;
    private beerTowerBottom: Sprite;
    private beerTowerBeer: Sprite;
    private beerTowerText: Text;
    private readonly EMPTY_Y = 415;
    private readonly MAX_HEIGHT = 450; // How tall the liquid is in pixels
    private currentBeerLevel: number = 0;
    // private readonly FULL_Y = 415 - 300; // y = 115
    private transform: Transform
    constructor(game: SlotsBase, transform: Transform) {
        // Pass null or undefined for the specific symbol if this feature manages multiple symbols
        super(game, "DRUNK_METER", undefined as any);
        this.transform = transform
    }

    init() {
        super.init();
        this.beerTowerContainer = new Container();
        this.stage.addChild(this.beerTowerContainer)

        this.beerTowerTop = new Sprite(Assets.get("_0002_BeerTower_top.png"));
        this.beerTowerBottom = new Sprite(Assets.get("_0000_BeerTower_bottom.png"));
        this.beerTowerBeer = new Sprite(Assets.get("_0001_BeerTower_beer.png"));

        this.beerTowerContainer.addChild(this.beerTowerTop)
        this.beerTowerContainer.addChild(this.beerTowerBottom)
        this.beerTowerContainer.addChild(this.beerTowerBeer)


        this.beerTowerTop.position.set(0, 0)
        this.beerTowerBottom.position.set(-25, 380)
        this.beerTowerBeer.position.set(-15, this.EMPTY_Y)

        this.beerTowerTop.zIndex = 1
        this.beerTowerBottom.zIndex = 3
        this.beerTowerBeer.zIndex = 2

        // --- PIXI v8 MASK SETUP ---
        const beerMask = new Graphics()
            // .rect(x, y, width, height)
            .rect(
                this.beerTowerBeer.x,
                0,
                this.beerTowerBeer.width,
                480
            )
            .fill(0xffffff); // .fill() replaces .beginFill() / .endFill()

        this.beerTowerContainer.addChild(beerMask);
        this.beerTowerBeer.mask = beerMask;
        this.setBeerLevel(this.currentBeerLevel)

        this.beerTowerText = new Text()
        this.beerTowerText.text = "0/100"
        this.beerTowerText.style = {
            fontSize: 24,
            fill: 0xffffff, // Red color
            fontFamily: 'Arial',
            align: 'center', // Center alignment
        }
        this.beerTowerText.zIndex = 10;
        this.beerTowerText.position.set(this.config.width - 220, 485)
        this.beerTowerContainer.addChild(this.beerTowerText)

        this.beerTowerContainer.scale = this.transform.scale || .5
        // this.beerTowerContainer.position.set(100, 100)
        const pos = getPos(this.transform.position, this.config)
        this.beerTowerContainer.position.set(pos.x, pos.y)
        console.log(pos)
    }

    getAssets() {
        return [
            { alias: "_0002_BeerTower_top.png", src: "_0002_BeerTower_top.png" },
            { alias: "_0000_BeerTower_bottom.png", src: "_0000_BeerTower_bottom.png" },
            { alias: "_0001_BeerTower_beer.png", src: "_0001_BeerTower_beer.png" },
        ];
    }

    setBeerLevel(percentage: number, duration: number = 1): void {
        // Clamp percentage between 0 and 100
        const clampedPercent = Math.max(0, Math.min(percentage, 100));

        // Calculate target Y
        // 0% -> 0px offset -> y = 415
        // 100% -> 300px offset -> y = 115
        const pixelOffset = (clampedPercent / 100) * this.MAX_HEIGHT;
        const targetY = this.EMPTY_Y - pixelOffset;

        gsap.to(this.beerTowerBeer, {
            y: targetY,
            duration: duration,
            ease: "power2.out"
        });
    }

    onSpinEnd(grid: Grid, timeline: Timeline): boolean {
        return false
    }

    onClustersFound(clusters, grid: Grid, timeline: Timeline): boolean {
        const eaterIds = this.config.symbols
            .filter(s => s.isEater)
            .map(s => s.id); // Returns something like [6, 7]

        // 2. Filter the clusters
        const filtered = clusters.filter(cluster => {
            // Check if ANY symbol in this cluster has a value that matches an eaterId
            // We use .some() because a cluster might contain Wilds (15) mixed with Eaters (6)
            return cluster.some(symbol => eaterIds.includes(symbol.value));
        });

        // If no eater clusters, stop here
        if (filtered.length === 0) return false;
        filtered.forEach(cluster => {
            this.currentBeerLevel += cluster.length * 1
        })
        // this.updateBeerLevel(newLevel)
        timeline.push({
            type: this.type,
            newLevel: this.currentBeerLevel
        })
        return false
    }


    async onCustomEvent(event: any): Promise<void> {
        const { newLevel } = event
        this.setBeerLevel(newLevel)
        this.beerTowerText.text = newLevel + "/100"
    }
}