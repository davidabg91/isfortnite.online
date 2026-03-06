
import { GoogleGenAI } from "@google/genai";
import { CheckResult, Language } from "../types";
import { getTranslation, LANGUAGE_NAMES } from "../translations";

// SECURITY STRATEGY: OBFUSCATED FALLBACK ASSEMBLY
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
    const FINAL_API_KEY = s_dec(rawKey).trim();

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
        if (!FINAL_API_KEY || FINAL_API_KEY.length < 10) throw new Error("MISSING_KEY");

        // Use ONLY the stable pattern that worked before
        const client = new GoogleGenAI({ apiKey: FINAL_API_KEY });

        const prompt = `You are a professional Fortnite status reporter.
        OFFICIAL EPIC STATUS: ${isOfficiallyOnline ? "ONLINE" : "ISSUES/OFFLINE"}.
        
        TASK:
        1. Find 3 latest Fortnite news from the last 24h.
        2. Write 3-4 detailed sentences per news summary.
        3. Output valid JSON: {"isOnline":boolean, "messages":Object, "news":Array}.
        4. Languages: en, bg, es, de, fr, it, ru.`;

        console.log("Service: Reverting to working model (gemini-1.5-flash-8b)...");

        const result = await client.models.generateContent({
            model: "gemini-1.5-flash-8b",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                max_output_tokens: 8192,
                response_mime_type: "application/json"
            }
        });

        const responseText = result.response.text();
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

        let diag = error.message.includes("404") ? "RETRY_404" : error.message.substring(0, 10);

        const errorMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            errorMap[lang] = `${getTranslation(lang).error_gemini} (${diag})`;
        });

        return { isOnline: isOfficiallyOnline, messages: errorMap, rumorMessages: {}, news: [] };
    }
};
