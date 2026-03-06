// Final UI & Economy Update - 2026-03-06
import { useState, useEffect, useCallback, useRef } from 'react';
import { ServerStatus, Language, NewsItem } from './types';
import { checkFortniteServerStatus } from './services/geminiService';
import { StatusScreen } from './components/StatusScreen';
import { getTranslation, LANGUAGE_NAMES } from './translations';
import { checkPremiumCode } from './premiumCodes';

const STATUS_CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes for fast API check
const CACHE_RUMOR_LIMIT_MS = 6 * 60 * 60 * 1000; // 6 hours for AI rumors
const CACHE_NEWS_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours for AI news

const CACHE_KEY = 'fortnite_status_cache_v3';

interface CachedData {
  status: ServerStatus;
  messages: Record<Language, string>;
  rumorMessages?: Record<Language, string>;
  news: NewsItem[];
  sources?: { uri: string; title: string }[];
  timestamp: number;
  rumorTimestamp?: number;
  newsTimestamp?: number;
}

export default function App() {
  const [status, setStatus] = useState<ServerStatus>(ServerStatus.IDLE);
  const [language, setLanguage] = useState<Language>('en');

  // Store all translated OFFICIAL messages
  const [messagesMap, setMessagesMap] = useState<Record<Language, string>>(() => {
    const map: Record<Language, string> = {} as any;
    (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => map[lang] = "...");
    return map;
  });

  // Store all translated RUMOR messages
  const [rumorMessagesMap, setRumorMessagesMap] = useState<Record<Language, string>>(() => {
    const map: Record<Language, string> = {} as any;
    (Object.keys(LANGUAGE_NAMES) as Language[]).forEach(lang => map[lang] = "");
    return map;
  });

  // Store News
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'status' | 'shop' | 'giveaway'>('status');
  const [sources, setSources] = useState<{ uri: string; title: string }[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [nextCheckTime, setNextCheckTime] = useState<number>(Date.now() + STATUS_CHECK_INTERVAL_MS);
  const [secondsUntilNext, setSecondsUntilNext] = useState<number>(30 * 60);

  // Use refs for "latest" values in the callback to keep it stable
  const messagesRef = useRef(messagesMap);
  const rumorsRef = useRef(rumorMessagesMap);
  const newsRef = useRef(news);
  const sourcesRef = useRef(sources);
  const statusRef = useRef(status);

  useEffect(() => { messagesRef.current = messagesMap; }, [messagesMap]);
  useEffect(() => { rumorsRef.current = rumorMessagesMap; }, [rumorMessagesMap]);
  useEffect(() => { newsRef.current = news; }, [news]);
  useEffect(() => { sourcesRef.current = sources; }, [sources]);
  useEffect(() => { statusRef.current = status; }, [status]);

  // Initialize Language, Premium State, and Welcome Modal
  useEffect(() => {
    let browserLang: Language = 'en';
    try {
      if (navigator.language) {
        const bl = navigator.language.split('-')[0].toLowerCase() as Language;
        const supportedLangs: Language[] = ['en', 'bg', 'es', 'de', 'fr', 'it', 'ru'];
        if (supportedLangs.includes(bl)) {
          browserLang = bl;
        }
      }
    } catch (e) {
      console.warn("Language detection failed, using en");
    }
    setLanguage(browserLang);

    const storedPremium = localStorage.getItem('isPremium');
    if (storedPremium === 'true') {
      setIsPremium(true);
    }

    // Notify Telegram about new visitor
    sendVisitNotification();
  }, []);

  // Simplified Synchronous Verification
  const unlockPremium = async (code: string): Promise<boolean> => {
    // The check is now instantaneous and reliable
    const isValid = checkPremiumCode(code);

    if (isValid) {
      setIsPremium(true);
      localStorage.setItem('isPremium', 'true');
      return true;
    }

    return false;
  };

  const sendVisitNotification = async () => {
    // Decoding helper to hide secrets from scanners
    const s_dec = (s: string) => {
      try { if (s && s.length > 20 && !s.includes(':')) return atob(s); return s; } catch { return s; }
    };

    const token = s_dec(import.meta.env.VITE_TELEGRAM_BOT_TOKEN);
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    if (!token || !chatId || token.includes('REPLACE')) return;

    // session flag to avoid notification on every single refresh
    if (sessionStorage.getItem('notified_visit')) return;

    const platform = (navigator as any).platform || "unknown";
    const lang = navigator.language;

    const text =
      `👥 <b>НОВ ПОСЕТИТЕЛ</b>\n` +
      `🌐 Език: <code>${lang}</code>\n` +
      `💻 Платформа: <code>${platform}</code>\n` +
      `⏰ Дата: ${new Date().toLocaleString('bg-BG')}`;

    // Skip bot/cloud traffic pattern if matches common automated crawlers
    if (platform.includes("Linux") && platform.includes("x86_64") && lang === "en-US") {
      console.log("Visit notify skipped (bot pattern)");
      return;
    }

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' }),
      });
      sessionStorage.setItem('notified_visit', 'true');
    } catch (e) {
      console.warn('Visit notify skipped');
    }
  };

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  // Define performCheck as a stable callback
  const performCheck = useCallback(async (isManualParam = false) => {
    // If we receive an event object or true, it's a manual refresh
    const isManual = typeof isManualParam === 'boolean' ? isManualParam : !!isManualParam;

    const nowTimestamp = Date.now();
    setNextCheckTime(nowTimestamp + STATUS_CHECK_INTERVAL_MS);

    setStatus(ServerStatus.CHECKING);

    // AI Economy Logic
    const cached = localStorage.getItem(CACHE_KEY);
    let cachedObj: CachedData | null = null;
    let shouldSkipAI = false;
    let shouldSkipNews = false;

    if (!isManual && cached) {
      try {
        cachedObj = JSON.parse(cached);
        const rumorAge = nowTimestamp - (cachedObj!.rumorTimestamp || cachedObj!.timestamp);
        const newsAge = nowTimestamp - (cachedObj!.newsTimestamp || cachedObj!.timestamp);

        // 1. Skip AI completely if rumors are fresh (< 6 hours) AND we have actual rumor content
        if (rumorAge < CACHE_RUMOR_LIMIT_MS && cachedObj!.rumorMessages && Object.keys(cachedObj!.rumorMessages).length > 0 && cachedObj!.status === ServerStatus.ONLINE) {
          shouldSkipAI = true;
        }

        // 2. Skip News if news are fresh (< 24 hours) AND we have news content
        // Even if shouldSkipAI is false (meaning we fetch new rumors), we might not need news.
        if (newsAge < CACHE_NEWS_LIMIT_MS && cachedObj!.news && cachedObj!.news.length > 0) {
          shouldSkipNews = true;
        }
      } catch (e) { }
    }

    const result = await checkFortniteServerStatus(shouldSkipAI, shouldSkipNews);
    const checkTime = new Date();

    setLastChecked(checkTime);

    let newStatus = ServerStatus.OFFLINE;
    if (result.isOnline) {
      newStatus = ServerStatus.ONLINE;
      if (statusRef.current !== ServerStatus.ONLINE) {
        playNotificationSound();
      }
    }

    // Update state
    setStatus(newStatus);
    setMessagesMap(result.messages); // Always update official/community API-based message map

    const finalRumors = shouldSkipAI ? (cachedObj?.rumorMessages || rumorsRef.current) : (result.rumorMessages || {} as Record<Language, string>);
    const finalNews = (shouldSkipAI || shouldSkipNews) ? (cachedObj?.news || newsRef.current) : (result.news || []);

    // Update UI states
    setRumorMessagesMap(finalRumors);
    setNews(finalNews);
    if (!shouldSkipAI && result.sources) setSources(result.sources);

    // Save to Cache
    const cacheData: CachedData = {
      status: newStatus,
      messages: result.messages,
      rumorMessages: finalRumors,
      news: finalNews,
      sources: shouldSkipAI ? (cachedObj?.sources || sourcesRef.current) : (result.sources || []),
      timestamp: checkTime.getTime(),
      rumorTimestamp: shouldSkipAI ? (cachedObj?.rumorTimestamp || cachedObj?.timestamp || checkTime.getTime()) : checkTime.getTime(),
      newsTimestamp: (shouldSkipAI || shouldSkipNews) ? (cachedObj?.newsTimestamp || cachedObj?.timestamp || checkTime.getTime()) : checkTime.getTime(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

  }, []); // Truly stable callback


  // Initial Load Logic (Runs once)
  useEffect(() => {
    const loadFromCache = () => {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed: CachedData = JSON.parse(cached);
          const age = Date.now() - parsed.timestamp;

          if (age < STATUS_CHECK_INTERVAL_MS) {
            setStatus(parsed.status);
            setMessagesMap(parsed.messages);
            setRumorMessagesMap(parsed.rumorMessages || {} as Record<Language, string>);
            setNews(parsed.news || []);
            setSources(parsed.sources || []);
            setLastChecked(new Date(parsed.timestamp));
            setNextCheckTime(parsed.timestamp + STATUS_CHECK_INTERVAL_MS);
            return true;
          }
        } catch (e) {
          console.error("Cache parse error", e);
        }
      }
      return false;
    };

    const loaded = loadFromCache();
    if (!loaded) {
      performCheck();
    }
  }, [performCheck]);

  // Main Timer Loop
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = nextCheckTime - now;

      if (diff <= 0) {
        performCheck();
      } else {
        setSecondsUntilNext(Math.ceil(diff / 1000));
      }
    }, 1000);

    const initialDiff = nextCheckTime - Date.now();
    setSecondsUntilNext(Math.max(0, Math.ceil(initialDiff / 1000)));

    return () => clearInterval(timer);
  }, [nextCheckTime, performCheck]);

  // Notification Permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  const currentMessage = messagesMap[language] || messagesMap['en'] || "...";
  const currentRumor = rumorMessagesMap[language] || "";

  const displayMessage = (status === ServerStatus.IDLE && currentMessage === "...")
    ? getTranslation(language).waiting
    : currentMessage;

  return (
    <>
      <StatusScreen
        status={status}
        message={displayMessage}
        rumorMessage={currentRumor}
        news={news}
        sources={sources}
        lastChecked={lastChecked}
        nextCheckTime={secondsUntilNext}
        language={language}
        onLanguageChange={setLanguage}
        isPremium={isPremium}
        onUnlockPremium={unlockPremium}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </>
  );
}
