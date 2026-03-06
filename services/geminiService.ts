
import { GoogleGenAI } from "@google/genai";
import { CheckResult, Language } from "../types";
import { getTranslation, LANGUAGE_NAMES } from "../translations";

/**
 * ULTRA-ROBUST DECODER
 * Handles standard and URL-safe Base64, and ignores cleartext keys.
 */
const s_dec = (s: string) => {
    try {
        if (!s || s.length < 10) return s || "";
        const cleaned = s.trim();

        // If it's already a cleartext Google API Key, don't touch it
        if (cleaned.startsWith("AIza")) return cleaned;

        // Try to decode. Support URL-safe Base64 (_ -> /, - -> +)
        const b64 = cleaned.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(b64);

        // If decoded result makes sense (starts with AIza), use it. 
        // Otherwise, it might have been cleartext all along but didn't start with AIza.
        if (decoded.startsWith("AIza")) return decoded;
        return cleaned;
    } catch (e) {
        return s || "";
    }
};

const EPIC_STATUS_API = "https://api.codetabs.com/v1/proxy/?quest=https://status.epicgames.com/api/v2/status.json";

export const checkFortniteServerStatus = async (skipAI = false): Promise<CheckResult> => {
    // 1. Load and decode key with enhanced safety
    const rawKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const FINAL_API_KEY = s_dec(rawKey).trim();

    console.log("Service: Key verification...");
    if (FINAL_API_KEY.startsWith("AIza")) {
        console.log("Service: Key format valid (AIza...)");
    } else {
        console.warn("Service: Key format suspicious or missing!");
    }

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

    // 2. AI RESEARCH PHASE
    try {
        if (!FINAL_API_KEY || FINAL_API_KEY.length < 10) {
            throw new Error("EMPTY_KEY");
        }

        // Initialize with object-style for browser compatibility
        const genAI = new GoogleGenAI({ apiKey: FINAL_API_KEY });

        console.log("Service: Querying Gemini API (v1beta)...");
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            // @ts-ignore
            systemInstruction: `You are a professional Fortnite status reporter.
            OFFICIAL STATUS: ${isOfficiallyOnline ? "ONLINE" : "ISSUES"}.
            Output valid JSON only: {isOnline:boolean, messages:Object, news:Array}.
            Languages: en, bg, es, de, fr, it, ru.`
        }, { apiVersion: 'v1beta' });

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: "Check Fortnite status and provide 3 detailed news." }] }],
            generationConfig: { responseMimeType: "application/json" },
            // @ts-ignore
            tools: [{ googleSearch: {} }]
        });

        const text = result.response.text();
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace === -1) throw new Error("JSON_ERROR");

        const parsedData = JSON.parse(text.substring(firstBrace, lastBrace + 1));

        const messages = parsedData.messages || fallbackMap;
        const finalIsOnline = isOfficiallyOnline || !!parsedData.isOnline;

        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            if (!messages[lang]) messages[lang] = finalIsOnline ? getTranslation(lang).inference_online : getTranslation(lang).inference_offline;
        });

        return { isOnline: finalIsOnline, messages, rumorMessages: {}, news: parsedData.news || [], sources: [] };

    } catch (error: any) {
        console.error("Gemini Critical Error:", error.message);

        // Detailed error tracing for the UI
        let diagnostic = "ERR";
        if (error.message.includes("API Key")) diagnostic = "KEY_ERROR";
        else if (error.message === "EMPTY_KEY") diagnostic = "NO_KEY_FOUND";
        else diagnostic = error.message.substring(0, 10);

        const errorMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            errorMap[lang] = `${getTranslation(lang).error_gemini} (${diagnostic})`;
        });
        return { isOnline: isOfficiallyOnline, messages: errorMap, rumorMessages: {}, news: [] };
    }
};
