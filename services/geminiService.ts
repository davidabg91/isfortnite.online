
import { GoogleGenAI } from "@google/genai";
import { CheckResult, Language } from "../types";
import { getTranslation, LANGUAGE_NAMES } from "../translations";

// SECURITY STRATEGY: OBFUSCATED FALLBACK ASSEMBLY
const s_dec = (s: string) => {
    try {
        if (!s) return s;
        const cleaned = s.trim();
        // If it's a base64 encoded string from GitHub Secrets, decode it
        if (cleaned.length > 20 && !cleaned.startsWith("AIza")) return atob(cleaned);
        return cleaned;
    } catch (e) {
        console.error("Decoding failed", e);
        return s;
    }
};

const FINAL_API_KEY = s_dec((import.meta.env.VITE_GEMINI_API_KEY || "").trim());

if (!FINAL_API_KEY || FINAL_API_KEY === "PLACEHOLDER_API_KEY") {
    console.warn("Gemini API Key is missing!");
} else {
    console.log("Gemini API Key detected.");
}

const ai = new GoogleGenAI({ apiKey: FINAL_API_KEY, apiVersion: "v1" });

const EPIC_STATUS_API = "https://api.codetabs.com/v1/proxy/?quest=https://status.epicgames.com/api/v2/status.json";

export const checkFortniteServerStatus = async (skipAI = false): Promise<CheckResult> => {
    // ... rest of the code stays same ...
    console.log(`Service: Starting Fortnite Server Check (AI Skip: ${skipAI})...`);
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const currentLocalTime = now.toLocaleString('en-US', { timeZone: userTimezone, hour: '2-digit', minute: '2-digit', hour12: false });

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
            console.log("Service: Epic Status Data:", data.status?.description);
            const indicator = data.status?.indicator;
            isOfficiallyOnline = indicator === "none";
        } else {
            console.warn(`Direct Epic API failed with status: ${statusReq.status}. Falling back to AI only.`);
        }
    } catch (e) {
        console.warn("Failed to fetch direct Epic API or proxy is down", e);
    }

    console.log("Service: Official Status (via Epic):", isOfficiallyOnline ? "ONLINE" : "ISSUES/OFFLINE");

    // ECONOMIC MODE: If servers are fine and we are skipping AI, return now
    if (skipAI && isOfficiallyOnline) {
        console.log("Service: Economy mode active. Skipping AI research.");

        // Generate a clean 'Online' message map from translations
        const onlineMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            onlineMap[lang] = getTranslation(lang).inference_online;
        });

        return {
            isOnline: isOfficiallyOnline,
            messages: onlineMap,
            rumorMessages: {} as any,
            news: [],
            sources: []
        };
    }

    try {
        console.log("Service: Calling Gemini AI...");
        const systemInstruction = `You are a strict server status reporter for Fortnite.
    CONTEXT:
    - User Timezone: ${userTimezone}
    - Current User Time: ${currentLocalTime}
    - **OFFICIAL API DATA**: ${rawStatusData ? JSON.stringify(rawStatusData) : "Not available (Search manually)"}
    
    1. If "OFFICIAL API DATA" is provided, trust it 100%. (indicator "none" = ONLINE)
    2. Only use Google Search for "Rumors" or details about outages/news.
    3. Find top 3 trending Fortnite news from last 24h.
    4. For each news 'summary', provide a DETAILED update (3-4 sentences long) explaining exactly what is happening.
    5. Output MUST BE VALID JSON ONLY.`;

        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash-8b",
            contents: `Search for Fortnite server status and latest news in the last 24h. Output valid JSON: { isOnline: boolean, messages: Record<string, string>, rumorMessages: Record<string, string>, news: Array<{title: Record<string, string>, summary: Record<string, string>, url: string}> }. Translate titles and summaries (detailed, 3-4 sentences each) to all: en, bg, es, de, fr, it, ru.`,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: systemInstruction,
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
            },
        });

        let text = "";
        try {
            text = response.text || "";
        } catch (e) {
            // @ts-ignore
            text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }

        const sources: { uri: string; title: string }[] = [];
        try {
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (Array.isArray(chunks)) {
                chunks.forEach((chunk: any) => {
                    if (chunk.web) sources.push({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri });
                });
            }
        } catch (e) { }

        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1) {
            console.error("Service: AI returned invalid JSON format.");
            return { isOnline: isOfficiallyOnline, messages: fallbackMap, rumorMessages: fallbackMap, news: [], sources };
        }

        const jsonString = text.substring(firstBrace, lastBrace + 1);
        let parsedData: any = JSON.parse(jsonString);

        let finalIsOnline = rawStatusData ? isOfficiallyOnline : !!parsedData.isOnline;
        const messages = parsedData.messages || fallbackMap;
        const rumorMessages = parsedData.rumorMessages || {};
        const news = parsedData.news || [];

        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            if (!messages[lang]) messages[lang] = finalIsOnline ? getTranslation(lang).inference_online : getTranslation(lang).inference_offline;
            if (typeof rumorMessages[lang] !== 'string') rumorMessages[lang] = "";
        });

        return { isOnline: finalIsOnline, messages, rumorMessages, news, sources };

    } catch (error: any) {
        console.error("Gemini Critical Error:", error);

        const errorMessage = error?.message || "Unknown error";
        const isRestricted = errorMessage.includes("API_KEY_HTTP_REFERRER_BLOCKED") || error?.status === 403;
        const isKeyError = errorMessage.includes("API_KEY_INVALID");

        const errorMap: Record<Language, string> = {} as any;
        (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
            if (isRestricted) errorMap[lang] = getTranslation(lang).error_restricted;
            else if (isKeyError) errorMap[lang] = "API Key Invalid. Check encoding.";
            else errorMap[lang] = `${getTranslation(lang).error_gemini} (${errorMessage.substring(0, 20)}...)`;
        });
        return { isOnline: false, messages: errorMap, rumorMessages: {} as any, news: [] };
    }
};
