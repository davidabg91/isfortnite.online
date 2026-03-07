
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

    const cleanText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        console.error("[Gemini] Invalid JSON structure. Raw text:", text);
        throw new Error("JSON_NOT_FOUND");
    }

    const jsonString = cleanText.substring(firstBrace, lastBrace + 1);
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("[Gemini] JSON Parse Error. Raw string:", jsonString);
        throw e;
    }
};

const EPIC_STATUS_API = "https://api.codetabs.com/v1/proxy/?quest=https://status.epicgames.com/api/v2/status.json";

export const checkFortniteServerStatus = async (skipAI = false, skipNews = false): Promise<CheckResult> => {
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
        const prompt = `You are a professional Fortnite status reporter and leaker.
        TODAY\'S DATE: ${new Date().toISOString().split('T')[0]}
        OFFICIAL API STATUS IS: ${isOfficiallyOnline ? "ONLINE" : "ISSUES"}.
        ${skipNews ? "" : "1. Find 3 latest Fortnite news (patch notes, events, etc.) strictly from the last 24h of TODAY\'S DATE."}
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

export const analyzeShopItems = async (items: any[]): Promise<any | null> => {
    const simplifiedItems = items.map(it => ({ name: it.name, type: it.type, price: it.price }));
    const prompt = `Analyze these Fortnite shop items: ${JSON.stringify(simplifiedItems)}
    
    1. For each item: score (1-10), reason (Bulgarian & English), recommendedCombos (2 item names).
    2. Overall "aiOverallAnalysis" (2 sentences).
    
    Output JSON:
    {
        "itemsAnalysis": [{ "name": "...", "score": 8, "reason": {"en": "...", "bg": "..."}, "recommendedCombos": ["...", "..."] }],
        "aiOverallAnalysis": {"en": "...", "bg": "..."}
    }
    IMPORTANT: Provide ONLY "en" and "bg" translations to keep the response short. Never include other languages.`;

    try {
        return await callGemini(prompt);
    } catch (e) {
        console.error("[Gemini Shop] Catch:", e);
        return null;
    }
};

export const getGameAdvice = async (query: string): Promise<Record<Language, string> | null> => {
    const prompt = `You are a Pro Fortnite Mentor. Answer this query: "${query}"
    Provide a professional, strategy-focused answer. KEEP IT CONCISE AND SHORT (Under 50 words per language).
    Translate to ALL: en, bg, es, de, fr, it, ru.
    Output JSON: {"en": "...", "bg": "...", "es": "...", "de": "...", "fr": "...", "it": "...", "ru": "..."}`;

    try {
        return await callGemini(prompt);
    } catch (e) {
        console.error("[Gemini Mentor] Catch:", e);
        return null;
    }
};
