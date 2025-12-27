'use client'; // Required for Next.js App Router

import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

export default function PixiCanvas({ gameClass, gameState, onGameEvent, onGameReady }) {
    const containerRef = useRef(null);
    const appRef = useRef(null);
    const gameInstanceRef = useRef(null);

    useEffect(() => {
        // 1. Initialize PIXI Application
        // We attach it to the DOM immediately
        const initPixi = async () => {
            const app = new PIXI.Application();

            await app.init({
                resizeTo: containerRef.current, // Auto-resize to div
                backgroundColor: 0x1099bb,      // Default bg
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
            });

            // Mount canvas to DOM
            containerRef.current.appendChild(app.canvas);
            appRef.current = app;

            // 2. Create a "Root Container" for Scaling
            // We will add all game objects to THIS, not app.stage directly.
            const gameContainer = new PIXI.Container();
            app.stage.addChild(gameContainer);

            // 3. Initialize the User's Game Logic
            // We pass the container, not the app, so the user can't break the scaling
            gameInstanceRef.current = new gameClass(gameContainer, app);

            // Notify React parent that the game instance is ready
            if (onGameReady) onGameReady(gameInstanceRef.current);

            // Pass initial state
            if (gameInstanceRef.current.onStateChange) {
                gameInstanceRef.current.onStateChange(gameState);
            }

            // Setup Event Emitter bridge
            gameInstanceRef.current.emitEvent = (event) => {
                if (onGameEvent) onGameEvent(event);
            };

            // 4. The Standard Scaling Logic (Interceptor)
            const handleResize = () => {
                const screenWidth = app.screen.width;
                const screenHeight = app.screen.height;

                const scaleX = screenWidth / gameInstanceRef.current.config.width;
                const scaleY = screenHeight / gameInstanceRef.current.config.height;
                const scale = Math.min(scaleX, scaleY);

                // Scale the entire game world
                gameContainer.scale.set(scale);

                // Center it (Letterboxing)
                const newWidth = gameInstanceRef.current.config.width * scale;
                const newHeight = gameInstanceRef.current.config.height * scale;

                gameContainer.x = (screenWidth - newWidth) / 2;
                gameContainer.y = (screenHeight - newHeight) / 2;
            };

            // Listen for resize
            window.addEventListener('resize', () => {
                app.resize(); // Trigger PIXI internal resize
                handleResize(); // Trigger our custom scaling
            });

            // Trigger once to set initial size
            handleResize();

            // Start the Game Loop (Ticker)
            app.ticker.add((ticker) => {
                if (gameInstanceRef.current && gameInstanceRef.current.update) {
                    gameInstanceRef.current.update(ticker.deltaTime);
                }
            });
        };

        initPixi();

        // Cleanup on Unmount
        return () => {
            if (gameInstanceRef.current && gameInstanceRef.current.destroy) {
                gameInstanceRef.current.destroy();
            }
            if (appRef.current) {
                appRef.current.destroy(true, { children: true });
            }
        };
    }, []); // Run once on mount

    // Sync React State to Game Class
    useEffect(() => {
        if (gameInstanceRef.current && gameInstanceRef.current.onStateChange) {
            gameInstanceRef.current.onStateChange(gameState);
        }
    }, [gameState]);

    return (
        <div
            ref={containerRef}
            style={{ width: '100%', height: '100%', overflow: 'hidden' }}
        />
    );
};