
import { GoogleGenAI } from "@google/genai";
import { CheckResult, Language } from "../types";
import { getTranslation, LANGUAGE_NAMES } from "../translations";

// SECURITY STRATEGY: OBFUSCATED FALLBACK ASSEMBLY
const s_dec = (s: string) => {
    try {
        if (!s) return s;
        const cleaned = s.trim();
        if (cleaned.length > 20 && !cleaned.startsWith("AIza")) return atob(cleaned);
        return cleaned;
    } catch (e) {
        console.error("Decoding failed", e);
        return s;
    }
};

const FINAL_API_KEY = s_dec((import.meta.env.VITE_GEMINI_API_KEY || "").trim());

// Initializing the new v1 SDK client
const ai = new GoogleGenAI({
    apiKey: FINAL_API_KEY,
    apiVersion: "v1"
});

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
        }
    } catch (e) {
        console.warn("Epic API failed", e);
    }

    if (skipAI && isOfficiallyOnline) {
        const onlineMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            onlineMap[lang] = getTranslation(lang).inference_online;
        });
        return { isOnline: true, messages: onlineMap, rumorMessages: {} as any, news: [], sources: [] };
    }

    try {
        console.log("Service: Requesting AI with snake_case config...");

        const systemPrompt = `You are a Fortnite server status reporter. 
        OFFICIAL STATUS: ${isOfficiallyOnline ? "ONLINE" : "OFFLINE"}.
        Provide status messages and 3 latest news in Bulgarian and English. 
        Output JSON: {isOnline:boolean, messages:Object, news:Array}`;

        // IMPORTANT: The @google/genai SDK (v1.x) REQUIRES snake_case for config fields!
        const result = await ai.models.generateContent({
            model: "gemini-1.5-flash-8b",
            contents: [{
                role: "user",
                parts: [{ text: "Check Fortnite status and provide detailed news summaries (3-4 sentences each) for all languages." }]
            }],
            config: {
                system_instruction: systemPrompt,
                max_output_tokens: 8192,
                response_mime_type: "application/json",
            } as any
        });

        // The response structure in @google/genai is response.candidates[0].content.parts[0].text
        let text = "";
        try {
            // @ts-ignore
            text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch (e) {
            console.error("Failed to extract JSON from AI response", e);
        }

        if (!text) throw new Error("Empty AI response");

        const parsedData = JSON.parse(text);

        let finalIsOnline = isOfficiallyOnline || !!parsedData.isOnline;
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
        console.error("Gemini Error:", error);
        const errorMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            errorMap[lang] = `${getTranslation(lang).error_gemini} (${error.message?.substring(0, 20)})`;
        });
        return { isOnline: isOfficiallyOnline, messages: errorMap, rumorMessages: {} as any, news: [] };
    }
};
