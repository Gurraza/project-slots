// Define types for nested objects first for cleanliness
type Asset = { alias: string; src: string };
type Group = { name: string; count: number };
export type Grid = number[][];

export interface SpinStartEvent {
    type: 'SPIN_START';
    grid: Grid;
    win?: number;
    previousWin?: number;
    totalWin?: number;
}

export interface ExplodeEvent {
    type: 'EXPLODE';
    grid: Grid;
    clusters: number[][];
    replacements: number[][];
    previousWin?: number;
    win?: number;
    totalWin?: number;
}

export interface change {
    x: number
    y: number
    newId: number
}
export interface FeatureEvent {
    type: string; // feature-specific
    grid?: Grid;
    [key: string]: any;
    previousWin?: number;
    win?: number;
    totalWin?: number;
    changes?: change[]
}

export type TimelineEvent =
    | SpinStartEvent
    | ExplodeEvent
    | FeatureEvent;

export type Timeline = TimelineEvent[];


export interface GameConfig {
    // Layout
    width: number;
    height: number;
    symbolWidth: number;
    symbolHeight: number;
    gapX: number;
    gapY: number;
    borderRadius: number;

    // Visuals
    backgroundImage: string;
    reelBackgroundImage: string;
    reelBackgroundScale: number;
    reelBackgroundOffset: { x: number; y: number };
    titleImage: string,
    symbolsBeforeStop: number;
    reelLandSymbolsDelay: number;
    invisibleFlyby: boolean;
    motionBlurStrength: number;
    font: {
        family: string;
        size: number;
        fill: string;
        dropShadow: boolean;
        stroke: { color: string; width: number };
    };
    extraAssets: Asset[];

    ui: GameUIConfig;

    // Speed
    spinSpeed: number;
    spinAcceleration: number;
    spinDeacceleration: number;
    timeBeforeProcessingGrid: number;
    delayBeforeCascading: number;
    replaceTime: number;
    windUp: number;
    staggerTime: number;

    // Game Logic
    cols: number;
    rows: number;
    clusterSize: number;
    groups?: Group[];
    freespins?: number;

    // Behind The Scenes
    pathPrefix: string;
    symbols: any; // Replace 'any' with your SYMBOLS type if you have one
    mode: string;
    defaultLandingEffect: string;
    defaultMatchEffect: string;
    defaultExplodeEffect: string;

    // Allow other properties from the ...config spread
    [key: string]: any;
}

export interface SymbolDef {
    id?: number;
    name: string;
    weight: number | number[];
    cheatWeight?: number | number[];
    scale?: number;
    backgroundColor?: any;
    baseWeight?: number | number[];
    group?: string;
    onePerReel?: boolean;
    payouts?: Record<number, number>;
    dontCluster?: boolean
    matchesWith?: string[]
    path?: string;
    texture?: any;
    textureAtLevel?: string[];
    sprite_name?: string;
    clusterSize?: number;
    onlyAppearOnRoll?: boolean;
    isSuper?: boolean;
    isEater?: boolean;
    superAbility?: string;
    anticipation?: {
        after: number;
        count: number;
    };
    multiplier?: number;
    landingEffect?: string;
    matchEffect?: string;
    explodeEffect?: string;

    playbackRate?: number;
    _originalWeight?: number | number[];
    prio?: boolean
}

export interface Point {
    x: number,
    y: number
}

type VerticalPosition =
    | { top?: number; bottom?: never }
    | { bottom?: number; top?: never };
type HorizontalPosition =
    | { left?: number; right?: never }
    | { right?: number; left?: never };

export type PositionConfig = VerticalPosition & HorizontalPosition

export interface GameUIConfig {
    spinButton: UIElementConfig;
    title: UIElementConfig;
    freeSpins?: UIElementConfig;
    multiplier?: UIElementConfig;
}

export interface UIElementConfig {
    position: PositionConfig;
    visible?: boolean;
    asset: string;
    anchor?: { x: number; y: number };
    scale: number;
}

