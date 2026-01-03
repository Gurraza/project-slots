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
    const [freeSpins, setFreeSpins] = useState(0)
    const [freeSpinOpen, setFreeSpinOpen] = useState(false)

    const handleSpin = async () => {
        setIsSpinning(true);
        if (gameRef.current && gameRef.current.startSpin) {
            setWinAmount(0);
            //672289205338
            const result = await gameRef.current.spin(672289205338);
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

    const handleGameEvent = (event) => {
        // Log all events for debugging
        console.log('Event from Pixi:', event);

        // Check for your specific event type
        if (event && event.type === 'FREE_SPINS_UPDATE') {
            if (event.open == true) {
                setFreeSpinOpen(true)
            }
            else {

                setFreeSpinOpen(false)
            }
            setFreeSpins(event.count);
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
                    "w-full max-w-300 absolute bg-center border-4 border-yellow-500 rounded-lg overflow-hidden"
                }
                style={{
                    backgroundImage: "url(" + ClashOfReels.backgroundImage + ")",
                    // backgroundOrigin: "center",
                    backgroundSize: "cover",
                }}

            >
                <PixiCanvas
                    gameClass={ClashOfReels}
                    gameState={gameState}
                    onGameReady={(g) => (gameRef.current = g)}
                    onGameEvent={handleGameEvent}
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
                            <span className='text-white' style={{ fontFamily: "cocFont" }}></span>
                            {/* Spin Button */}
                            <div className={
                                'absolute flex flex-col justify-center items-center bottom-20'
                                + (layout.isMobile ? " w-70 left-1/2 -translate-x-1/2" : " w-50 right-10")

                            }>
                                <button
                                    onClick={handleSpin}
                                    style={{ pointerEvents: 'auto' }} // Re-enable clicks for the button
                                    className={
                                        "ransition-all absolute bottom-0 z-10"
                                        + (isSpinning ? " cursor-not-allowed scale-95 grayscale-100" : " cursor-pointer")
                                    }
                                >
                                    <img className='w-full h-auto' src="/games/ClashOfReels/spin_button.png" />
                                </button>
                                <div className={'absolute transition-all scale-95 ' + (freeSpinOpen ? "-bottom-14.25" : "bottom-0")}>
                                    <img className='w-full h-auto ' src="/games/ClashOfReels/free_spins_remaining.png" />
                                    <span className='absolute text-white right-6 bottom-2.5' style={{ fontFamily: "cocFont" }}>{freeSpins}</span>
                                </div>
                            </div>

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
                            {/* <div className='absolute bottom-5 left-5 flex flex-col gap-2 items-start'>
                                <button
                                    className='text-black pointer-events-auto rounded-md bg-amber-200 px-4 py-2 cursor-pointer'
                                    onClick={() => {
                                        gameRef.current.forceSymbol("treasureGoblin")
                                    }}>
                                    force treasure_goblin
                                </button>
                            </div> */}
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
}