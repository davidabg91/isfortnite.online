
import { CheckResult, Language } from "../types";
import { getTranslation, LANGUAGE_NAMES } from "../translations";

/**
 * SECURITY STRATEGY: OBFUSCATED FALLBACK ASSEMBLY
 */
const s_dec = (s: string) => {
    if (!s) return "";
    const cleaned = s.trim();
    // If it looks like a raw Gemini key, return it immediately
    if (cleaned.startsWith("AIza")) return cleaned;

    try {
        // Try base64 decoding if it doesn't look like a raw key
        const decoded = atob(cleaned.replace(/-/g, '+').replace(/_/g, '/'));
        if (decoded.startsWith("AIza")) return decoded;
    } catch (e) {
        // If decoding fails, it's likely already a raw key (or garbage, but we'll try it anyway)
    }
    return cleaned;
};

const EPIC_STATUS_API = "https://api.codetabs.com/v1/proxy/?quest=https://status.epicgames.com/api/v2/status.json";

export const checkFortniteServerStatus = async (skipAI = false, skipNews = false): Promise<CheckResult> => {
    const rawKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const apiKey = s_dec(rawKey).trim();
    if (apiKey) console.log("[Gemini] API Key loaded:", apiKey.substring(0, 4) + "...");
    else console.warn("[Gemini] API Key is MISSING in environment.");

    const fallbackMap: Record<Language, string> = {} as any;
    (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
        fallbackMap[lang] = getTranslation(lang).fallback_message;
    });

    let isOfficiallyOnline = false;
    try {
        const statusReq = await fetch(EPIC_STATUS_API);
        if (statusReq.ok) {
            const data = await statusReq.json();
            isOfficiallyOnline = data.status?.indicator === "none";
        }
    } catch (e) { }

    if (skipAI && isOfficiallyOnline) {
        const onlineMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            onlineMap[lang] = getTranslation(lang).inference_online;
        });
        return { isOnline: true, messages: onlineMap, rumorMessages: {} as Record<Language, string>, news: [], sources: [] };
    }

    try {
        if (!apiKey || apiKey.length < 10) throw new Error("KEY_MISSING");

        const prompt = `You are a professional Fortnite status reporter and leaker.
        TODAY\'S DATE: ${new Date().toISOString().split('T')[0]}
        OFFICIAL API STATUS IS: ${isOfficiallyOnline ? "ONLINE" : "ISSUES"}.
        ${skipNews ? "" : "1. Find 3 latest Fortnite news (patch notes, events, etc.) strictly from the last 24h of TODAY\'S DATE."}
        2. Give a brief Community Report for the 'messages' field. DO NOT just say "Servers are online". Instead, summarize what real players on DownDetector, Twitter, or Reddit are currently reporting. E.g. "Matchmaking is perfectly stable with zero complaints," or "Some players are reporting minor login queues." Give 1-2 sentences of community sentiment.
        3. Provide 1 interesting Fortnite rumor, leak, or upcoming update for the 'rumorMessages' field. DO NOT say there are no rumors.
        4. Output MUST BE valid, parseable JSON exactly matching this structure:
        {
            "isOnline": boolean,
            "messages": {"en": "...", "bg": "..."},
            "rumorMessages": {"en": "...", "bg": "..."}${skipNews ? "" : `,
            "news": [
                {
                    "title": {"en": "...", "bg": "..."},
                    "summary": {"en": "...", "bg": "..."},
                    "url": "https://...",
                    "date": "YYYY-MM-DD"
                }
            ]`}
        }
        4. Translate ALL text fields (messages, rumorMessages, title, summary) into: en, bg, es, de, fr, it, ru.
        5. Provide RAW JSON. No markdown (\`\`\`). No trailing commas. Check your string escaping.`;

        // Using gemini-1.5-flash for maximum stability
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || "API_ERROR");
        }

        const result = await response.json();
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Strip out markdown code blocks if the AI decided to add them despite instructions
        const cleanText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();

        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace === -1) throw new Error("JSON_NOT_FOUND");

        const parsedData = JSON.parse(cleanText.substring(firstBrace, lastBrace + 1));

        const finalIsOnline = isOfficiallyOnline || !!parsedData.isOnline;
        const messages = parsedData.messages || fallbackMap;
        const rumorMessages = parsedData.rumorMessages || {};
        const news = parsedData.news || [];

        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            if (!messages[lang]) messages[lang] = finalIsOnline ? getTranslation(lang).inference_online : getTranslation(lang).inference_offline;
        });

        return { isOnline: finalIsOnline, messages, rumorMessages, news, sources: [] };

    } catch (error: any) {
        console.error("Gemini Error:", error.message);
        const diag = error.message.substring(0, 10);

        const errorMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            errorMap[lang] = `${getTranslation(lang).error_gemini} (${diag})`;
        });

        return { isOnline: isOfficiallyOnline, messages: errorMap, rumorMessages: {} as any, news: [] };
    }
};

export const analyzeShopItems = async (items: any[]): Promise<any | null> => {
    const rawKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const apiKey = s_dec(rawKey).trim();

    if (!apiKey || apiKey.length < 10) return null;

    // We only send basic info to save tokens and improve speed
    const simplifiedItems = items.map(it => ({
        name: it.name,
        type: it.type,
        rarity: it.rarity,
        price: it.price,
        isBundle: it.isBundle
    }));

    const prompt = `Analyze these Fortnite shop items.
    ITEMS: ${JSON.stringify(simplifiedItems)}
    
    1. For each item, give:
       - "score": (1-10) How good is this deal or how cool is the item?
       - "reason": A brief 1-sentence explanation in Bulgarian and English.
       - "rarityScore": (1-10) How rare is this skin/item?
       - "recommendedCombos": Suggest 2 other item names (e.g. "Midas", "Ice King") that match this skin.
    2. Provide an "aiOverallAnalysis": A 2-sentence summary of today's shop value.
    
    Output MUST be valid JSON:
    {
        "itemsAnalysis": [
            {
                "name": "...",
                "score": 8,
                "reason": {"en": "...", "bg": "..."},
                "rarityScore": 5,
                "recommendedCombos": ["...", "..."]
            }
        ],
        "aiOverallAnalysis": {"en": "...", "bg": "..."}
    }
    Translate reasons to ALL: en, bg, es, de, fr, it, ru.
    Provide RAW JSON.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            console.error("Shop Analysis API Error:", err);
            return null;
        }

        const result = await response.json();
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();

        return JSON.parse(cleanText);
    } catch (e) {
        console.error("AI Analysis Error:", e);
        return null;
    }
};

export const getGameAdvice = async (query: string): Promise<Record<Language, string> | null> => {
    const rawKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const apiKey = s_dec(rawKey).trim();
    if (!apiKey || apiKey.length < 10) return null;

    const prompt = `You are a Pro Fortnite Mentor. Answer this query: "${query}"
    Provide a professional, strategy-focused answer.
    Translate to ALL: en, bg, es, de, fr, it, ru.
    Output JSON: {"en": "...", "bg": "...", ...}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });
        if (!response.ok) {
            const err = await response.json();
            console.error("Mentor API Error:", err);
            return null;
        }
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return JSON.parse(text.replace(/```json/gi, "").replace(/```/g, "").trim());
    } catch (e) {
        console.error("Mentor Catch Error:", e);
        return null;
    }
};
