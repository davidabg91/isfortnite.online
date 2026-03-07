import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, AlertCircle, Calendar } from 'lucide-react';
import { Language } from '../types';

interface LeaksProps {
    language: Language;
}

interface Cosmetic {
    id: string;
    name: string;
    description: string;
    type: { value: string; displayValue: string };
    rarity: { value: string; displayValue: string };
    images: { icon: string; featured: string; smallIcon: string };
    added: string;
}

const labels = {
    en: {
        title: "Upcoming & Leaked Cosmetics",
        subtitle: "Items found in the latest patch, not yet in the Item Shop.",
        loading: "SYPHONING LEAKS...",
        error: "FAILED TO FETCH LEAKS",
        newItems: "NEW IN PATCH",
        noItems: "No new items found.",
        retry: "RETRY CONNECTION"
    },
    bg: {
        title: "Изтекли и Предстоящи Скинове",
        subtitle: "Предмети от последния пач, които още не са в магазина.",
        loading: "ИЗТЕГЛЯНЕ НА ДАННИ...",
        error: "ГРЕШКА ПРИ ВРЪЗКА",
        newItems: "НОВО В ПАЧА",
        noItems: "Няма намерени нови предмети.",
        retry: "ОПИТАЙ ОТНОВО"
    }
};

const getRarityColor = (rarity: string) => {
    const r = rarity?.toLowerCase() || '';
    if (r.includes('legendary')) return 'from-orange-500 to-yellow-600 border-orange-400';
    if (r.includes('epic')) return 'from-purple-500 to-purple-700 border-purple-400';
    if (r.includes('rare')) return 'from-blue-400 to-blue-600 border-blue-400';
    if (r.includes('uncommon')) return 'from-green-400 to-green-600 border-green-400';
    if (r.includes('marvel')) return 'from-red-500 to-red-700 border-red-500';
    if (r.includes('dc')) return 'from-blue-600 to-blue-800 border-blue-500';
    if (r.includes('icon')) return 'from-teal-300 to-cyan-500 border-cyan-300';
    if (r.includes('gaming')) return 'from-indigo-500 to-purple-600 border-indigo-400';
    if (r.includes('starwars')) return 'from-blue-800 to-blue-900 border-blue-500';
    return 'from-gray-500 to-gray-700 border-gray-400'; // Common / Unknown
};

export const Leaks: React.FC<LeaksProps> = ({ language }) => {
    const t = (labels as any)[language] || labels['en'];
    const [items, setItems] = useState<Cosmetic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [buildVersion, setBuildVersion] = useState('');

    const fetchLeaks = async () => {
        setLoading(true);
        setError(false);
        try {
            // The new API endpoint does not support 'bg' language, forcing 'en' prevents 400 Error.
            const res = await fetch('https://fortnite-api.com/v2/cosmetics/new?language=en');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();

            if (data.data?.items?.br) {
                setItems(data.data.items.br);
                setBuildVersion(data.data.build || 'Unknown');
            } else {
                setItems([]);
            }
        } catch (e) {
            console.error('Leaks fetch error:', e);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaks();
    }, [language]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 w-full text-white">
                <Loader2 className="w-16 h-16 text-teal-400 animate-spin drop-shadow-lg" />
                <p className="font-burbank text-2xl text-teal-300/80 animate-pulse tracking-widest uppercase shadow-black drop-shadow-xl">{t.loading}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center px-4 text-white w-full">
                <div className="p-6 bg-red-500/10 rounded-full border border-red-500/30">
                    <AlertCircle className="w-16 h-16 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                </div>
                <h2 className="font-burbank text-4xl text-red-400 drop-shadow-md">{t.error}</h2>
                <button onClick={fetchLeaks} className="mt-4 bg-red-600/20 hover:bg-red-600/40 text-red-200 font-burbank text-2xl px-8 py-3 rounded-xl border border-red-500/50 transition-all shadow-lg">
                    {t.retry}
                </button>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col items-center py-8">
            {/* Header */}
            <div className="w-full max-w-6xl flex flex-col items-center text-center mb-12 px-4 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-32 bg-teal-500/10 blur-[60px] rounded-full pointer-events-none"></div>

                <div className="inline-flex items-center justify-center gap-3 bg-teal-500/20 rounded-2xl border border-teal-500/40 p-4 mb-4 shadow-[0_0_20px_rgba(20,184,166,0.3)] backdrop-blur-md">
                    <Sparkles className="w-8 h-8 text-teal-400" />
                </div>

                <h1 className="font-burbank text-5xl md:text-6xl text-white italic uppercase tracking-tight drop-shadow-lg mb-2 z-10">
                    {t.title}
                </h1>

                <div className="flex flex-wrap items-center justify-center gap-3 text-white/60 font-medium z-10">
                    <span className="bg-black/40 px-3 py-1 rounded-lg border border-white/10">{t.subtitle}</span>
                    {buildVersion && <span className="bg-teal-500/20 text-teal-300 px-3 py-1 rounded-lg border border-teal-500/30 flex items-center gap-2"><Calendar className="w-4 h-4" /> Patch {buildVersion}</span>}
                </div>
            </div>

            {/* Grid */}
            <div className="w-full max-w-7xl px-4">
                {items.length === 0 ? (
                    <div className="text-center text-white/50 font-burbank text-2xl py-20">{t.noItems}</div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5 w-full">
                        {items.map((item) => {
                            const rarityStyle = getRarityColor(item.rarity?.value);
                            const imgUrl = item.images.featured || item.images.icon || item.images.smallIcon;

                            return (
                                <div key={item.id} className={`group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-b ${rarityStyle} border-2 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:z-10 aspect-[3/4]`}>
                                    {/* Image Container */}
                                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black/20">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)] opacity-50"></div>
                                        {imgUrl ? (
                                            <img
                                                src={imgUrl}
                                                alt={item.name}
                                                className="w-full h-full object-contain p-2 drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
                                                loading="lazy"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.src = 'https://fortnite-api.com/images/vbuck.png';
                                                    target.classList.add('opacity-50', 'scale-50');
                                                }}
                                            />
                                        ) : (
                                            <div className="text-white/30 text-xs">NO IMAGE</div>
                                        )}

                                        {/* Rarity & Type Badge */}
                                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider bg-black/60 text-white px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">
                                                {item.type?.displayValue || 'UNKNOWN'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Bottom Info Bar */}
                                    <div className="absolute bottom-0 w-full bg-black/80 backdrop-blur-md p-2 md:p-3 flex flex-col justify-end border-t border-white/10 transform translate-y-1 transition-transform group-hover:translate-y-0">
                                        <h3 className="font-burbank text-lg md:text-xl text-white uppercase italic leading-tight truncate drop-shadow-md">
                                            {item.name}
                                        </h3>
                                        <p className="text-white/60 text-[10px] md:text-xs truncate" title={item.description}>
                                            {item.description || 'No description'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
