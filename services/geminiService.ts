
import { GoogleGenAI } from "@google/genai";
import { CheckResult, Language } from "../types";
import { getTranslation, LANGUAGE_NAMES } from "../translations";

/**
 * ULTRA-ROBUST DECODER
 * Supports standard and URL-safe Base64 for the API key.
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
    // 1. Load and decode key
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

    // 2. AI RESEARCH PHASE (FORCING V1 STABLE)
    try {
        if (!FINAL_API_KEY || FINAL_API_KEY.length < 10) throw new Error("KEY_EMPTY");

        // Force STABLE V1 to avoid 404 in v1beta
        const client = new GoogleGenAI({
            apiKey: FINAL_API_KEY,
            // @ts-ignore
            apiVersion: "v1"
        });

        console.log("Service: Querying Gemini v1 (Stable)...");

        const systemPrompt = `You are a Fortnite news reporter. 
        OFFICIAL: ${isOfficiallyOnline ? "ONLINE" : "OFFLINE"}.
        Identify 3 trending news. Output valid JSON only.
        Format: {"isOnline":boolean, "messages":Object, "news":Array}
        Translate EVERYTHING to: en, bg, es, de, fr, it, ru.`;

        const result = await client.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: "user", parts: [{ text: "Provide status and 3 news summaries." }] }],
            config: {
                // @ts-ignore
                system_instruction: { parts: [{ text: systemPrompt }] },
                max_output_tokens: 8192,
                response_mime_type: "application/json"
            }
        });

        const responseText = result.response.text();
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace === -1) throw new Error("DATA_ERR");

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

        let diag = "ERR";
        if (error.message.includes("404")) diag = "NOT_FOUND";
        else if (error.message.includes("403")) diag = "FORBIDDEN";
        else diag = error.message.substring(0, 10);

        const errorMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            errorMap[lang] = `${getTranslation(lang).error_gemini} (${diag})`;
        });
        return { isOnline: isOfficiallyOnline, messages: errorMap, rumorMessages: {}, news: [] };
    }
};
