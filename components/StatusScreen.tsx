
import React, { useState } from 'react';
import { ServerStatus, Language, NewsItem } from '../types';
import { AlertCircle, CheckCircle2, RefreshCw, Clock, ExternalLink, Heart, Lock, X, KeyRound, Zap, Info, Flame, Facebook } from 'lucide-react';
import { FortniteLogo } from './FortniteLogo';
import { getTranslation, LANGUAGE_NAMES } from '../translations';
import { NewsSection } from './NewsSection';
import { Shop } from './Shop';
import { ShoppingBag, Activity } from 'lucide-react';

interface StatusScreenProps {
  status: ServerStatus;
  message: string;
  rumorMessage?: string; // New optional prop
  news?: NewsItem[];
  sources?: { uri: string; title: string }[];
  lastChecked: Date | null;
  nextCheckTime: number;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isPremium: boolean;
  onUnlockPremium: (code: string) => Promise<boolean>;
  activeTab: 'status' | 'shop' | 'giveaway';
  onTabChange: (tab: 'status' | 'shop' | 'giveaway') => void;
}

export const StatusScreen: React.FC<StatusScreenProps> = ({
  status,
  message,
  rumorMessage,
  news,
  sources,
  lastChecked,
  nextCheckTime,
  language,
  onLanguageChange,
  onUnlockPremium,
  activeTab,
  onTabChange
}) => {
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [unlockSuccess, setUnlockSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showStatusInfo, setShowStatusInfo] = useState(false);

  const t = getTranslation(language);

  // Determine background based on status
  const getBackgroundClass = () => {
    switch (status) {
      case ServerStatus.ONLINE:
        return "bg-gradient-to-br from-green-500 via-green-600 to-green-800";
      case ServerStatus.CHECKING:
        return "bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-900";
      case ServerStatus.OFFLINE:
      case ServerStatus.ERROR:
      default:
        return "bg-gradient-to-br from-red-600 via-red-700 to-red-900";
    }
  };

  const isOnline = status === ServerStatus.ONLINE;
  const hasRumors = rumorMessage && rumorMessage.length > 5;


  const handleDonate = () => {
    window.open('https://revolut.me/deyvidp7g', '_blank');
  };

  const handleVerifyCode = async () => {
    if (!inputCode.trim()) return;

    setIsVerifying(true);
    setCodeError(false);

    try {
      // Even though check is sync now, we keep async signature in props for safety
      const success = await onUnlockPremium(inputCode.trim());
      if (success) {
        setUnlockSuccess(true);
        setTimeout(() => {
          setShowPremiumModal(false);
          setUnlockSuccess(false);
          setInputCode('');
        }, 1500);
      } else {
        setCodeError(true);
      }
    } catch (e) {
      setCodeError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative">

      {/* FIXED Background Layer */}
      <div className={`fixed inset-0 z-[-10] overflow-hidden transition-all duration-1000 ease-in-out ${getBackgroundClass()}`}>
        <div className={`absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20`}></div>
        {/* Animated Storm/Victory Circle */}
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] rounded-full border-[100px] blur-3xl transition-colors duration-1000 ${isOnline ? 'border-green-300/30' : 'border-purple-500/30 animate-pulse'}`}></div>
      </div>

      {/* FIXED UI Elements */}
      <div className="fixed top-6 left-6 z-50 group">
        <button
          onClick={() => setShowLangMenu(!showLangMenu)}
          className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md border border-white/20 hover:bg-black/50 transition-all transform hover:scale-110 flex items-center justify-center shadow-xl"
        >
          <span className="text-2xl" role="img" aria-label="Current Language">
            {LANGUAGE_NAMES[language].flag}
          </span>
        </button>

        {showLangMenu && (
          <div className="absolute top-14 left-0 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 animate-fade-in min-w-[3.5rem] items-center">
            {(Object.keys(LANGUAGE_NAMES) as Language[]).map((langKey) => (
              langKey !== language && (
                <button
                  key={langKey}
                  onClick={() => {
                    onLanguageChange(langKey);
                    setShowLangMenu(false);
                  }}
                  className="w-10 h-10 rounded-full hover:bg-white/20 transition-all flex items-center justify-center"
                  title={LANGUAGE_NAMES[langKey].label}
                >
                  <span className="text-xl">{LANGUAGE_NAMES[langKey].flag}</span>
                </button>
              )
            ))}
          </div>
        )}
      </div>

      {/* Social Links & Other Fixed Controls */}
      <div className="fixed top-6 left-20 z-50 flex items-center gap-3">
        <a
          href="https://www.facebook.com/profile.php?id=61586612323239"
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 rounded-full bg-[#1877F2]/20 backdrop-blur-md border border-[#1877F2]/50 hover:bg-[#1877F2]/40 transition-all transform hover:scale-110 flex items-center justify-center shadow-xl text-white group"
          title="Последвайте ни във Facebook"
        >
          <Facebook className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </a>
      </div>

      <button
        onClick={handleDonate}
        className="fixed top-4 right-4 z-50 bg-yellow-400 hover:bg-yellow-300 text-black font-burbank text-lg px-4 py-2 rounded-lg shadow-lg transform hover:scale-105 transition-all flex items-center gap-2"
      >
        <Heart className="w-5 h-5 fill-red-500 text-red-500" />
        <span className="hidden md:inline">{t.donate}</span>
      </button>

      {isOnline && activeTab !== 'shop' && (
        <div className="fixed top-0 left-0 w-full bg-yellow-400 text-black font-burbank text-center py-2 z-10 animate-slide-down shadow-lg">
          {t.victory}
        </div>
      )}

      {/* SCROLLABLE Content Layer */}
      <div className="relative flex flex-col items-center min-h-screen py-20 px-4 md:px-8">

        <FortniteLogo subtitle={t.logo_subtitle} />

        {/* --- TAB NAVIGATION --- */}
        <div className="relative z-30 mt-8 md:mt-16 mb-8 flex gap-3 md:gap-4">
          <button
            onClick={() => onTabChange('status')}
            className={`
              group relative flex items-center justify-center px-4 md:px-6 py-2 md:py-3 font-burbank text-lg md:text-xl uppercase tracking-wider transform -skew-x-12 transition-all duration-300
              ${activeTab === 'status'
                ? 'bg-blue-600 text-white border-b-4 border-blue-900 shadow-[0_0_20px_rgba(37,99,235,0.6)] scale-105'
                : 'bg-black/80 text-white/60 border-b-4 border-gray-900 hover:bg-white/10 hover:text-white'}
            `}
          >
            <div className="flex items-center gap-2 transform skew-x-12">
              <Activity className="w-4 h-4 md:w-5 md:h-5" />
              {t.tab_status}
            </div>
          </button>

          <button
            onClick={() => onTabChange('shop')}
            className={`
              group relative flex items-center justify-center px-4 md:px-6 py-2 md:py-3 font-burbank text-lg md:text-xl uppercase tracking-wider transform -skew-x-12 transition-all duration-300
              ${activeTab === 'shop'
                ? 'bg-yellow-400 text-black border-b-4 border-orange-600 shadow-[0_0_20px_rgba(250,204,21,0.6)] scale-105'
                : 'bg-black/80 text-white/60 border-b-4 border-gray-900 hover:bg-white/10 hover:text-white'}
            `}
          >
            <div className="flex items-center gap-2 transform skew-x-12">
              <ShoppingBag className={`w-4 h-4 md:w-5 md:h-5 ${activeTab === 'shop' ? 'fill-black' : ''}`} />
              {t.tab_shop}

              {/* Promotion Badge */}
              <div className="absolute -top-3 -right-3 md:-top-4 md:-right-5 bg-red-600 text-white text-[10px] md:text-xs font-black px-1.5 py-0.5 rounded-sm border-2 border-black shadow-lg animate-bounce italic whitespace-nowrap z-30">
                -50%
              </div>
            </div>
          </button>

          <button
            onClick={() => onTabChange('giveaway')}
            className={`
              group relative flex items-center justify-center px-4 md:px-6 py-2 md:py-3 font-burbank text-lg md:text-xl uppercase tracking-wider transform -skew-x-12 transition-all duration-300
              ${activeTab === 'giveaway'
                ? 'bg-purple-600 text-white border-b-4 border-purple-900 shadow-[0_0_20px_rgba(147,51,234,0.6)] scale-105'
                : 'bg-black/80 text-white/60 border-b-4 border-gray-900 hover:bg-white/10 hover:text-white'}
            `}
          >
            <div className="flex items-center gap-2 transform skew-x-12">
              <Zap className={`w-4 h-4 md:w-5 md:h-5 ${activeTab === 'giveaway' ? 'fill-white' : ''}`} />
              {t.tab_giveaway}
            </div>
          </button>
        </div>

        {activeTab === 'shop' ? (
          <Shop language={language} />
        ) : activeTab === 'giveaway' ? (
          <div className="w-full max-w-5xl animate-fade-in flex flex-col items-center">
            {/* SECTION 1: MONTHLY GIVEAWAY (Emerald Theme) */}
            <div className="w-full flex flex-col items-center mb-16">
              <div className="relative w-full bg-gradient-to-b from-emerald-600/20 to-transparent p-12 rounded-[3rem] border border-emerald-500/20 mb-12 overflow-hidden flex flex-col items-center text-center group">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

                {/* Visual Glows */}
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] group-hover:bg-emerald-500/20 transition-all duration-700"></div>
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] group-hover:bg-emerald-500/20 transition-all duration-700 delay-300"></div>

                <div className="relative z-10 flex flex-col items-center">
                  <span className="text-emerald-400 font-black text-xs tracking-widest uppercase mb-4 px-4 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                    {t.giveaway_monthly_title}
                  </span>

                  <h2 className="font-burbank text-5xl md:text-8xl text-white italic uppercase mb-6 leading-none drop-shadow-[0_4px_15px_rgba(16,185,129,0.3)]">
                    {t.giveaway_prize}
                  </h2>

                  <div className="px-5 py-2 bg-green-500/20 border border-green-500/30 rounded-full flex items-center gap-2 mb-10 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 text-sm font-bold uppercase tracking-widest">{t.giveaway_valid_all}</span>
                  </div>

                  {/* FB REQUIREMENT FOR MONTHLY */}
                  <div className="w-full max-w-md bg-black/60 backdrop-blur-xl border border-[#1877F2]/30 p-8 rounded-[2rem] flex flex-col items-center gap-5 shadow-2xl transform group-hover:scale-[1.02] transition-transform duration-500">
                    <div className="flex items-center gap-3">
                      <Facebook className="w-8 h-8 text-[#1877F2]" />
                      <span className="text-white font-bold text-xl">{t.giveaway_fb_requirement}</span>
                    </div>
                    <a
                      href="https://www.facebook.com/profile.php?id=61586612323239"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-burbank text-2xl uppercase py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_10px_30px_rgba(24,119,242,0.3)]"
                    >
                      <Facebook className="w-6 h-6" />
                      Follow to Participate
                    </a>
                  </div>
                </div>
              </div>

              {/* Requirement Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                {/* Winner Card */}
                <div className="bg-emerald-950/20 backdrop-blur-xl border border-emerald-500/20 rounded-[2rem] p-10 flex flex-col items-center text-center relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                  <span className="text-emerald-400 font-black text-xs tracking-widest uppercase mb-4">{t.last_winner}</span>
                  <p className="font-burbank text-5xl text-white italic mb-4">{t.last_winner_name}</p>
                  <div className="flex items-center gap-2 text-emerald-500 font-black italic text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    STREAMS VERIFIED
                  </div>
                </div>

                {/* Auto entry Card */}
                <div className="bg-black/40 backdrop-blur-xl border border-blue-500/20 rounded-[2rem] p-10 flex flex-col items-center text-center relative overflow-hidden group hover:border-blue-500/40 transition-all">
                  <span className="text-blue-400 font-black text-xs tracking-widest uppercase mb-4">{t.official_label}</span>
                  <h3 className="font-burbank text-4xl text-white italic uppercase mb-2">
                    {t.giveaway_requirement}
                  </h3>
                  <p className="text-white/40 text-[11px] uppercase font-bold tracking-widest">System detects your shop activity</p>
                </div>
              </div>
            </div>

            {/* SEPARATOR */}
            <div className="w-full flex items-center gap-4 mb-16 px-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
              <Flame className="w-8 h-8 text-orange-500 animate-pulse" />
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
            </div>

            {/* SECTION 3: 2000 V-BUCKS FB GIVEAWAY */}
            <div className="w-full max-w-4xl bg-black/40 backdrop-blur-xl border border-orange-500/30 rounded-[3rem] overflow-hidden shadow-2xl relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 to-transparent pointer-events-none"></div>

              <div className="flex flex-col md:flex-row items-stretch">
                {/* Image Section */}
                <div className="md:w-1/2 relative group overflow-hidden">
                  <img
                    src="https://raw.githubusercontent.com/davidabg91/isfortnite.online/main/public/images/giveaway_2000.jpg"
                    alt="2000 V-Bucks Giveaway"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-600/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest mb-2">
                      {t.giveaway_vbucks_2000_deadline}
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                  <div className="text-center md:text-left mb-8">
                    <h2 className="font-burbank text-4xl md:text-5xl text-orange-400 italic uppercase mb-2">
                      {t.giveaway_vbucks_2000_title}
                    </h2>
                    <h3 className="font-burbank text-5xl md:text-6xl text-white italic tracking-tighter mb-4 drop-shadow-[0_4px_10px_rgba(249,115,22,0.4)]">
                      {t.giveaway_vbucks_2000_prize}
                    </h3>
                    <p className="text-gray-300 font-medium leading-relaxed italic">
                      {t.giveaway_vbucks_2000_winner_info}
                    </p>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 group hover:border-orange-500/30 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-orange-600/20 flex items-center justify-center border border-orange-500/30 shrink-0">
                        <span className="font-burbank text-orange-400">1</span>
                      </div>
                      <p className="text-white text-sm font-medium pt-1">{t.giveaway_vbucks_2000_step1}</p>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 group hover:border-orange-500/30 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-orange-600/20 flex items-center justify-center border border-orange-500/30 shrink-0">
                        <span className="font-burbank text-orange-400">2</span>
                      </div>
                      <p className="text-white text-sm font-medium pt-1">{t.giveaway_vbucks_2000_step2}</p>
                    </div>

                    <div className="flex items-center gap-2 text-orange-400 text-xs font-black uppercase tracking-widest pl-2">
                      <Zap className="w-3 h-3 animate-pulse" />
                      {t.giveaway_vbucks_2000_bonus}
                    </div>
                  </div>

                  <a
                    href="https://www.facebook.com/profile.php?id=61586612323239"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-burbank text-2xl uppercase py-4 rounded-2xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] shadow-[0_10px_30px_rgba(24,119,242,0.3)]"
                  >
                    <Facebook className="w-6 h-6" />
                    Enter on Facebook
                  </a>
                </div>
              </div>
            </div>

            {/* Trust Footer */}
            <div className="mt-16 flex flex-col items-center gap-6 opacity-60">
              <div className="flex items-center gap-8 flex-wrap justify-center opacity-40 grayscale group-hover:grayscale-0 transition-all">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  <span className="font-bold uppercase text-xs tracking-widest">Secure Systems</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  <span className="font-bold uppercase text-xs tracking-widest">Real-time Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold uppercase text-xs tracking-widest">Verified Winners</span>
                </div>
              </div>
              <p className="text-white/30 text-[10px] uppercase font-bold tracking-[0.5em]">Powered by IMBOTBG Automated Engine</p>
            </div>
          </div>
        ) : (
          <>
            {/* Status Summary Area */}
            <div className="w-full max-w-4xl flex flex-col items-center justify-center gap-3 mb-8 backdrop-blur-md bg-black/20 p-6 md:p-8 rounded-[2rem] border border-white/5 relative overflow-hidden">

              <div className={`absolute inset-0 opacity-10 blur-[50px] ${status === ServerStatus.ONLINE ? 'bg-green-500' : 'bg-red-500'}`}></div>

              {/* Info Button */}
              <button
                onClick={() => setShowStatusInfo(true)}
                className="absolute top-4 right-4 z-20 p-2 bg-white/5 hover:bg-white/20 rounded-full transition-all text-white/50 hover:text-white"
                aria-label="Server Update Information"
              >
                <Info className="w-5 h-5" />
              </button>

              <div className="flex justify-center mb-1 relative z-10">
                {status === ServerStatus.CHECKING && <RefreshCw className="w-14 h-14 md:w-16 md:h-16 text-yellow-400 animate-spin" />}
                {status === ServerStatus.ONLINE && <CheckCircle2 className="w-14 h-14 md:w-16 md:h-16 text-green-400 animate-bounce" />}
                {(status === ServerStatus.OFFLINE || status === ServerStatus.ERROR || status === ServerStatus.IDLE) && <AlertCircle className="w-14 h-14 md:w-16 md:h-16 text-red-500 animate-pulse" />}
              </div>

              <h2 className="font-burbank text-4xl md:text-6xl text-white mb-1 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] text-center tracking-wide relative z-10">
                {status === ServerStatus.CHECKING && t.status_checking}
                {status === ServerStatus.ONLINE && t.status_online}
                {status === ServerStatus.OFFLINE && t.status_offline}
                {status === ServerStatus.IDLE && t.status_idle}
                {status === ServerStatus.ERROR && t.status_error}
              </h2>

              <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 mt-1 relative z-10">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                <span className="text-white/50 text-[10px] font-bold tracking-[0.2em] uppercase">Epic Games Global</span>
              </div>
            </div>

            {/* --- 2. INFORMATION GRID (Official & Rumors) --- */}
            <div className={`w-full max-w-6xl grid grid-cols-1 gap-6 mb-8 ${hasRumors ? 'md:grid-cols-2' : 'place-items-center'}`}>

              {/* A. Official Information Card */}
              <div className={`
                 w-full relative backdrop-blur-xl bg-gradient-to-br from-indigo-950/90 via-blue-900/50 to-indigo-900/90 border-2 border-blue-400/40 rounded-[2rem] p-6 shadow-xl flex flex-col h-full overflow-hidden group transition-all hover:border-blue-400/60 min-h-[160px]
                 ${!hasRumors ? 'max-w-3xl' : ''}
              `}>
                {/* Visual Accent - Large Background Icon */}
                <div className="absolute -right-8 -bottom-8 p-4 opacity-[0.05] pointer-events-none group-hover:scale-110 group-hover:opacity-[0.08] transition-all duration-1000">
                  <Info className="w-48 h-48 text-blue-400" />
                </div>

                <div className="absolute top-0 left-0 bg-blue-600 text-white px-3 py-1 rounded-br-xl text-[8px] font-black tracking-widest shadow-xl flex items-center gap-1.5 uppercase z-20">
                  <Info className="w-3 h-3" />
                  {t.official_label}
                </div>

                <div className="mt-4 flex-grow flex flex-col items-center justify-start pt-4 relative z-10">
                  <p className="text-xl md:text-2xl text-white font-burbank leading-tight text-center drop-shadow-md tracking-wide uppercase italic">
                    {message}
                  </p>
                  <div className="flex items-center gap-2 mt-4 opacity-30">
                    <div className="h-0.5 w-12 bg-gradient-to-r from-transparent to-blue-500 rounded-full"></div>
                    <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                    <div className="h-0.5 w-12 bg-gradient-to-l from-transparent to-blue-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* B. Rumor Card (Conditional) */}
              {hasRumors && (
                <div className="w-full relative backdrop-blur-md bg-cyan-900/40 border border-cyan-400/30 rounded-[2rem] p-6 shadow-xl flex flex-col h-full overflow-hidden min-h-[160px]">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Zap className="w-24 h-24 text-cyan-400" />
                  </div>

                  <div className="absolute top-0 left-0 bg-cyan-600 px-3 py-1.5 rounded-br-xl text-black text-[8px] font-black tracking-wider shadow-lg flex items-center gap-1.5 uppercase z-20">
                    <Zap className="w-3 h-3" />
                    {t.rumor_label}
                  </div>

                  <div className="mt-4 flex-grow flex items-center justify-start pt-4 relative z-10">
                    <p className="text-cyan-100 text-sm md:text-base font-medium text-center leading-relaxed italic">
                      "{rumorMessage}"
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* --- 3. NEWS SECTION --- */}
            {news && news.length > 0 && (
              <NewsSection news={news} language={language} />
            )}

            {/* Sources Section */}
            {sources && sources.length > 0 && (
              <div className="mb-8 w-full max-w-4xl flex flex-wrap justify-center gap-2 text-xs">
                {sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-black/40 hover:bg-black/60 text-white/70 hover:text-white px-3 py-1 rounded-full transition-colors flex items-center gap-1 border border-white/5"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {source.title || new URL(source.uri).hostname}
                  </a>
                ))}
              </div>
            )}

            {/* Footer Info */}
            <div className="flex flex-col items-center gap-2 text-white/60 font-medium pb-8">
              {lastChecked && (
                <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10">
                  <Clock className="w-4 h-4" />
                  <span>{t.last_check} {lastChecked.toLocaleTimeString()}</span>
                </div>
              )}
              <p className="text-sm text-center">{t.next_check} {Math.ceil(nextCheckTime / 60)} {t.min}</p>
            </div>

            {/* Global Fixed Info Modal */}
            {showStatusInfo && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                <div className="bg-black border border-white/20 rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600"></div>

                  <button
                    onClick={() => setShowStatusInfo(false)}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white/50 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <Info className="w-12 h-12 text-blue-400 mx-auto mb-4" />

                  <h3 className="font-burbank text-3xl text-white tracking-widest uppercase mb-4">
                    {t.status_info_title}
                  </h3>

                  <p className="text-base text-white/80 font-medium leading-relaxed mb-6">
                    {t.status_info_desc}
                  </p>

                  <button
                    onClick={() => setShowStatusInfo(false)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-burbank text-xl px-8 py-3 rounded-xl transition-all w-full tracking-widest uppercase"
                  >
                    {t.buy_username_help_btn}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* Premium Modal */}
      {
        showPremiumModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 border-2 border-yellow-400 rounded-2xl p-8 max-w-md w-full text-center relative shadow-[0_0_50px_rgba(250,204,21,0.3)] my-auto">
              <button
                onClick={() => setShowPremiumModal(false)}
                className="absolute top-2 right-2 text-white/50 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <Lock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h3 className="font-burbank text-3xl text-white mb-2">{t.premium_title}</h3>
              <p className="text-white/80 mb-6 font-medium">
                {t.premium_desc}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDonate}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-burbank text-xl py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105 mb-4"
                >
                  <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                  {t.unlock_fee}
                </button>

                <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                  <label className="text-white/60 text-sm mb-1 block text-left uppercase tracking-wider font-bold">{t.enter_code}</label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => {
                        setInputCode(e.target.value.toUpperCase());
                        setCodeError(false);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                      placeholder="FN-XXXX-XXXX"
                      className={`w-full bg-black/50 text-white font-mono text-center text-lg p-2 rounded border-2 focus:outline-none focus:border-yellow-400 transition-colors ${codeError ? 'border-red-500' : 'border-white/20'}`}
                    />
                    {codeError && <span className="text-red-400 text-sm font-bold animate-pulse">{t.invalid_code}</span>}
                    {unlockSuccess && <span className="text-green-400 text-sm font-bold animate-bounce">{t.code_success}</span>}

                    <button
                      onClick={handleVerifyCode}
                      disabled={isVerifying}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-burbank text-lg py-2 rounded transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <KeyRound className="w-4 h-4" />
                      )}
                      {t.verify_btn}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowPremiumModal(false)}
                  className="text-white/40 hover:text-white text-sm mt-4"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
};
