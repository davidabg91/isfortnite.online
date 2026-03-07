import { useState, useEffect, useCallback, useMemo } from 'react';
import { getShopItems, ShopItem, ShopData } from '../services/fnService';
import { getTranslation, Language } from '../translations';
import { X, Clock, Loader2, AlertCircle, ChevronUp } from 'lucide-react';

const getRarityColor = (rarity: string) => {
    const r = rarity.toLowerCase();
    if (r.includes('legendary')) return 'from-orange-500 to-yellow-600 border-orange-400';
    if (r.includes('epic')) return 'from-purple-600 to-indigo-700 border-purple-400';
    if (r.includes('rare')) return 'from-blue-500 to-cyan-600 border-blue-400';
    if (r.includes('uncommon')) return 'from-green-500 to-emerald-600 border-green-400';
    return 'from-gray-500 to-gray-700 border-gray-400'; // common
};

const ItemModal = ({ item, vbuckIcon, onClose }: { item: ShopItem; vbuckIcon?: string; onClose: () => void }) => {
    return (
        <div
            className="fixed inset-0 flex items-start md:items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto"
            style={{ zIndex: 999990 }}
        >
            <div className="relative w-full max-w-5xl bg-gradient-to-br from-gray-900 to-black rounded-3xl border-2 border-white/10 overflow-hidden shadow-[0_0_100px_rgba(255,255,255,0.1)] flex flex-col md:flex-row my-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 md:top-6 md:right-6 z-[210] p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all hover:rotate-90"
                >
                    <X className="w-6 h-6 md:w-8 md:h-8" />
                </button>

                <div className={`w-full md:w-3/5 min-h-[300px] md:h-auto bg-gradient-to-br ${getRarityColor(item.rarity)} p-4 md:p-8 flex items-center justify-center relative`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                    <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="max-w-full max-h-[350px] md:max-h-full object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-500"
                    />
                </div>

                <div className="w-full md:w-2/5 p-6 md:p-8 flex flex-col justify-center">
                    <div className="mb-4 md:mb-6">
                        <p className="text-yellow-400 font-bold uppercase tracking-[0.2em] text-[10px] md:text-sm mb-2">{item.rarity} {item.type}</p>
                        <h2 className="font-burbank text-4xl md:text-6xl text-white uppercase leading-none mb-3 md:mb-4 italic tracking-tight">{item.name}</h2>
                        <div className="h-1 w-16 md:w-20 bg-yellow-400 mb-4 md:mb-6"></div>
                        <p className="text-white/70 text-base md:text-lg leading-relaxed">{item.description}</p>
                    </div>

                    <div className="mt-auto flex items-center gap-4 flex-wrap">
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                {vbuckIcon && <img src={vbuckIcon} alt="V-Bucks" className="w-6 h-6 md:w-8 md:h-8" />}
                                <span className="text-white font-burbank text-2xl md:text-4xl">{item.price.toLocaleString()}</span>
                            </div>
                        </div>
                        {item.isBundle && (
                            <span className="bg-yellow-400 text-black px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold uppercase text-xs md:text-base italic skew-x-[-12deg] whitespace-nowrap">BUNDLE</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ShopItemCard = ({ item, vbuckIcon, onSelect }: { item: ShopItem; vbuckIcon?: string; onSelect: (item: ShopItem) => void }) => {
    return (
        <div
            onClick={() => onSelect(item)}
            className="group relative flex flex-col bg-black/40 border-2 border-white/10 rounded-xl overflow-hidden transform transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer"
        >
            <div className={`h-48 w-full bg-gradient-to-b ${getRarityColor(item.rarity)} relative overflow-hidden`}>
                <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain p-2 drop-shadow-2xl"
                    loading="lazy"
                />
            </div>

            <div className="p-4 flex flex-col flex-grow bg-gradient-to-b from-black/60 to-black/80">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-burbank text-xl text-white uppercase tracking-tight truncate flex-grow mr-2">
                        {item.name}
                    </h3>
                    <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/10 flex-shrink-0">
                        {vbuckIcon && <img src={vbuckIcon} alt="V-Bucks" className="w-4 h-4" />}
                        <span className="text-white font-burbank text-lg leading-none">
                            {item.price.toLocaleString()}
                        </span>
                    </div>
                </div>
                <p className="text-white/50 text-xs font-medium uppercase mb-2">{item.rarity}</p>
                <p className="text-white/70 text-sm line-clamp-2 italic leading-tight">{item.description}</p>
                {item.isBundle && (
                    <div className="mt-2 text-[10px] bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-400/30 w-fit font-bold uppercase">Bundle</div>
                )}
            </div>
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"></div>
        </div>
    );
};

const Shop = ({ language }: { language: Language }) => {
    const [shopData, setShopData] = useState<ShopData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

    const bgCategoryNames: Record<string, string> = {
        'Daily': 'ЕЖЕДНЕВНИ',
        'Featured': 'ОСНОВНИ',
        'Bundles': 'БЪНДЪЛИ',
        'Special': 'СПЕЦИАЛНИ',
        'All': 'ВСИЧКИ'
    };

    const categoryIcons: Record<string, string> = {
        'Daily': '📅',
        'Featured': '⭐',
        'Bundles': '🎁',
        'Special': '🔥',
        'All': '📦'
    };

    const t = getTranslation(language);
    const [timeLeft, setTimeLeft] = useState<string>("");

    const getShop = useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const data = await getShopItems();
            if (data) {
                setShopData(data);
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
    }, []);

    useEffect(() => {
        getShop(true);
        const interval = setInterval(() => getShop(false), 300000);
        return () => clearInterval(interval);
    }, [getShop]);

    useEffect(() => {
        if (!shopData?.nextRefresh) return;
        const updateTimer = () => {
            const now = new Date();
            const next = new Date(shopData.nextRefresh);
            const diff = next.getTime() - now.getTime();
            if (diff <= 0) {
                setTimeLeft("00:00:00");
                return;
            }
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
        shopData.items.forEach(item => {
            if (!cats[item.category]) cats[item.category] = [];
            cats[item.category].push(item);
        });
        return cats;
    }, [shopData]);

    const sortedCategories = useMemo(() => {
        const cats = Object.keys(categorizedItems).filter(c => c !== 'All');
        const order = ['Featured', 'Daily', 'Bundles', 'Special'];
        return cats.sort((a, b) => {
            const idxA = order.indexOf(a);
            const idxB = order.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });
    }, [categorizedItems]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <Loader2 className="w-16 h-16 text-yellow-400 animate-spin" />
                <p className="font-burbank text-2xl text-white/50 animate-pulse tracking-widest">LOADING SHOP...</p>
            </div>
        );
    }

    if (error || !shopData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4 text-white">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="font-burbank text-4xl mb-2">SHOP UNAVAILABLE</h2>
                <button onClick={() => getShop(true)} className="bg-white text-black font-burbank text-2xl px-10 py-3 rounded-xl">RETRY</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-4 py-8">
            <div className="w-full flex justify-end mb-8">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl text-white">
                    <Clock className="w-5 h-5 text-yellow-400" />
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-white/50 uppercase font-bold">NEXT REFRESH</span>
                        <span className="font-mono text-xl text-yellow-400 font-bold">{timeLeft}</span>
                    </div>
                </div>
            </div>

            <div className="w-full space-y-12">
                <div className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 p-8 md:p-12 mb-12 shadow-2xl border border-white/10 text-center">
                    <h2 className="font-burbank text-5xl md:text-7xl text-white italic uppercase mb-2 tracking-tight">{t.shop_banner_title}</h2>
                    <p className="text-white/80 text-lg md:text-xl font-medium max-w-2xl mx-auto italic">{t.shop_banner_desc}</p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 mb-12">
                    {['All', ...sortedCategories].map(cat => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl font-bold uppercase transition-all flex items-center gap-2 border-b-4 ${activeCategory === cat ? 'bg-yellow-400 text-black border-orange-600' : 'bg-black/60 text-white/50 border-gray-800'}`}>
                            <span>{categoryIcons[cat] || '📦'}</span>
                            <span className="font-burbank text-lg">{language === 'bg' ? (bgCategoryNames[cat] || cat) : cat}</span>
                        </button>
                    ))}
                </div>

                <div className="space-y-12 mb-20">
                    {sortedCategories.map(cat => (categorizedItems[cat] && categorizedItems[cat].length > 0 && (activeCategory === 'All' || activeCategory === cat)) && (
                        <div key={cat} className="space-y-6">
                            <h2 className="font-burbank text-4xl text-white uppercase italic">{language === 'bg' ? bgCategoryNames[cat] : cat}</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {categorizedItems[cat].map((item, idx) => (
                                    <ShopItemCard key={item.id + idx} item={item} vbuckIcon={shopData.vbuckIcon} onSelect={setSelectedItem} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {selectedItem && <ItemModal item={selectedItem} vbuckIcon={shopData.vbuckIcon} onClose={() => setSelectedItem(null)} />}
            </div>

            {showScrollTop && (
                <button onClick={scrollToTop} className="fixed bottom-8 right-8 z-50 p-4 rounded-full bg-yellow-400 text-black shadow-xl">
                    <ChevronUp className="w-8 h-8" />
                </button>
            )}
        </div>
    );
};

export default Shop;
