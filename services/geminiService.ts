
import { GoogleGenAI } from "@google/genai";
import { CheckResult, Language } from "../types";
import { getTranslation, LANGUAGE_NAMES } from "../translations";

/**
 * SECURITY STRATEGY: OBFUSCATED FALLBACK ASSEMBLY
 * Safely decodes base64 strings commonly used for GitHub Secrets.
 */
const s_dec = (s: string) => {
    try {
        if (!s) return "";
        const cleaned = s.trim();
        // If it looks like base64 (long and NOT starting with AIza)
        if (cleaned.length > 20 && !cleaned.startsWith("AIza") && !cleaned.includes("-")) {
            return atob(cleaned);
        }
        return cleaned;
    } catch (e) {
        return s || "";
    }
};

const EPIC_STATUS_API = "https://api.codetabs.com/v1/proxy/?quest=https://status.epicgames.com/api/v2/status.json";

export const checkFortniteServerStatus = async (skipAI = false): Promise<CheckResult> => {
    // 1. Load and decode key immediately
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

    // ECONOMIC MODE
    if (skipAI && isOfficiallyOnline) {
        const onlineMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            onlineMap[lang] = getTranslation(lang).inference_online;
        });
        return { isOnline: true, messages: onlineMap, rumorMessages: {} as any, news: [], sources: [] };
    }

    // 2. AI RESEARCH PHASE
    try {
        // Critical Key Check
        if (!FINAL_API_KEY || FINAL_API_KEY.length < 10) {
            throw new Error("KEY_MISSING");
        }

        console.log("Service: AI Inquiry (v1beta grounding)...");
        const genAI = new GoogleGenAI(FINAL_API_KEY);

        const systemPrompt = `You are a Fortnite status reporter. 
        OFFICIAL STATUS: ${isOfficiallyOnline ? "ONLINE" : "ISSUES"}.
        1. Find 3 news from last 24h. 
        2. Detailed summaries (3-4 sentences). 
        3. Output VALID JSON ONLY: {isOnline:boolean, messages:Object, news:Array}.`;

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            // @ts-ignore
            systemInstruction: systemPrompt
        }, { apiVersion: 'v1beta' });

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: "Gather Fortnite status and news for: en, bg, es, de, fr, it, ru." }] }],
            generationConfig: { responseMimeType: "application/json" },
            // @ts-ignore
            tools: [{ googleSearch: {} }]
        });

        const text = result.response.text();
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace === -1) throw new Error("INVALID_DATA");

        const parsedData = JSON.parse(text.substring(firstBrace, lastBrace + 1));

        const finalIsOnline = isOfficiallyOnline || !!parsedData.isOnline;
        const messages = parsedData.messages || fallbackMap;
        const news = parsedData.news || [];

        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            if (!messages[lang]) messages[lang] = finalIsOnline ? getTranslation(lang).inference_online : getTranslation(lang).inference_offline;
        });

        return { isOnline: finalIsOnline, messages, rumorMessages: {}, news, sources: [] };

    } catch (error: any) {
        console.error("Gemini Error:", error.message);
        const errCode = error.message === "KEY_MISSING" ? "KEY_MISSING" : error.message?.substring(0, 10);

        const errorMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            errorMap[lang] = `${getTranslation(lang).error_gemini} (${errCode})`;
        });
        return { isOnline: isOfficiallyOnline, messages: errorMap, rumorMessages: {}, news: [] };
    }
};
