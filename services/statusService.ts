import { CheckResult, Language } from "../types";
import { getTranslation, LANGUAGE_NAMES } from "../translations";

const PROXIES = [
    "https://api.codetabs.com/v1/proxy/?quest=https://status.epicgames.com/api/v2/summary.json",
    "https://corsproxy.io/?https://status.epicgames.com/api/v2/summary.json"
];

export const checkFortniteServerStatus = async (): Promise<CheckResult> => {
    let isOfficiallyOnline = true; // Bias towards Online
    
    // Try each proxy until one works
    for (const proxyUrl of PROXIES) {
        try {
            const statusReq = await fetch(`${proxyUrl}&t=${Date.now()}`);
            if (statusReq.ok) {
                const data = await statusReq.json();

                if (data.components && Array.isArray(data.components)) {
                    const coreFn = data.components.find((c: any) => c.name === "Fortnite");
                    
                    if (coreFn) {
                        const s = coreFn.status.toLowerCase();
                        if (s === "major_outage" || s === "under_maintenance") {
                            isOfficiallyOnline = false;
                        } else {
                            isOfficiallyOnline = true;
                        }
                    } else {
                        const fnComponents = data.components.filter((c: any) => 
                            c.name.toLowerCase().includes("fortnite") && 
                            !c.name.toLowerCase().includes("china")
                        );
                        
                        if (fnComponents.length > 0) {
                            const statuses = fnComponents.map((c: any) => c.status.toLowerCase());
                            if (statuses.includes("major_outage") || statuses.includes("under_maintenance")) {
                                isOfficiallyOnline = false;
                            } else {
                                isOfficiallyOnline = true;
                            }
                        } else {
                            const officialIndicator = (data.status?.indicator || "none").toLowerCase();
                            isOfficiallyOnline = officialIndicator !== "major" && officialIndicator !== "critical";
                        }
                    }
                    break;
                }
            }
        } catch (e) {
            console.warn(`Proxy ${proxyUrl} failed, trying next...`);
        }
    }

    const messages: Record<Language, string> = {} as any;
    (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => {
        messages[lang] = isOfficiallyOnline 
            ? getTranslation(lang).inference_online 
            : getTranslation(lang).inference_offline;
    });

    return { 
        isOnline: isOfficiallyOnline, 
        messages: messages
    };
};
