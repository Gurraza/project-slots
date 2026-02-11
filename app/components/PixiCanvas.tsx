'use client';

import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import Link from 'next/link';

export default function PixiCanvas({ gameClass, onGameReady, onResize }) {
    const containerRef = useRef(null);
    const appRef = useRef(null);
    const gameInstanceRef = useRef(null);
    const [seed, setSeed] = useState(0)

    useEffect(() => {
        const initPixi = async () => {
            const app = new PIXI.Application();

            await app.init({
                resizeTo: containerRef.current,
                backgroundColor: 0,//0x1099bb,
                backgroundAlpha: 0,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
                antialias: true
            });

            containerRef.current.appendChild(app.canvas);
            appRef.current = app;

            const gameContainer = new PIXI.Container();
            app.stage.addChild(gameContainer);

            const isMobile = window.innerWidth < 768;

            const customConfig = isMobile
                ? { width: 720, height: 1280, isMobile: true } // Portrait Mode for Mobile
                : { width: 1280, height: 720, isMobile: false }; // Landscape Mode for Desktop


            gameInstanceRef.current = new gameClass(gameContainer, app, customConfig);

            if (onGameReady) onGameReady(gameInstanceRef.current);

            setSeed(gameInstanceRef.current.engine.seed)
            gameInstanceRef.current.onNewSpin = () => {
                setSeed(gameInstanceRef.current.engine.seed)
            }

            // --- SCALING LOGIC ---
            const handleResize = () => {
                const screenWidth = app.screen.width;
                const screenHeight = app.screen.height;

                // 1. Get Game Config Dimensions
                const baseWidth = gameInstanceRef.current.config.width;
                const baseHeight = gameInstanceRef.current.config.height;

                // 2. Calculate Scale
                const scaleX = screenWidth / baseWidth;
                const scaleY = screenHeight / baseHeight;
                const scale = Math.min(scaleX, scaleY);

                // 3. Apply to Pixi Container
                gameContainer.scale.set(scale);

                // 4. Center (Letterbox)
                const newWidth = baseWidth * scale;
                const newHeight = baseHeight * scale;
                const x = (screenWidth - newWidth) / 2;
                const y = (screenHeight - newHeight) / 2;

                gameContainer.x = x;
                gameContainer.y = y;

                // 5. SEND METRICS TO REACT (New Step)
                if (onResize) {
                    onResize({
                        width: baseWidth,   // e.g. 1280
                        height: baseHeight, // e.g. 720
                        scale: scale,
                        x: x,
                        y: y,
                        isMobile: isMobile, // Useful info for UI
                        aspectRatio: baseWidth / baseHeight
                    });
                }
            };

            window.addEventListener('resize', () => {
                app.resize();
                handleResize();
            });

            handleResize();

            app.ticker.add((ticker) => {
                if (gameInstanceRef.current && gameInstanceRef.current.update) {
                    gameInstanceRef.current.update(ticker.deltaTime);
                }
            });
        };

        initPixi();

        return () => {
            if (gameInstanceRef.current && gameInstanceRef.current.destroy) {
                gameInstanceRef.current.destroy();
            }
            if (appRef.current) {
                appRef.current.destroy(true, { children: true });
            }
        };
    }, []);

    return (
        <>
            <Link href='/' className='absolute top-4 right-4'>X</Link>
            <span className='absolute top-4 left-4 text-white'>{seed}</span>
            <div
                ref={containerRef}
                style={{ width: '100%', height: '100%', overflow: 'hidden', outline: "none", userSelect: "none" }}
            />
        </>
    );
};