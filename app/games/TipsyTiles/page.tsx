'use client';
import { useState, useRef, useEffect } from 'react';
import PixiCanvas from '../../components/PixiCanvas';
import TipsyTiles from './TipsyTiles';

export default function CasinoPage() {
    const [layout, setLayout] = useState(null); // Stores the position/scale of the game
    const gameRef = useRef(null);

    return (
        <div className="flex flex-col items-center relative justify-center min-h-screen bg-black">
            {/* 1. The Game Screen */}
            <div className={"w-full h-full inset-0 absolute"}>
                <PixiCanvas
                    gameClass={TipsyTiles}
                    onGameReady={(g) => (gameRef.current = g)}
                    onResize={(metrics) => setLayout(metrics)}
                />
            </div>
        </div>
    );
}