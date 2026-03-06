
import { GoogleGenAI } from "@google/genai";
import { CheckResult, Language } from "../types";
import { getTranslation, LANGUAGE_NAMES } from "../translations";

// SECURITY STRATEGY: OBFUSCATED FALLBACK ASSEMBLY
const s_dec = (s: string) => {
    try {
        if (!s) return s;
        const cleaned = s.trim();
        // Decode base64 if needed
        if (cleaned.length > 20 && !cleaned.startsWith("AIza")) return atob(cleaned);
        return cleaned;
    } catch (e) {
        console.error("Decoding failed", e);
        return s;
    }
};

const FINAL_API_KEY = s_dec((import.meta.env.VITE_GEMINI_API_KEY || "").trim());

// We must use v1beta to have access to Google Search (grounding)
const genAI = new GoogleGenAI(FINAL_API_KEY);

const EPIC_STATUS_API = "https://api.codetabs.com/v1/proxy/?quest=https://status.epicgames.com/api/v2/status.json";

export const checkFortniteServerStatus = async (skipAI = false): Promise<CheckResult> => {
    console.log(`Service: Starting Fortnite Server Check (AI Skip: ${skipAI})...`);

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const currentLocalTime = now.toLocaleString('en-US', { timeZone: userTimezone, hour: '2-digit', minute: '2-digit', hour12: false });

    // Fallback translations
    const fallbackMap: Record<Language, string> = {} as any;
    (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
        fallbackMap[lang] = getTranslation(lang).fallback_message;
    });

    let rawStatusData = null;
    let isOfficiallyOnline = false;

    try {
        const statusReq = await fetch(EPIC_STATUS_API);
        if (statusReq.ok) {
            const data = await statusReq.json();
            rawStatusData = data;
            isOfficiallyOnline = data.status?.indicator === "none";
            console.log("Service: Epic Status:", data.status?.description);
        }
    } catch (e) {
        console.warn("Epic API failed", e);
    }

    if (skipAI && isOfficiallyOnline) {
        console.log("Service: Economy mode active. AI skipped.");
        const onlineMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            onlineMap[lang] = getTranslation(lang).inference_online;
        });
        return { isOnline: true, messages: onlineMap, rumorMessages: {} as any, news: [], sources: [] };
    }

    try {
        console.log("Service: Calling Gemini AI (v1beta stable pattern)...");

        const systemPrompt = `You are a professional Fortnite status reporter.
        OFFICIAL EPIC DATA: ${isOfficiallyOnline ? "ONLINE" : "OFFLINE/ISSUES"}.
        1. Find 3 latest Fortnite news (last 24h).
        2. Write summaries that are 3-4 sentences long.
        3. Output VALID JSON with: isOnline (boolean), messages (translated status), news (array).
        4. Languages: en, bg, es, de, fr, it, ru.`;

        // Proper SDK pattern: getGenerativeModel with options
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            // @ts-ignore
            systemInstruction: systemPrompt
        });

        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [{ text: "Gather results and translate to all languages. Focus on detailed news." }]
            }],
            generationConfig: {
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
            },
            // @ts-ignore
            tools: [{ googleSearch: {} }]
        });

        const responseText = result.response.text();
        console.log("Service: AI response success. Length:", responseText.length);

        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace === -1) throw new Error("No JSON in response");

        const jsonString = responseText.substring(firstBrace, lastBrace + 1);
        const parsedData = JSON.parse(jsonString);

        const finalIsOnline = isOfficiallyOnline || !!parsedData.isOnline;
        const messages = parsedData.messages || fallbackMap;
        const news = parsedData.news || [];

        // Fill missing translations if any
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
        console.error("Gemini Error:", error);
        const errorMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            errorMap[lang] = `${getTranslation(lang).error_gemini} (${error.status || 'ERR'})`;
        });
        return { isOnline: isOfficiallyOnline, messages: errorMap, rumorMessages: {} as any, news: [] };
    }
};
