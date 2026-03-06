
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

        // If it's already a cleartext Google API Key (starts with AIza), don't touch it
        if (cleaned.startsWith("AIza")) return cleaned;

        // Try to decode. Support URL-safe Base64 (_ -> /, - -> +)
        const b64 = cleaned.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(b64);

        // If decoded result makes sense (starts with AIza), use it. 
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

    console.log("Service: Initializing NEW Google GenAI SDK...");

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

    // 2. AI RESEARCH PHASE (NEW SDK v1.x)
    try {
        if (!FINAL_API_KEY || FINAL_API_KEY.length < 10) {
            throw new Error("EMPTY_KEY");
        }

        // Initialize NEW SDK (introduced in late 2024 for Gemini 2.0)
        const client = new GoogleGenAI({
            apiKey: FINAL_API_KEY,
            // @ts-ignore
            apiVersion: "v1beta" // v1beta is often needed for search grounding
        });

        console.log("Service: Querying via client.models.generateContent...");

        const systemPrompt = `You are a professional Fortnite status reporter.
        OFFICIAL STATUS: ${isOfficiallyOnline ? "ONLINE" : "ISSUES"}.
        Output valid JSON only: {isOnline:boolean, messages:Object, news:Array}.
        Languages: en, bg, es, de, fr, it, ru.`;

        // The NEW SDK uses models.generateContent directly on the client
        const result = await client.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: "user", parts: [{ text: "Check Fortnite status and provide 3 detailed news summaries (3-4 sentences each) for all languages." }] }],
            config: {
                // @ts-ignore
                system_instruction: systemPrompt,
                max_output_tokens: 8192,
                response_mime_type: "application/json",
                // @ts-ignore
                tools: [{ googleSearch: {} }]
            }
        });

        // Result handling in new SDK
        const responseText = result.response.text();
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace === -1) throw new Error("JSON_ERROR");

        const parsedData = JSON.parse(responseText.substring(firstBrace, lastBrace + 1));

        const messages = parsedData.messages || fallbackMap;
        const finalIsOnline = isOfficiallyOnline || !!parsedData.isOnline;

        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            if (!messages[lang]) messages[lang] = finalIsOnline ? getTranslation(lang).inference_online : getTranslation(lang).inference_offline;
        });

        return { isOnline: finalIsOnline, messages, rumorMessages: {}, news: parsedData.news || [], sources: [] };

    } catch (error: any) {
        console.error("Gemini New SDK Error:", error.message);

        // Detailed error diagnostic
        let diagnostic = "ERR";
        if (error.message.includes("API Key")) diagnostic = "KEY_ERR";
        else if (error.message === "EMPTY_KEY") diagnostic = "NO_KEY";
        else diagnostic = error.message.substring(0, 10);

        const errorMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            errorMap[lang] = `${getTranslation(lang).error_gemini} (${diagnostic})`;
        });
        return { isOnline: isOfficiallyOnline, messages: errorMap, rumorMessages: {}, news: [] };
    }
};
