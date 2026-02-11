import GameCard, { SlotGame } from "./components/GameCard"
import { ArrowRight } from 'lucide-react';

const SLOT_GAMES: SlotGame[] = [
    {
        id: '1',
        title: 'Clash Of Reels',
        description: 'Experience the electric pulse of the city with high-speed spins and expanding wilds in our custom cyber-engine.',
        thumbnailUrl: '/games/ClashOfReels/background.jpg',
        playUrl: '/play/ClashOfReels',
        rtp: 96.5,
        volatility: 3,
    },
    {
        id: '2',
        title: 'Lines',
        description: 'Unearth ancient treasures. Features cascading reels and a unique multiplier mechanic powered by our core engine.',
        thumbnailUrl: '/games/Lines/thumbnail.png',
        playUrl: '/play/Lines',
        rtp: 95.8,
        volatility: 5,
    },
    {
        id: '3',
        title: 'Tipsy Tiles',
        description: 'A classic reimagined. Low volatility fun with sticky symbols and rapid re-spins for extended playtime.',
        thumbnailUrl: '/games/TipsyTiles/Background.png',
        playUrl: '/play/TipsyTiles',
        rtp: 97.2,
        volatility: 2,
    },
];

export default function Home() {
    return (
        <main className="min-h-screen bg-slate-950 text-slate-200">

            {/* Hero Section */}
            <section className="relative overflow-hidden border-b border-slate-800 bg-slate-900 px-6 py-24 sm:py-32 lg:px-8">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-250 h-100 bg-amber-500/20 blur-[100px] rounded-full opacity-20 pointer-events-none" />

                <div className="relative mx-auto max-w-2xl text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                        Next-Gen Gaming on the <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-400 to-yellow-600">Titan Engine</span>
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-slate-400">
                        High-fidelity slot mechanics, provably fair algorithms, and instant load times. Experience the future of browser-based casino gaming.
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        <a
                            href="#games"
                            className="rounded-md bg-amber-500 px-3.5 py-2.5 text-sm font-semibold text-slate-950 shadow-sm hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                        >
                            Play Now
                        </a>
                        <a href="#" className="text-sm font-semibold leading-6 text-white flex items-center gap-1 hover:text-amber-400 transition-colors">
                            Learn about the tech <ArrowRight size={16} />
                        </a>
                    </div>
                </div>
            </section>

            {/* Game Grid Section */}
            <section id="games" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
                <div className="mb-12 border-l-4 border-amber-500 pl-4">
                    <h2 className="text-2xl font-bold text-white">Featured Games</h2>
                    <p className="text-slate-400">Select a title to initialize the game engine.</p>
                </div>

                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {SLOT_GAMES.map((game) => (
                        <GameCard key={game.id} game={game} />
                    ))}
                </div>
            </section>
        </main>
    );
}