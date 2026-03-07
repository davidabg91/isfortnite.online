import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchFortniteShop } from '../services/fortniteShopService';
import { analyzeShopItems } from '../services/geminiService';
import { ShopItem, ShopResponse as ShopData, Language } from '../types';
import { getTranslation } from '../translations';
import { X, Clock, Loader2, AlertCircle, ChevronUp, Sparkles, Heart, TrendingUp, Zap } from 'lucide-react';

const getRarityColor = (rarity: string) => {
    const r = rarity.toLowerCase();
    if (r.includes('legendary')) return 'from-orange-500 to-yellow-600 border-orange-400';
    if (r.includes('epic')) return 'from-purple-600 to-indigo-700 border-purple-400';
    if (r.includes('rare')) return 'from-blue-500 to-cyan-600 border-blue-400';
    if (r.includes('uncommon')) return 'from-green-500 to-emerald-600 border-green-400';
    return 'from-gray-500 to-gray-700 border-gray-400';
};

const ItemModal = ({
    item,
    vbuckIcon,
    onClose,
    language,
    isWishlisted,
    onToggleWishlist
}: {
    item: ShopItem;
    vbuckIcon?: string;
    onClose: () => void;
    language: Language;
    isWishlisted: boolean;
    onToggleWishlist: (e: React.MouseEvent, id: string) => void;
}) => {
    const t = getTranslation(language);

    return (
        <div
            className="fixed inset-0 flex items-start md:items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto"
            style={{ zIndex: 999990 }}
        >
            <div className="relative w-full max-w-5xl bg-slate-900 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col md:flex-row my-auto">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-[210] p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all hover:rotate-90 active:scale-95"
                >
                    <X className="w-8 h-8" />
                </button>

                {/* Left Side: Image */}
                <div className={`w-full md:w-1/2 min-h-[400px] bg-gradient-to-br ${getRarityColor(item.rarity)} p-8 flex items-center justify-center relative`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                    <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="max-w-full max-h-[450px] object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)] transform hover:scale-105 transition-transform duration-700"
                    />

                    {/* Worth It Overlay */}
                    {item.aiAnalysis && item.aiAnalysis.score >= 8 && (
                        <div className="absolute bottom-8 left-8 bg-white text-black px-6 py-3 rounded-2xl font-black text-xl flex items-center gap-2 shadow-2xl animate-bounce">
                            <Zap className="w-6 h-6 fill-yellow-400 text-yellow-500" />
                            WORTH IT! {item.aiAnalysis.score}/10
                        </div>
                    )}
                </div>

                {/* Right Side: Info & AI */}
                <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <div className="mb-8">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-yellow-400 font-bold uppercase tracking-[0.3em] text-xs">{item.rarity} {item.type}</span>
                        </div>
                        <h2 className="font-burbank text-5xl md:text-7xl text-white uppercase leading-none mb-6 italic tracking-tight">{item.name}</h2>

                        <div className="flex flex-wrap items-center gap-4 mb-8">
                            <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
                                {vbuckIcon && <img src={vbuckIcon} alt="V-Bucks" className="w-8 h-8" />}
                                <span className="text-white font-burbank text-4xl">{item.price.toLocaleString()}</span>
                            </div>

                            <button
                                onClick={(e) => onToggleWishlist(e, item.id)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all font-bold uppercase text-sm ${isWishlisted ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'}`}
                            >
                                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                            </button>

                            {item.isBundle && (
                                <span className="bg-yellow-400 text-black px-5 py-2 rounded-xl font-black uppercase text-sm italic skew-x-[-12deg]">BUNDLE SAVINGS</span>
                            )}
                        </div>

                        <p className="text-slate-300 text-lg leading-relaxed mb-10 font-medium">{item.description}</p>
                    </div>

                    {/* AI Analysis Section */}
                    {item.aiAnalysis && (
                        <div className="space-y-6 pt-8 border-t border-white/10">
                            <div className="flex items-center gap-3 text-purple-400">
                                <Sparkles className="w-6 h-6" />
                                <h3 className="font-bold uppercase tracking-widest text-sm">{t.ai_worth_it}</h3>
                            </div>

                            <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                                <p className="text-slate-100 text-lg italic mb-4">"{item.aiAnalysis.reason[language]}"</p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Deal Score</span>
                                        <div className="flex items-end gap-1">
                                            <span className="text-2xl font-bold text-white">{item.aiAnalysis.score}</span>
                                            <span className="text-slate-600 font-bold mb-1">/10</span>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Rarity Score</span>
                                        <div className="flex items-end gap-1">
                                            <span className="text-2xl font-bold text-white">{item.aiAnalysis.rarityScore}</span>
                                            <span className="text-slate-600 font-bold mb-1">/10</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Combos */}
                            {item.aiAnalysis.recommendedCombos && (
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp className="w-3 h-3" /> {t.ai_combos}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {item.aiAnalysis.recommendedCombos.map((combo, i) => (
                                            <span key={i} className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-xs font-bold text-purple-300 uppercase italic">
                                                {combo}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ShopItemCard = ({
    item,
    vbuckIcon,
    onSelect,
    isWishlisted,
    onToggleWishlist,
}: {
    item: ShopItem;
    vbuckIcon?: string;
    onSelect: (item: ShopItem) => void;
    isWishlisted: boolean;
    onToggleWishlist: (e: React.MouseEvent, id: string) => void;
}) => {
    return (
        <div
            onClick={() => onSelect(item)}
            className="group relative flex flex-col bg-slate-900/40 border border-white/10 rounded-3xl overflow-hidden transform transition-all duration-500 hover:scale-[1.05] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] cursor-pointer"
        >
            <div className={`h-56 w-full bg-gradient-to-b ${getRarityColor(item.rarity)} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
                <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain p-4 drop-shadow-2xl relative z-10"
                    loading="lazy"
                />

                {/* Wishlist Button */}
                <button
                    onClick={(e) => onToggleWishlist(e, item.id)}
                    className="absolute top-4 right-4 z-20 p-2 bg-black/50 backdrop-blur-md rounded-xl border border-white/10 text-white/60 hover:text-white transition-all active:scale-90"
                >
                    <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                </button>

                {/* Hot Label */}
                {item.aiAnalysis && item.aiAnalysis.score >= 8 && (
                    <div className="absolute top-4 left-4 z-20 bg-yellow-400 text-black px-3 py-1 rounded-lg font-black text-[10px] uppercase shadow-lg border border-yellow-500">
                        🔥 HOT
                    </div>
                )}
            </div>

            <div className="p-5 flex flex-col flex-grow bg-slate-900">
                <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-burbank text-2xl text-white uppercase tracking-tight truncate leading-none">
                        {item.name}
                    </h3>
                </div>

                <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1.5">
                        {vbuckIcon && <img src={vbuckIcon} alt="V" className="w-5 h-5" />}
                        <span className="text-white font-burbank text-2xl">
                            {item.price.toLocaleString()}
                        </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase bg-white/5 px-2 py-1 rounded-md">{item.type}</span>
                </div>

                {item.aiAnalysis && (
                    <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-purple-400">
                                <Sparkles className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">AI Score</span>
                            </div>
                            <span className="text-xs font-black text-white px-2 py-0.5 bg-purple-500/20 rounded-md border border-purple-500/30">
                                {item.aiAnalysis.score}/10
                            </span>
                        </div>
                        {item.aiAnalysis.recommendedCombos && item.aiAnalysis.recommendedCombos.length > 0 && (
                            <div className="flex items-center gap-1.5 text-blue-400">
                                <TrendingUp className="w-3 h-3" />
                                <span className="text-[9px] font-bold uppercase tracking-wider">Combos Available</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const Shop = ({ language }: { language: Language }) => {
    const [shopData, setShopData] = useState<ShopData | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [wishlist, setWishlist] = useState<string[]>(JSON.parse(localStorage.getItem('fn_wishlist') || '[]'));
    const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

    const bgCategoryNames: Record<string, string> = {
        'Daily': 'ЕЖЕДНЕВНИ',
        'Featured': 'ОСНОВНИ',
        'Bundles': 'БЪНДЪЛИ',
        'Special': 'СПЕЦИАЛНИ',
        'All': 'ВСИЧКИ',
        'outfit': 'Скинове',
        'backpack': 'Раници',
        'pickaxe': 'Кирки',
        'emote': 'Танци',
        'glider': 'Глайдери',
        'wrap': 'Окраски',
        'music': 'Музика',
        'loading': 'Екрани',
        'bundle': 'Бъндъли'
    };

    const categoryIcons: Record<string, string> = {
        'Daily': '📅',
        'Featured': '⭐',
        'Bundles': '🎁',
        'Special': '🔥',
        'All': '📦',
        'outfit': '👕',
        'backpack': '🎒',
        'pickaxe': '⛏️',
        'emote': '🕺',
        'glider': '🪂',
        'wrap': '🔫',
        'bundle': '🎁'
    };

    const t = getTranslation(language);
    const [timeLeft, setTimeLeft] = useState<string>("");

    // Toggle Wishlist
    const handleToggleWishlist = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newWishlist = wishlist.includes(id)
            ? wishlist.filter(wid => wid !== id)
            : [...wishlist, id];
        setWishlist(newWishlist);
        localStorage.setItem('fn_wishlist', JSON.stringify(newWishlist));
    };

    const getShop = useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const data = await fetchFortniteShop(language);
            if (data) {
                // Check for cached AI analysis
                const cacheKey = `ai_shop_${data.date}`;
                const cached = localStorage.getItem(cacheKey);

                let enrichedItems = data.items;
                let aiOverall: Record<Language, string> | undefined;

                if (cached) {
                    const parsed = JSON.parse(cached);
                    enrichedItems = data.items.map(item => ({
                        ...item,
                        aiAnalysis: parsed.itemsAnalysis.find((a: any) => a.name === item.name)
                    }));
                    aiOverall = parsed.aiOverallAnalysis;
                } else {
                    // Trigger AI Analysis asynchronously to not block UI
                    setAnalyzing(true);
                    analyzeShopItems(data.items).then(result => {
                        if (result && result.itemsAnalysis && result.itemsAnalysis.length > 0) {
                            localStorage.setItem(cacheKey, JSON.stringify(result));
                            setShopData(prev => prev ? {
                                ...prev,
                                items: prev.items.map(item => ({
                                    ...item,
                                    aiAnalysis: result.itemsAnalysis.find((a: any) => a.name === item.name)
                                })),
                                aiOverallAnalysis: result.aiOverallAnalysis
                            } : null);
                        } else {
                            console.warn("[Shop] AI Analysis returned empty or failed.");
                        }
                        setAnalyzing(false);
                    }).catch(err => {
                        console.error("[Shop] AI Analysis Error:", err);
                        setAnalyzing(false);
                    });
                }

                setShopData({
                    ...data,
                    items: enrichedItems,
                    aiOverallAnalysis: aiOverall
                });
                setError(false);
            } else {
                setError(true);
            }
        } catch (err) {
            console.error('Error fetching shop:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [language]);

    useEffect(() => {
        getShop(true);
        const interval = setInterval(() => getShop(false), 300000);
        return () => clearInterval(interval);
    }, [getShop]);

    useEffect(() => {
        if (!shopData?.date) return;
        const updateTimer = () => {
            const now = new Date();
            const target = new Date();
            target.setUTCHours(0, 0, 0, 0);
            if (now >= target) target.setUTCDate(target.getUTCDate() + 1);
            const diff = target.getTime() - now.getTime();
            if (diff <= 0) { setTimeLeft("00:00:00"); return; }
            const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
            const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
            setTimeLeft(`${h}:${m}:${s}`);
        };
        const timer = setInterval(updateTimer, 1000);
        updateTimer();
        return () => clearInterval(timer);
    }, [shopData]);

    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    const categorizedItems = useMemo(() => {
        if (!shopData) return {};
        const cats: Record<string, ShopItem[]> = { 'All': shopData.items };
        // Add Wishlist pseudo-category
        if (wishlist.length > 0) {
            cats['Wishlist'] = shopData.items.filter(it => wishlist.includes(it.id));
        }

        shopData.items.forEach(item => {
            if (!cats[item.type]) cats[item.type] = [];
            cats[item.type].push(item);
        });
        return cats;
    }, [shopData, wishlist]);

    const sortedCategories = useMemo(() => {
        const cats = Object.keys(categorizedItems).filter(c => c !== 'All' && c !== 'Wishlist');
        const order = ['outfit', 'bundle', 'emote', 'pickaxe', 'glider', 'backpack', 'wrap', 'music', 'loading'];
        const sorted = cats.sort((a, b) => {
            const idxA = order.indexOf(a.toLowerCase());
            const idxB = order.indexOf(b.toLowerCase());
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });
        return wishlist.length > 0 ? ['Wishlist', ...sorted] : sorted;
    }, [categorizedItems, wishlist]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <Loader2 className="w-16 h-16 text-yellow-400 animate-spin" />
                <p className="font-burbank text-2xl text-white/50 animate-pulse tracking-widest uppercase">SYPHONING SHOP DATA...</p>
            </div>
        );
    }

    if (error || !shopData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4 text-white">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="font-burbank text-4xl mb-2">LOOP BREACH: SHOP DOWN</h2>
                <button onClick={() => getShop(true)} className="bg-white text-black font-burbank text-2xl px-10 py-3 rounded-xl border-b-4 border-gray-400">RESTORE CONNECTION</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-4 py-8 relative">
            {/* Header Timer */}
            <div className="w-full flex justify-between items-center mb-12">
                <div className="flex items-center gap-4">
                    {analyzing && (
                        <div className="bg-purple-600/20 px-4 py-2 rounded-2xl border border-purple-500/30 flex items-center gap-3">
                            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                {t.ai_analyzing}
                            </span>
                        </div>
                    )}
                </div>
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl text-white">
                    <Clock className="w-6 h-6 text-yellow-500 animate-pulse" />
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-white/40 uppercase font-black tracking-tighter">REBOOTING IN</span>
                        <span className="font-mono text-2xl text-yellow-400 font-bold tabular-nums">{timeLeft}</span>
                    </div>
                </div>
            </div>

            <div className="w-full space-y-16">
                {/* Hero Banner with AI Summary */}
                <div className="relative w-full overflow-hidden rounded-[3rem] bg-slate-900 shadow-2xl border border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20"></div>
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full"></div>

                    <div className="relative p-4 md:p-6 text-center z-10">
                        <h2 className="font-burbank text-3xl md:text-4xl text-white italic uppercase mb-1 tracking-tight drop-shadow-md">
                            {t.shop_banner_title}
                        </h2>
                        <p className="text-white/60 text-lg md:text-xl font-medium max-w-2xl mx-auto italic">
                            {t.shop_banner_desc}
                        </p>
                    </div>
                </div>

                {/* Categories */}
                <div className="flex flex-wrap justify-center gap-3">
                    {['All', ...sortedCategories].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-6 py-3 rounded-2xl font-bold uppercase transition-all duration-300 flex items-center gap-3 border-b-4 ${activeCategory === cat
                                ? 'bg-yellow-400 text-black border-orange-600 scale-110 shadow-lg'
                                : 'bg-slate-900/60 text-white/40 border-slate-800 hover:bg-slate-800'
                                }`}
                        >
                            <span className="text-xl">
                                {cat === 'Wishlist' ? '❤️' : (categoryIcons[cat] || '📦')}
                            </span>
                            <span className="font-burbank text-xl tracking-wide">
                                {cat === 'Wishlist' ? t.wishlist_title : (language === 'bg' ? (bgCategoryNames[cat] || cat) : cat)}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Item Grids */}
                <div className="space-y-20 pb-32">
                    {sortedCategories.map(cat => (categorizedItems[cat] && categorizedItems[cat].length > 0 && (activeCategory === 'All' || activeCategory === cat)) && (
                        <div key={cat} className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="flex items-center gap-6">
                                <h2 className="font-burbank text-5xl text-white uppercase italic tracking-wide">
                                    {cat === 'Wishlist' ? t.wishlist_title : (language === 'bg' ? bgCategoryNames[cat] : cat)}
                                </h2>
                                <div className="h-0.5 flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                                <span className="bg-white/5 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">
                                    {categorizedItems[cat].length} ITEMS
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {categorizedItems[cat].map((item, idx) => (
                                    <ShopItemCard
                                        key={item.id + idx}
                                        item={item}
                                        vbuckIcon={shopData.vbuckIcon}
                                        onSelect={setSelectedItem}
                                        isWishlisted={wishlist.includes(item.id)}
                                        onToggleWishlist={handleToggleWishlist}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {selectedItem && (
                    <ItemModal
                        item={selectedItem}
                        vbuckIcon={shopData.vbuckIcon}
                        onClose={() => setSelectedItem(null)}
                        language={language}
                        isWishlisted={wishlist.includes(selectedItem.id)}
                        onToggleWishlist={handleToggleWishlist}
                    />
                )}
            </div>

            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-10 right-10 z-[100] p-5 rounded-[1.5rem] bg-yellow-400 text-black shadow-2xl hover:scale-110 active:scale-90 transition-all border-b-4 border-orange-600 animate-in slide-in-from-right-8"
                >
                    <ChevronUp className="w-8 h-8" />
                </button>
            )}
        </div>
    );
};

export default Shop;
