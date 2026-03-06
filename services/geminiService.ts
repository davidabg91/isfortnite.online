
import { CheckResult, Language } from "../types";
import { getTranslation, LANGUAGE_NAMES } from "../translations";

/**
 * SECURITY STRATEGY: OBFUSCATED FALLBACK ASSEMBLY
 */
const s_dec = (s: string) => {
    try {
        if (!s || s.length < 10) return s || "";
        const cleaned = s.trim();
        if (cleaned.startsWith("AIza")) return cleaned;
        const b64 = cleaned.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(b64);
        if (decoded.startsWith("AIza")) return decoded;
        return cleaned;
    } catch (e) {
        return s || "";
    }
};

const EPIC_STATUS_API = "https://api.codetabs.com/v1/proxy/?quest=https://status.epicgames.com/api/v2/status.json";

export const checkFortniteServerStatus = async (skipAI = false): Promise<CheckResult> => {
    const rawKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const apiKey = s_dec(rawKey).trim();

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
        return { isOnline: true, messages: onlineMap, rumorMessages: {}, news: [], sources: [] };
    }

    try {
        if (!apiKey || apiKey.length < 10) throw new Error("KEY_MISSING");

        console.log("Service: Direct Connection (No SDK) for maximum stability...");

        const prompt = `You are a professional Fortnite status reporter.
        OFFICIAL STATUS: ${isOfficiallyOnline ? "ONLINE" : "ISSUES"}.
        1. Find 3 news from last 24h.
        2. Detailed summaries (3-4 sentences each).
        3. Output VALID JSON ONLY: {"isOnline":boolean, "messages":Object, "news":Array}.
        4. Languages: en, bg, es, de, fr, it, ru.`;

        // Using direct FETCH to avoid SDK 404 bugs.
        // Updated to gemini-2.0-flash as 1.5-flash is not found in this environment.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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

        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace === -1) throw new Error("JSON_NOT_FOUND");

        const parsedData = JSON.parse(responseText.substring(firstBrace, lastBrace + 1));

        const finalIsOnline = isOfficiallyOnline || !!parsedData.isOnline;
        const messages = parsedData.messages || fallbackMap;
        const news = parsedData.news || [];

        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            if (!messages[lang]) messages[lang] = finalIsOnline ? getTranslation(lang).inference_online : getTranslation(lang).inference_offline;
        });

        return { isOnline: finalIsOnline, messages, rumorMessages: {}, news, sources: [] };

    } catch (error: any) {
        console.error("Gemini Error:", error.message);
        const diag = error.message.substring(0, 10);

        const errorMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            errorMap[lang] = `${getTranslation(lang).error_gemini} (${diag})`;
        });

        return { isOnline: isOfficiallyOnline, messages: errorMap, rumorMessages: {}, news: [] };
    }
};
