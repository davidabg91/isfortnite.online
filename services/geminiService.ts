
import { CheckResult, Language } from "../types";
import { getTranslation, LANGUAGE_NAMES } from "../translations";

/**
 * SECURITY STRATEGY: OBFUSCATED FALLBACK ASSEMBLY
 */
const s_dec = (s: string) => {
    if (!s) return "";
    const cleaned = s.trim();
    if (cleaned.startsWith("AIza")) return cleaned;
    try {
        const decoded = atob(cleaned.replace(/-/g, '+').replace(/_/g, '/'));
        if (decoded.startsWith("AIza")) return decoded;
    } catch (e) { }
    return cleaned;
};

// Stable Gemini API Config
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-2.5-flash";

const callGemini = async (prompt: string, isJson = true) => {
    const rawKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const apiKey = s_dec(rawKey).trim();
    if (!apiKey || apiKey.length < 10) throw new Error("API_KEY_MISSING");

    const url = `${API_BASE}/models/${MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.1, // Lower temperature for more deterministic/stable JSON
                responseMimeType: isJson ? "application/json" : "text/plain"
            }
        })
    });

    if (!response.ok) {
        const err = await response.json();
        console.error(`[Gemini] API Error [${response.status}]:`, err);
        throw new Error(err.error?.message || "API_ERROR");
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!isJson) return text;

    // Robust JSON extraction
    const cleanText = text.trim();
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');

    if (firstBrace === -1) {
        console.error("[Gemini] No JSON found. Raw text:", text);
        throw new Error("JSON_NOT_FOUND");
    }

    let jsonString = cleanText.substring(firstBrace, (lastBrace === -1 ? cleanText.length : lastBrace + 1));

    // If JSON is truncated (no closing brace), try to close it if it's very close or just fail gracefully
    if (lastBrace === -1 || lastBrace < firstBrace) {
        console.warn("[Gemini] Truncated JSON detected. Attempting to repair...");
        // This is a naive repair, but for complex objects it's safer to just log and throw
        // rather than trying to guess the missing parts.
        throw new Error("JSON_TRUNCATED");
    }

    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("[Gemini] JSON Parse Error. Raw string:", jsonString);
        // Fallback: If parsing fails and it looks like a markdown block was returned despite request
        const retryClean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const f2 = retryClean.indexOf('{');
        const l2 = retryClean.lastIndexOf('}');
        if (f2 !== -1 && l2 !== -1 && l2 > f2) {
            try {
                return JSON.parse(retryClean.substring(f2, l2 + 1));
            } catch (e2) { }
        }
        throw e;
    }
};

const PROXIES = [
    "https://api.codetabs.com/v1/proxy/?quest=https://status.epicgames.com/api/v2/summary.json",
    "https://corsproxy.io/?https://status.epicgames.com/api/v2/summary.json"
];

export const checkFortniteServerStatus = async (skipAI = false, skipNews = false): Promise<CheckResult> => {
    const fallbackMap: Record<Language, string> = {} as any;
    (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
        fallbackMap[lang] = getTranslation(lang).fallback_message;
    });

    let isOfficiallyOnline = true; // Bias towards Online
    let officialIndicator = "none"; 
    
    // Try each proxy until one works
    for (const proxyUrl of PROXIES) {
        try {
            // Add t=${Date.now()} to bust any proxy-level caching
            const statusReq = await fetch(`${proxyUrl}&t=${Date.now()}`);
            if (statusReq.ok) {
                const data = await statusReq.json();
                
                // Fallback global indicator
                officialIndicator = (data.status?.indicator || "none").toLowerCase();

                // Map of Fortnite-relevant components to check
                if (data.components && Array.isArray(data.components)) {
                    // 1. Try to find the EXACT core "Fortnite" component first
                    const coreFn = data.components.find((c: any) => c.name === "Fortnite");
                    
                    if (coreFn) {
                        const s = coreFn.status.toLowerCase();
                        if (s === "major_outage" || s === "under_maintenance") {
                            isOfficiallyOnline = false;
                            officialIndicator = s;
                        } else {
                            isOfficiallyOnline = true;
                            officialIndicator = s;
                        }
                    } else {
                        // 2. Fallback: Check if ANY Fortnite-related component has a MAJOR issue
                        const fnComponents = data.components.filter((c: any) => 
                            c.name.toLowerCase().includes("fortnite") && 
                            !c.name.toLowerCase().includes("china") // Ignore region-specific if global is up
                        );
                        
                        if (fnComponents.length > 0) {
                            const statuses = fnComponents.map((c: any) => c.status.toLowerCase());
                            if (statuses.includes("major_outage") || statuses.includes("under_maintenance")) {
                                isOfficiallyOnline = false;
                            } else {
                                isOfficiallyOnline = true;
                            }
                        } else {
                            // 3. Last fallback: Global status (only offline if major or critical)
                            isOfficiallyOnline = officialIndicator !== "major" && officialIndicator !== "critical";
                        }
                    }
                    // If we got valid component data, we can stop trying proxies
                    break;
                }
            }
        } catch (e) {
            console.warn(`Proxy ${proxyUrl} failed, trying next...`);
        }
    }

    if (skipAI && isOfficiallyOnline) {
        const onlineMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            onlineMap[lang] = getTranslation(lang).inference_online;
        });
        return { isOnline: true, messages: onlineMap, rumorMessages: {} as Record<Language, string>, news: [], sources: [] };
    }

    try {
        // Map officialIndicator to more descriptive terms for Gemini
        let statusForPrompt = "UNKNOWN (API check in progress, assume active)";
        if (officialIndicator === "operational" || officialIndicator === "none") {
            statusForPrompt = "ONLINE (Operational)";
        } else if (officialIndicator === "degraded_performance" || officialIndicator === "partial_outage" || officialIndicator === "minor") {
            statusForPrompt = "ONLINE (Minor Issues Reported but playable)";
        } else if (officialIndicator === "major_outage" || officialIndicator === "major") {
            statusForPrompt = "OFFLINE (Major Outage)";
        } else if (officialIndicator === "under_maintenance" || officialIndicator === "critical") {
            statusForPrompt = "OFFLINE (Under Maintenance)";
        }

        const prompt = `You are a professional Fortnite status reporter and leaker.
        TODAY\'S DATE: ${new Date().toISOString().split('T')[0]}
        OFFICIAL API STATUS IS: ${statusForPrompt}.
        IMPORTANT: If API status says "Operational" or "Minor Issues", tell users they can play!
        If API status is Unknown, assume servers ARE ONLINE unless you have confirmed maintenance news.
        
        ${skipNews ? "" : "1. Find 3 latest Fortnite news (patch notes, events, etc.) from the current month."}
        2. Give a brief Community Report for the 'messages' field. Summarize what real players on Twitter/Reddit are reporting. 
        3. Provide 1 interesting Fortnite rumor for 'rumorMessages'.
        4. Output MUST BE valid JSON:
        {
            "isOnline": boolean,
            "messages": {"en": "...", "bg": "..."},
            "rumorMessages": {"en": "...", "bg": "..."},
            "news": [{"title": {"en": "..."}, "summary": {"en": "..."}, "url": "...", "date": "..."}]
        }
        Translate ALL strings to: en, bg, es, de, fr, it, ru.`;

        const parsedData = await callGemini(prompt);
        // If the Official API says it's online (none/minor), we trust it even if Gemini thinks otherwise based on "Minor Issues"
        const finalIsOnline = isOfficiallyOnline || !!parsedData.isOnline;
        const messages = parsedData.messages || fallbackMap;
        const rumorMessages = parsedData.rumorMessages || {};
        const news = parsedData.news || [];

        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            if (!messages[lang]) messages[lang] = finalIsOnline ? getTranslation(lang).inference_online : getTranslation(lang).inference_offline;
        });

        return { isOnline: finalIsOnline, messages, rumorMessages, news, sources: [] };
    } catch (error: any) {
        console.error("[Gemini Status] Catch:", error);
        return { isOnline: isOfficiallyOnline, messages: fallbackMap, rumorMessages: {} as any, news: [] };
    }
};

export const getGameAdvice = async (userQuestion: string): Promise<Record<Language, string> | null> => {
    try {
        const prompt = `You are a Pro Fortnite Coach (DavidaX AI). 
        User Question: "${userQuestion}"
        
        Provide high-level competitive advice or matching strategy.
        Output MUST BE valid JSON:
        {
            "en": "...",
            "bg": "...",
            "es": "...",
            "de": "...",
            "fr": "...",
            "it": "...",
            "ru": "..."
        }
        Keep answer concise (max 40 words per language).`;

        return await callGemini(prompt, true);
    } catch (e) {
        console.error("[Gemini Advisor] Catch:", e);
        return null;
    }
};

export const analyzeShopItems = async (items: any[]): Promise<any | null> => {
    const simplifiedItems = items.map(it => ({ name: it.name, type: it.type, price: it.price }));

    // Split items into chunks of 30 to prevent Gemini 8192 token output cutoffs on huge shops
    const CHUNK_SIZE = 30;
    const itemChunks = [];
    for (let i = 0; i < simplifiedItems.length; i += CHUNK_SIZE) {
        itemChunks.push(simplifiedItems.slice(i, i + CHUNK_SIZE));
    }

    let allAnalyses: any[] = [];

    try {
        const promises = itemChunks.map(async (chunk) => {
            const prompt = `Analyze these Fortnite shop items: ${JSON.stringify(chunk)}
            
            1. For each item: score (1-10), reason (Bulgarian & English), recommendedCombos (max 2 item names).
            
            Output JSON:
            {
                "itemsAnalysis": [{ "name": "...", "score": 8, "reason": {"en": "...", "bg": "..."}, "recommendedCombos": ["...", "..."] }]
            }
            IMPORTANT: Provide ONLY "en" and "bg" translations. Keep reasons under 15 words.`;

            return await callGemini(prompt, true);
        });

        const results = await Promise.allSettled(promises);

        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                if (result.value.itemsAnalysis) {
                    allAnalyses = allAnalyses.concat(result.value.itemsAnalysis);
                }
            } else if (result.status === 'rejected') {
                console.error(`[Gemini Shop] Chunk ${index} failed:`, result.reason);
            }
        });

        if (allAnalyses.length === 0) return null;

        return {
            itemsAnalysis: allAnalyses
        };

    } catch (e) {
        console.error("[Gemini Shop] Catch:", e);
        return null;
    }
};

export const predictRarityTrend = async (item: any): Promise<any> => {
    try {
        const prompt = `Analyze this Fortnite item rarity & demand:
        ITEM: ${JSON.stringify({ name: item.name, rarity: item.rarity?.displayValue, shopHistory: item.shopHistory })}
        
        1. Predict 'rarityScore' (100 = rarest, 0 = common).
        2. Give 'trend' (Up/Down/Stable).
        3. Predict 'nextAppearance' (estimated days or translate "Vaulted" as "Неизвестно/Рядко").
        4. Give 'investVerdict' (Bulgarian & English) - why buy this now?
        
        Output JSON:
        {
            "rarityScore": 85,
            "trend": "Up",
            "nextAppearance": "Около 30 дни / Неизвестно",
            "investVerdict": { "en": "...", "bg": "..." }
        }
        Keep verdict under 15 words.`;

        return await callGemini(prompt, true);
    } catch (e) {
        console.error("[Gemini Rarity] Catch:", e);
        return null;
    }
};
