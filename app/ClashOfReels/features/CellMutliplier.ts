import GameFeature from "../../game-engine/GameFeature.ts"
import { contain } from "../../game-engine/Math.ts"
import SlotsBase from "../../game-engine/SlotsBase.ts"
import { SymbolDef, Timeline, Grid, FeatureEvent, TimelineEvent } from "../../game-engine/types.ts"
import { Container, Text } from "pixi.js"

export class CellMultiplier extends GameFeature {
    public multiplierGrid: number[][]
    public textGrid = []
    private textContainer: Container
    constructor(game: SlotsBase) {
        super(game, "CELL_MULTIPLIER", null)

        this.textContainer = new Container()
        this.textContainer.zIndex = 1101
        this.game.reelContainer.addChild(this.textContainer)

        this.multiplierGrid = Array.from({ length: this.config.cols }).map((x, i) => {
            const textRow = []
            const row = Array.from({ length: this.config.rows }).map((y, j) => {
                const text = new Text()
                text.text = 1
                text.style = {
                    fontSize: 48,
                    fontFamily: "Arial",
                    fill: "white"
                }
                text.zIndex = -1
                text.anchor.set(0.5)

                const posX = i * (this.config.symbolWidth + this.config.gapX) + this.config.symbolWidth / 2;
                const posY = (this.config.rows - 1 - j) * (this.config.symbolHeight + this.config.gapY) + this.config.symbolHeight / 2;

                text.position.set(posX, posY);

                this.textContainer.addChild(text)
                textRow.push(text)


                return 1
            })
            this.textGrid.push(textRow)
            return row
        }
        )
    }
    onSpinStart(grid: Grid): boolean {
        // Reset both the logic grid and the visual text objects
        for (let i = 0; i < this.multiplierGrid.length; i++) {
            for (let j = 0; j < this.multiplierGrid[i].length; j++) {
                // Reset numerical value to 1
                this.multiplierGrid[i][j] = 1;

                // Reset PIXI Text object
                const textObject = this.textGrid[i][j];
                if (textObject) {
                    textObject.text = "1"; // or "" if you prefer it empty
                    textObject.visible = false; // Hide it until a cluster hits
                }
            }
        }

        return true;
    }

    onClustersResolve(clusters: any[], grid: Grid, timeline: Timeline): boolean {
        if (!clusters || clusters.length === 0) return false;

        let hasUpdates = false;
        let multiplierSum = 0
        // go through our current multipliergrid and sum all above 1 then apply 
        // to the timeline event before this's win
        // and isnert a new timeline event for this animation with type CELL_MULTIPLIER_MULT
        // 1. Calculate the Multiplier Sum from the CURRENT grid state (before doubling)
        // We only care about cells that are part of the current winning clusters.
        clusters.forEach(cluster => {
            cluster.forEach((cell: { x: number, y: number }) => {
                const val = this.multiplierGrid[cell.x][cell.y];
                if (val > 1) {
                    multiplierSum += val;
                }
            });
        });

        // 2. Apply to Win & Insert Timeline Event
        if (multiplierSum > 1) {
            // A. Update the win of the previous timeline event (the spin/cascade that triggered this)
            const lastEvent = timeline[timeline.length - 1];
            if (lastEvent && typeof lastEvent.win === 'number') {
                lastEvent.win *= multiplierSum;
            }

            // B. Insert a specific event for the UI to animate the multiplication (e.g., "Total Win x 12!")
            timeline.push({
                type: "CELL_MULTIPLIER_MULT",
                multiplier: multiplierSum,
                // Optional: pass the updated total win for display purposes
                totalWin: lastEvent ? lastEvent.win : 0
            });
        }

        // Iterate through every cluster group found
        clusters.forEach(cluster => {
            cluster.forEach((cell: { x: number, y: number }) => {
                const { x, y } = cell;

                // Safety check
                if (this.multiplierGrid[x] && this.multiplierGrid[x][y] !== undefined) {
                    let val = this.multiplierGrid[x][y];

                    // Doubling Logic: 1 -> 2 -> 4 -> 8...
                    if (val <= 1) {
                        val = 2;
                    } else {
                        val *= 2;
                    }

                    this.multiplierGrid[x][y] = val;
                    hasUpdates = true;
                }
            });
        });

        // If we changed any multipliers, push a snapshot to the timeline
        if (hasUpdates) {
            timeline.push({
                type: this.type,
                updated: JSON.parse(JSON.stringify(this.multiplierGrid)),
                grid: JSON.parse(JSON.stringify(grid)) // Snapshot before explosion
            });
        }

        return true;
    }

    async onCustomEvent(event: FeatureEvent): Promise<void> {

        // this is fired on the frontend, the other code above is calculated on spin instantaniously
        // now we react to the timeline event. I want a pixi text with the multiplier to appear 
        // on the pos x and y. Also be persistant if more than one cluster appear on a spin. like first one than new cascade down and those might also
        // be a cluster. So it can add as well, if it is 2 be 4 but if 0 or 1 (the same i guess). then do not display anything
        // 

        // Loop through the data snapshot
        for (let col = 0; col < event.updated.length; col++) {
            for (let row = 0; row < event.updated[col].length; row++) {

                const multiplierValue = event.updated[col][row];
                const textObject = this.textGrid[col][row];

                if (multiplierValue > 1) {
                    // Update Text
                    textObject.text = `${multiplierValue}x`;
                    textObject.visible = true;

                    // Simple Pop Animation if the value changed
                    // (Optional: add logic to check if text changed before animating)
                    // this.animatePop(textObject);
                } else {
                    textObject.visible = false;
                }
            }
        }
    }

}