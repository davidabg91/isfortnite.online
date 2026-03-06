
import { GoogleGenAI } from "@google/genai";
import { CheckResult, Language } from "../types";
import { getTranslation, LANGUAGE_NAMES } from "../translations";

/**
 * SECURITY STRATEGY: OBFUSCATED FALLBACK ASSEMBLY
 * Safely decodes base64 strings commonly used for GitHub Secrets.
 */
const s_dec = (s: string) => {
    try {
        if (!s) return s;
        const cleaned = s.trim();
        // If it looks like base64 (long and NOT starting with AIza which is cleartext key format)
        if (cleaned.length > 20 && !cleaned.startsWith("AIza")) {
            return atob(cleaned);
        }
        return cleaned;
    } catch (e) {
        console.warn("Service: Decoding failed", e);
        return s;
    }
};

const EPIC_STATUS_API = "https://api.codetabs.com/v1/proxy/?quest=https://status.epicgames.com/api/v2/status.json";

/**
 * Main function to check Fortnite server status and fetch news.
 */
export const checkFortniteServerStatus = async (skipAI = false): Promise<CheckResult> => {
    const rawEnvKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const FINAL_API_KEY = s_dec(rawEnvKey.trim());

    // Safe timestamp and timezone detection
    let currentLocalTime = "N/A";
    let userTimezone = "UTC";
    try {
        userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        currentLocalTime = new Date().toLocaleString('en-US', {
            timeZone: userTimezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch (e) { }

    const fallbackMap: Record<Language, string> = {} as any;
    (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
        fallbackMap[lang] = getTranslation(lang).fallback_message;
    });

    let rawStatusData = null;
    let isOfficiallyOnline = false;

    // Phase 1: Direct Status Check (Official API)
    try {
        const statusReq = await fetch(EPIC_STATUS_API);
        if (statusReq.ok) {
            const data = await statusReq.json();
            rawStatusData = data;
            isOfficiallyOnline = data.status?.indicator === "none";
            console.log("Service: Status indicator:", data.status?.indicator);
        }
    } catch (e) {
        console.warn("Service: EPIC API skipped:", e.message);
    }

    // ECONOMIC MODE
    if (skipAI && isOfficiallyOnline) {
        const onlineMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            onlineMap[lang] = getTranslation(lang).inference_online;
        });
        return { isOnline: true, messages: onlineMap, rumorMessages: {} as any, news: [], sources: [] };
    }

    // Phase 2: AI Research (Intel & News)
    try {
        if (!FINAL_API_KEY || FINAL_API_KEY.includes("PLACEHOLDER")) {
            throw new Error("API_KEY_MISSING");
        }

        console.log("Service: Initiating AI inquiry...");

        // Use v1beta for widest availability of Google Search grounding
        const genAI = new GoogleGenAI(FINAL_API_KEY);

        const systemPrompt = `You are a professional Fortnite status reporter.
        OFFICIAL EPIC STATUS: ${isOfficiallyOnline ? "ONLINE" : "ISSUES/OFFLINE"}.
        1. Find 3 latest Fortnite news updates from the last 24h.
        2. Write 3-4 detailed sentences per news summary.
        3. Output valid JSON: {isOnline:boolean, messages:Object, news:Array}.
        4. Languages to translate: en, bg, es, de, fr, it, ru.`;

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            // @ts-ignore
            systemInstruction: systemPrompt
        });

        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [{ text: "Report Fortnite status and detailed news. Use JSON format." }]
            }],
            generationConfig: {
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
            },
            // @ts-ignore
            tools: [{ googleSearch: {} }]
        });

        const responseText = result.response.text();
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');

        if (firstBrace === -1) throw new Error("INVALID_AI_RESPONSE");

        const jsonString = responseText.substring(firstBrace, lastBrace + 1);
        const parsedData = JSON.parse(jsonString);

        const finalIsOnline = isOfficiallyOnline || !!parsedData.isOnline;
        const messages = parsedData.messages || fallbackMap;
        const news = parsedData.news || [];

        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            if (!messages[lang]) messages[lang] = finalIsOnline ? getTranslation(lang).inference_online : getTranslation(lang).inference_offline;
        });

        return {
            isOnline: finalIsOnline,
            messages,
            rumorMessages: parsedData.rumorMessages || {},
            news: news,
            sources: []
        };

    } catch (error: any) {
        console.error("Service: Gemini failure:", error.message);

        const errorMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            const baseMsg = getTranslation(lang).error_gemini;
            errorMap[lang] = `${baseMsg} (${error.message?.substring(0, 15)})`;
        });

        return { isOnline: isOfficiallyOnline, messages: errorMap, rumorMessages: {} as any, news: [] };
    }
};
