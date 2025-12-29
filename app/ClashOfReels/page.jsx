'use client';
import { useState, useRef } from 'react';
import PixiCanvas from '../components/PixiCanvas';
import ClashOfReels from './ClashOfReels';

export default function CasinoPage() {
    const [gameState, setGameState] = useState({ status: 'IDLE' });
    const [layout, setLayout] = useState(null); // Stores the position/scale of the game
    const gameRef = useRef(null);

    const handleSpin = () => {
        if (gameRef.current && gameRef.current.startSpin) {
            gameRef.current.spin();
        }
    };

    return (
        <div className="flex flex-col items-center relative justify-center min-h-screen bg-black">

            {/* 1. The Game Screen */}
            <div
                className="w-full max-w-300 absolute aspect-video border-4 border-yellow-500 rounded-lg overflow-hidden"
                style={{
                    backgroundImage: 'url(' + ClashOfReels.backgroundImage + ')',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                <PixiCanvas
                    gameClass={ClashOfReels}
                    gameState={gameState}
                    onGameReady={(g) => (gameRef.current = g)}
                    onGameEvent={(e) => console.log('Event from Pixi:', e)}
                    onResize={(metrics) => setLayout(metrics)}
                />
                {/* UI OVERLAY CONTAINER
                    This div creates a coordinate system that matches the game perfectly.
                    1. It is sized to the Game's Base Resolution (e.g. 1280x720)
                    2. It is transformed (Scaled & Moved) to match the Canvas content
                */}
                {layout && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: `${layout.width}px`,
                            height: `${layout.height}px`,
                            transform: `translate(${layout.x}px, ${layout.y}px) scale(${layout.scale})`,
                            transformOrigin: '0 0', // Scale from top-left
                            pointerEvents: 'none',  // Let clicks pass through to canvas
                        }}
                    >
                        {/* INSIDE HERE: You can position elements using pixels relative to 
                           the game resolution (1280x720).
                           Example: button at x:500, y:600
                        */}

                        <div className="absolute w-full h-full pointer-events-none">
                            {/* Spin Button */}
                            <button
                                onClick={handleSpin}
                                style={{ pointerEvents: 'auto' }} // Re-enable clicks for the button
                                className="absolute bottom-10 right-10 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-8 rounded-full text-2xl shadow-[0_0_15px_rgba(234,179,8,0.6)] border-4 border-yellow-200 active:scale-95 transition-transform"
                            >
                                SPIN
                            </button>

                            {/* Example: Top Left Logo/Text */}
                            <div className="absolute top-5 left-5 text-white font-mono text-xl bg-black/50 p-2 rounded">
                                BALANCE: $1,000
                            </div>
                        </div>
                    </div>
                )}
                {/* 2. The React UI Controls */}
                {/* <div className="w-full h-full top-0 left-0 absolute z-10">
                    <button
                        onClick={handleSpin}
                        className="cursor-pointer z-30 bottom-0 left-0 absolute  rounded-full aspect-square p-12 text-white bg-black"
                    >
                        SPIN
                    </button>
                </div> */}
            </div>


        </div>
    );
}