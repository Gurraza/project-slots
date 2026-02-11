import { Star, Play, Info } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export interface SlotGame {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    playUrl: string;
    rtp: number;
    volatility: number; // 0 to 5
}

interface GameCardProps {
    game: SlotGame;
}

export default function GameCard({ game }: GameCardProps) {
    return (
        <div className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/10">
            {/* Thumbnail */}
            <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                <div className="absolute inset-0 flex items-center justify-center text-slate-700">
                    {/* Placeholder for real image */}
                    <Image
                        src={game.thumbnailUrl}
                        alt={game.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                </div>
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center gap-4">
                    <Link href={game.playUrl} className="p-3 bg-amber-500 rounded-full text-black hover:bg-amber-400 transition-colors">
                        <Play size={24} fill="currentColor" />
                    </Link>
                    <button className="p-3 bg-slate-800 rounded-full text-white hover:bg-slate-700 transition-colors">
                        <Info size={24} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-5">
                <div className="mb-4 flex items-start justify-between">
                    <h3 className="text-xl font-bold text-slate-100">{game.title}</h3>
                    <span className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-amber-500">
                        RTP {game.rtp}%
                    </span>
                </div>

                <p className="mb-6 line-clamp-2 text-sm text-slate-400">
                    {game.description}
                </p>

                {/* Volatility & Action */}
                <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Volatility</span>
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, index) => (
                                <Star
                                    key={index}
                                    size={14}
                                    className={index < game.volatility ? "text-amber-500" : "text-slate-700"}
                                    fill={index < game.volatility ? "currentColor" : "none"}
                                />
                            ))}
                        </div>
                    </div>

                    <Link
                        href={game.playUrl}
                        className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-500 transition-colors hover:bg-amber-500 hover:text-slate-950"
                    >
                        Launch <Play size={14} />
                    </Link>
                </div>
            </div>
        </div>
    );
}