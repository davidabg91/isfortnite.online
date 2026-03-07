import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, AlertCircle, Calendar, X, Bell, BellOff } from 'lucide-react';
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

const LeakModal = ({
    item,
    onClose,
    isWatched,
    onToggleWatch
}: {
    item: Cosmetic;
    onClose: () => void;
    isWatched: boolean;
    onToggleWatch: (item: Cosmetic) => void;
}) => {
    const imgUrl = item.images.featured || item.images.icon || item.images.smallIcon;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center p-2 bg-black/95 backdrop-blur-xl animate-fade-in z-[999999] touch-none"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col md:flex-row shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-[210] p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all hover:rotate-90 active:scale-95"
                >
                    <X className="w-8 h-8" />
                </button>

                {/* Left Side: Image */}
                <div className={`w-full md:w-1/2 min-h-[400px] bg-gradient-to-br ${getRarityColor(item.rarity?.value)} p-8 flex items-center justify-center relative`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                    {imgUrl && (
                        <img
                            src={imgUrl}
                            alt={item.name}
                            className="max-w-full max-h-[300px] md:max-h-[450px] object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)] transform hover:scale-105 transition-transform duration-700"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://fortnite-api.com/images/vbuck.png';
                                target.classList.add('opacity-50', 'scale-50');
                            }}
                        />
                    )}
                </div>

                {/* Right Side: Info */}
                <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col overflow-y-auto custom-scrollbar">
                    <div className="mb-8">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-yellow-400 font-bold uppercase tracking-[0.3em] text-xs">{item.rarity?.displayValue} {item.type?.displayValue}</span>
                        </div>
                        <h2 className="font-burbank text-5xl md:text-7xl text-white uppercase leading-none mb-6 italic tracking-tight">{item.name}</h2>
                        <p className="text-slate-300 text-lg leading-relaxed mb-10 font-medium">{item.description}</p>
                    </div>

                    <div className="mt-auto space-y-4">
                        <button
                            onClick={() => onToggleWatch(item)}
                            className={`w-full py-4 rounded-2xl font-burbank text-2xl uppercase tracking-wider flex items-center justify-center gap-3 transition-all ${isWatched
                                    ? 'bg-teal-500/20 text-teal-400 border-2 border-teal-500/50'
                                    : 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/40'
                                }`}
                        >
                            {isWatched ? <BellOff className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                            {isWatched ? 'Unsubscribe' : 'Notify Me (Sniper)'}
                        </button>
                        <p className="text-teal-400/60 text-xs text-center font-medium uppercase tracking-widest">
                            {isWatched ? 'You will be alerted when this drops' : 'Get a browser notification when this item is released'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Leaks: React.FC<LeaksProps> = ({ language }) => {
    const t = (labels as any)[language] || labels['en'];
    const [selectedItem, setSelectedItem] = useState<Cosmetic | null>(null);
    const [items, setItems] = useState<Cosmetic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [buildVersion, setBuildVersion] = useState('');
    const [watchlist, setWatchlist] = useState<string[]>(() => {
        return JSON.parse(localStorage.getItem('fn_item_watchlist') || '[]');
    });

    useEffect(() => {
        localStorage.setItem('fn_item_watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    const toggleWatchlist = (item: Cosmetic) => {
        setWatchlist(prev => {
            const isExist = prev.includes(item.id);
            if (isExist) return prev.filter(id => id !== item.id);

            // Request notification permission if enabling
            if ("Notification" in window && Notification.permission !== "granted") {
                Notification.requestPermission();
            }

            return [...prev, item.id];
        });
    };

    // Lock body scroll when modal is open
    useEffect(() => {
        if (selectedItem) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [selectedItem]);

    const fetchLeaks = async () => {
        setLoading(true);
        setError(false);
        try {
            // Fetch newly added cosmetics
            const resCosmetics = await fetch('https://fortnite-api.com/v2/cosmetics/new?language=en');
            // Fetch current live shop
            const resShop = await fetch('https://fortnite-api.com/v2/shop?language=en');

            if (!resCosmetics.ok || !resShop.ok) throw new Error('Failed to fetch data');

            const [dataCosmetics, dataShop] = await Promise.all([
                resCosmetics.json(),
                resShop.json()
            ]);

            if (dataCosmetics.data?.items?.br) {
                // Get all item IDs currently in the shop
                const currentShopIds = new Set<string>();
                if (dataShop.data?.entries) {
                    dataShop.data.entries.forEach((entry: any) => {
                        // The new shop API uses brItems, cars, tracks, etc.
                        if (entry.brItems) {
                            entry.brItems.forEach((item: any) => currentShopIds.add(item.id));
                        }
                        // Fallback just in case
                        if (entry.items) {
                            entry.items.forEach((item: any) => currentShopIds.add(item.id));
                        }
                    });
                }

                // Filter out items that are currently in the shop, or have ever been in the shop (shopHistory exists)
                const trulyUnreleased = dataCosmetics.data.items.br.filter((item: any) => {
                    const inShopNow = currentShopIds.has(item.id);
                    const hasAppearedBefore = item.shopHistory && item.shopHistory.length > 0;
                    return !inShopNow && !hasAppearedBefore;
                });

                setItems(trulyUnreleased);
                setBuildVersion(dataCosmetics.data.build || 'Unknown');
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
                                <div onClick={() => setSelectedItem(item)} key={item.id} className={`cursor-pointer group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-b ${rarityStyle} border-2 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:z-10 aspect-[3/4]`}>
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
                                        <div className="flex justify-between items-center mb-0.5">
                                            <h3 className="font-burbank text-lg md:text-xl text-white uppercase italic leading-tight truncate drop-shadow-md flex-1">
                                                {item.name}
                                            </h3>
                                            {watchlist.includes(item.id) && <Bell className="w-3 h-3 text-teal-400 animate-pulse" />}
                                        </div>
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

            {selectedItem && (
                <LeakModal
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    isWatched={watchlist.includes(selectedItem.id)}
                    onToggleWatch={toggleWatchlist}
                />
            )}
        </div>
    );
};
