'use client';
import { useState, useRef, useEffect } from 'react';
import PixiCanvas from '../components/PixiCanvas';
import ClashOfReels from './ClashOfReels';

export default function CasinoPage() {
    const [gameState, setGameState] = useState({ status: 'IDLE' });
    const [layout, setLayout] = useState(null); // Stores the position/scale of the game
    const gameRef = useRef(null);
    const [winAmount, setWinAmount] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const fadeTimerRef = useRef(null)
    const [showWin, setShowWin] = useState(false)

    const handleSpin = async () => {
        setIsSpinning(true);
        if (gameRef.current && gameRef.current.startSpin) {
            setWinAmount(0);
            const result = await gameRef.current.spin();
            // 3. Update UI with the final win
            // Adjust 'result.totalWin' depending on exactly what your class returns
            if (result && typeof result.totalWin === 'number' && result.totalWin > 0) {
                setWinAmount(result.totalWin);
                setShowWin(true)
                fadeTimerRef.current = setTimeout(() => {
                    setShowWin(false)
                }, 5000);
            }

            setIsSpinning(false);
        }
    };

    useEffect(() => {
        return () => {
            if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
        };
    }, []);

    return (
        <div className="flex flex-col items-center relative justify-center min-h-screen bg-black">

            {/* 1. The Game Screen */}
            <div
                className={
                    "w-full max-w-300 absolute border-4 border-yellow-500 rounded-lg overflow-hidden"
                }
                style={{
                    backgroundImage: "url(" + ClashOfReels.backgroundImage + ")",
                    backgroundOrigin: "center",
                    backgroundSize: "cover"
                }}

            >
                <PixiCanvas
                    gameClass={ClashOfReels}
                    gameState={gameState}
                    onGameReady={(g) => (gameRef.current = g)}
                    onGameEvent={(e) => console.log('Event from Pixi:', e)}
                    onResize={(metrics) => setLayout(metrics)}
                />
                {layout && (
                    <div
                        className='z-20'
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

                        <div className="absolute w-full h-full pointer-events-none">
                            {/* Spin Button */}
                            <button
                                onClick={handleSpin}
                                style={{ pointerEvents: 'auto' }} // Re-enable clicks for the button
                                className={
                                    "absolute flex items-center justify-center flex-row flex-nowrap gap-2 bottom-10 right-10 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-8 rounded-full text-2xl shadow-[0_0_15px_rgba(234,179,8,0.6)] border-4 border-yellow-200 active:scale-95 transition-transform "
                                    + (isSpinning ? " cursor-not-allowed" : " cursor-pointer")
                                }
                            >
                                <span>SPIN</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={3}
                                    stroke="currentColor"
                                    // 'animate-spin' handles the rotation, conditional on state
                                    className={`w-8 h-8 ${isSpinning ? 'animate-spin' : ''}`}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                                    />
                                </svg>
                            </button>

                            {/* Top Left Stats Container */}
                            <div className="absolute top-5 left-5 flex flex-col gap-2 items-start">

                                {/* Balance Display */}
                                <div className="text-white font-mono text-xl bg-black/50 p-2 rounded min-w-50">
                                    BALANCE: $1,000
                                </div>

                                {/* Won Display (Only shows if winAmount >= 0, or always distinct) */}
                                <div className={"text-white font-mono text-xl bg-black/50 p-2 rounded min-w-50 flex transition-opacity justify-between " + (showWin ? " opacity-100" : " opacity-0")}>
                                    <span>WON:</span>
                                    <span className={winAmount > 0 ? "text-green-400" : "text-white"}>
                                        ${winAmount.toFixed(2)}
                                    </span>
                                </div>

                            </div>
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
}