'use client';
import { useState, useRef } from 'react';
import PixiCanvas from '../components/PixiCanvas';
import ClashOfReels from './ClashOfReels';

export default function CasinoPage() {
    const [gameState, setGameState] = useState({ status: 'IDLE' });
    const gameRef = useRef(null);

    const handleSpin = () => {
        if (gameRef.current && gameRef.current.startSpin) {
            gameRef.current.spin();
        }
    };

    return (
        <div className="flex flex-col items-center relative justify-center min-h-screen bg-black">

            {/* 1. The Game Screen */}
            <div className="w-full max-w-250 absolute aspect-video border-4 border-yellow-500 rounded-lg overflow-hidden">
                <PixiCanvas
                    gameClass={ClashOfReels}
                    gameState={gameState}
                    onGameReady={(g) => (gameRef.current = g)}
                    onGameEvent={(e) => console.log('Event from Pixi:', e)}
                />
                {/* 2. The React UI Controls */}
                <div className="w-full bottom-0 absolute z-10 rounded-xl flex gap-4">
                    <button
                        onClick={handleSpin}
                        className="cursor-pointer mx-auto rounded-md px-6 py-2 text-white bg-black"
                    >
                        SPIN
                    </button>
                </div>
            </div>


        </div>
    );
}