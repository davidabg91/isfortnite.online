
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ServerStatus, Language, NewsItem } from './types';
import { checkFortniteServerStatus } from './services/geminiService';
import { StatusScreen } from './components/StatusScreen';
import { WelcomeModal } from './components/WelcomeModal';
import { getTranslation, LANGUAGE_NAMES } from './translations';
import { checkPremiumCode } from './premiumCodes';

// 15 Minutes in milliseconds
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const CACHE_KEY = 'fortnite_status_cache_v3';
const WELCOME_SEEN_KEY = 'fortnite_status_welcome_seen';

interface CachedData {
  status: ServerStatus;
  messages: Record<Language, string>;
  rumorMessages: Record<Language, string>;
  news: NewsItem[];
  sources: { uri: string; title: string }[];
  timestamp: number;
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

  const [sources, setSources] = useState<{ uri: string; title: string }[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // New Timer Logic: Target timestamp for next check (epoch ms)
  const [nextCheckTime, setNextCheckTime] = useState<number>(Date.now() + CHECK_INTERVAL_MS);
  const [secondsUntilNext, setSecondsUntilNext] = useState<number>(30 * 60);

  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'status' | 'shop'>('status');

  // Ref to track status for sound notification comparison without adding dependency
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  // Initialize Language, Premium State, and Welcome Modal
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0].toLowerCase() as Language;
    const supportedLangs: Language[] = ['en', 'bg', 'es', 'de', 'fr', 'it', 'ru'];
    if (supportedLangs.includes(browserLang)) {
      setLanguage(browserLang);
    } else {
      setLanguage('en');
    }

    const storedPremium = localStorage.getItem('isPremium');
    if (storedPremium === 'true') {
      setIsPremium(true);
    }

    const hasSeenWelcome = localStorage.getItem(WELCOME_SEEN_KEY);
    if (!hasSeenWelcome) {
      setShowWelcome(true);
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

  const closeWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem(WELCOME_SEEN_KEY, 'true');
  };

  const sendVisitNotification = async () => {
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
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
  const performCheck = useCallback(async (isManualRefresh = false) => {
    const nowTimestamp = Date.now();
    setNextCheckTime(nowTimestamp + CHECK_INTERVAL_MS);

    setStatus(ServerStatus.CHECKING);

    // AI Economy Logic
    const cached = localStorage.getItem(CACHE_KEY);
    let shouldSkipAI = true;

    if (isManualRefresh) {
      shouldSkipAI = false;
    } else if (cached) {
      try {
        const parsed: CachedData = JSON.parse(cached);
        const age = nowTimestamp - parsed.timestamp;
        // Only refresh AI data (news/rumors) every 12 hours to save tokens
        // OR if the servers were previously offline
        if (age > 12 * 60 * 60 * 1000 || parsed.status !== ServerStatus.ONLINE) {
          shouldSkipAI = false;
        }
      } catch (e) {
        shouldSkipAI = false;
      }
    } else {
      // No cache at all? Must run AI.
      shouldSkipAI = false;
    }

    const result = await checkFortniteServerStatus(shouldSkipAI);
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

    // If AI was skipped, we keep existing news and rumors from state/cache
    if (!shouldSkipAI) {
      setMessagesMap(result.messages);
      setRumorMessagesMap(result.rumorMessages);
      setNews(result.news || []);
      if (result.sources) setSources(result.sources);
    }

    // Save to Cache
    const cacheData: CachedData = {
      status: newStatus,
      messages: !shouldSkipAI ? result.messages : messagesMap,
      rumorMessages: !shouldSkipAI ? result.rumorMessages : rumorMessagesMap,
      news: !shouldSkipAI ? (result.news || []) : news,
      sources: !shouldSkipAI ? (result.sources || []) : sources,
      timestamp: !shouldSkipAI ? checkTime.getTime() : (cached ? JSON.parse(cached).timestamp : checkTime.getTime()),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

  }, [messagesMap, rumorMessagesMap, news, sources]);

  // Initial Load Logic (Runs once)
  useEffect(() => {
    const loadFromCache = () => {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed: CachedData = JSON.parse(cached);
          const age = Date.now() - parsed.timestamp;

          if (age < CHECK_INTERVAL_MS) {
            setStatus(parsed.status);
            setMessagesMap(parsed.messages);
            setRumorMessagesMap(parsed.rumorMessages || {});
            setNews(parsed.news || []);
            setSources(parsed.sources);
            setLastChecked(new Date(parsed.timestamp));
            setNextCheckTime(parsed.timestamp + CHECK_INTERVAL_MS);
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
        onCheckNow={performCheck}
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
