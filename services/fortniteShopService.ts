
import { ShopItem, ShopResponse } from '../types';

const SHOP_API_URL = "https://fortnite-api.com/v2/shop?language=";

interface ApiResponse {
    status: number;
    data: {
        entries: any[];
    };
}

export const fetchFortniteShop = async (lang: string = 'en'): Promise<ShopResponse | null> => {
    // Map our internal language codes to fortnite-api.com supported ones
    const apiLang = lang === 'bg' ? 'en' : lang;

    try {
        const response = await fetch(`${SHOP_API_URL}${apiLang}`);
        const result: ApiResponse = await response.json();

        if (result.status !== 200 || !result.data || !result.data.entries) {
            return null;
        }

        const items: ShopItem[] = result.data.entries.map((entry: any) => {
            // Find the first available item detail from any of the possible arrays
            const itemDetail = entry.brItems?.[0] ||
                entry.tracks?.[0] ||
                entry.instruments?.[0] ||
                entry.cars?.[0] ||
                entry.legoKits?.[0] ||
                entry.beans?.[0];

            // Name extraction: Bundle name -> item name -> devName -> Unknown
            let name = entry.bundle?.name || itemDetail?.name;

            // If still no name, try to clean up devName (e.g. "[VBG] 1 x Barbie Girl for 500 MtxCurrency" -> "Barbie Girl")
            if (!name && entry.devName) {
                name = entry.devName
                    .replace(/\[.*?\]\s*/g, '') // Remove [VBG]
                    .replace(/^\d+\s*x\s*/i, '') // Remove "1 x "
                    .replace(/\s*for\s*\d+\s*MtxCurrency.*$/i, '') // Remove " for 500 MtxCurrency"
                    .replace(/_/g, ' ')
                    .trim();
            }

            if (!name) name = "Unknown Item";

            const description = itemDetail?.description || entry.bundle?.info || "";
            let type = itemDetail?.type?.displayValue || (entry.tracks ? "Track" : "Item");

            // Normalize type for categorization
            const lowerType = type.toLowerCase();
            if (lowerType.includes('outfit')) type = 'Outfits';
            else if (lowerType.includes('emote')) type = 'Emotes';
            else if (lowerType.includes('track')) type = 'Tracks';
            else if (lowerType.includes('backpack') || lowerType.includes('back bling')) type = 'Back Bling';
            else if (lowerType.includes('pickaxe') || lowerType.includes('harvesting tool')) type = 'Pickaxes';
            else if (lowerType.includes('glider')) type = 'Gliders';
            else if (lowerType.includes('wrap')) type = 'Wraps';
            else if (lowerType.includes('loading screen')) type = 'Loading Screens';
            else if (lowerType.includes('music')) type = 'Music';
            else if (lowerType.includes('instrument')) type = 'Instruments';
            else if (lowerType.includes('car') || lowerType.includes('body')) type = 'Cars';
            else if (lowerType.includes('bundle')) type = 'Bundles';
            else type = 'Other';

            const rarity = itemDetail?.rarity?.displayValue || "Common";

            // Image logic: Prioritize bundle and high-quality shop assets (newDisplayAsset) 
            // over individual item images to ensure bundles show correctly.
            const imageUrl = entry.bundle?.image ||
                entry.newDisplayAsset?.renderImages?.[0]?.image ||
                entry.tracks?.[0]?.albumArt ||
                entry.instruments?.[0]?.images?.large ||
                entry.instruments?.[0]?.images?.icon ||
                entry.cars?.[0]?.images?.large ||
                itemDetail?.images?.featured ||
                itemDetail?.images?.fullSize ||
                itemDetail?.images?.icon ||
                "";

            return {
                id: entry.offerId || itemDetail?.id || Math.random().toString(),
                name,
                description,
                type,
                rarity,
                price: entry.finalPrice,
                imageUrl,
                isBundle: !!entry.bundle
            };
        });

        return {
            date: new Date().toLocaleDateString(),
            vbuckIcon: "https://fortnite-api.com/images/vbuck.png",
            items
        };
    } catch (error) {
        console.error("Error fetching Fortnite shop:", error);
        return null;
    }
};
