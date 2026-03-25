import React, { useState } from 'react';
import { ServerStatus, Language, NewsItem } from '../types';
import {
  AlertCircle,
  CheckCircle2,
  RefreshCcw,
  Clock,
  Heart,
  Lock,
  X,
  KeyRound,
  Zap,
  Info,
  Facebook,
  ShoppingBag,
  Activity,
  TrendingUp,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { FortniteLogo } from './FortniteLogo';
import { getTranslation, LANGUAGE_NAMES } from '../translations';
import { NewsSection } from './NewsSection';
import Shop from './Shop';
import { SensConverter } from './SensConverter';
import { Leaks } from './Leaks';

interface StatusScreenProps {
  status: ServerStatus;
  message: string;
  rumorMessage?: string;
  news?: NewsItem[];
  sources?: { uri: string; title: string }[];
  lastChecked: Date | null;
  nextCheckTime: number;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isPremium: boolean;
  onUnlockPremium: (code: string) => Promise<boolean>;
  activeTab: 'status' | 'shop' | 'giveaway' | 'sens' | 'leaks';
  onTabChange: (tab: 'status' | 'shop' | 'giveaway' | 'sens' | 'leaks') => void;
}

export const StatusScreen: React.FC<StatusScreenProps> = ({
  status,
  message,
  rumorMessage,
  news,
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

  const getBackgroundClass = () => {
    switch (status) {
      case ServerStatus.ONLINE: return "bg-gradient-to-br from-green-500 via-green-600 to-green-800";
      case ServerStatus.CHECKING: return "bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-900";
      default: return "bg-gradient-to-br from-red-600 via-red-700 to-red-900";
    }
  };

  const isOnline = status === ServerStatus.ONLINE;
  const handleDonate = () => window.open('https://revolut.me/deyvidp7g', '_blank');

  const handleVerifyCode = async () => {
    if (!inputCode.trim()) return;
    setIsVerifying(true);
    setCodeError(false);
    try {
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
      <div className={`fixed inset-0 z-[-10] overflow-hidden transition-all duration-1000 ease-in-out ${getBackgroundClass()}`}>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] rounded-full border-[100px] blur-3xl transition-colors duration-1000 ${isOnline ? 'border-green-300/30' : 'border-purple-500/30 animate-pulse'}`}></div>
      </div>

      <div className="fixed top-6 left-6 z-50 group">
        <button onClick={() => setShowLangMenu(!showLangMenu)} className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md border border-white/20 hover:bg-black/50 transition-all flex items-center justify-center shadow-xl">
          <span className="text-2xl">{LANGUAGE_NAMES[language].flag}</span>
        </button>
        {showLangMenu && (
          <div className="absolute top-14 left-0 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 items-center">
            {(Object.keys(LANGUAGE_NAMES) as Language[]).map((langKey) => langKey !== language && (
              <button key={langKey} onClick={() => { onLanguageChange(langKey); setShowLangMenu(false); }} className="w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center">
                <span className="text-xl">{LANGUAGE_NAMES[langKey].flag}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="fixed top-6 left-20 z-50 flex items-center gap-3">
        <a href="https://www.facebook.com/profile.php?id=61586612323239" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full bg-[#1877F2]/20 backdrop-blur-md border border-[#1877F2]/50 hover:bg-[#1877F2]/40 transition-all flex items-center justify-center shadow-xl text-white">
          <Facebook className="w-5 h-5" />
        </a>
      </div>

      <button onClick={handleDonate} className="fixed top-4 right-4 z-50 bg-yellow-400 hover:bg-yellow-300 text-black font-burbank text-lg px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <Heart className="w-5 h-5 fill-red-500 text-red-500" />
        <span className="hidden md:inline">{t.donate}</span>
      </button>

      {isOnline && activeTab !== 'shop' && activeTab !== 'sens' && (
        <div className="fixed top-0 left-0 w-full bg-yellow-400 text-black font-burbank text-center py-2 z-10 shadow-lg">{t.victory}</div>
      )}

      <div className="relative flex flex-col items-center min-h-screen py-20 px-4 md:px-8">
        <FortniteLogo subtitle={t.logo_subtitle} />

        <div className="relative z-30 mt-8 md:mt-16 mb-8 flex flex-wrap justify-center gap-3 md:gap-4">
          <button onClick={() => onTabChange('status')} className={`group relative flex items-center justify-center px-4 md:px-6 py-2 md:py-3 font-burbank text-lg md:text-xl uppercase tracking-wider transform -skew-x-12 transition-all duration-300 ${activeTab === 'status' ? 'bg-blue-600 text-white border-b-4 border-blue-900 shadow-xl' : 'bg-black/80 text-white/60 border-b-4 border-gray-900'}`}>
            <div className="flex items-center gap-2 transform skew-x-12"><Activity className="w-4 h-4 md:w-5 md:h-5" />{t.tab_status}</div>
          </button>
          <button onClick={() => onTabChange('shop')} className={`group relative flex items-center justify-center px-4 md:px-6 py-2 md:py-3 font-burbank text-lg md:text-xl uppercase tracking-wider transform -skew-x-12 transition-all duration-300 ${activeTab === 'shop' ? 'bg-yellow-400 text-black border-b-4 border-orange-600 shadow-xl' : 'bg-black/80 text-white/60 border-b-4 border-gray-900'}`}>
            <div className="flex items-center gap-2 transform skew-x-12"><ShoppingBag className="w-4 h-4 md:w-5 md:h-5" />{t.tab_shop}</div>
          </button>
          <button onClick={() => onTabChange('giveaway')} className={`group relative flex items-center justify-center px-4 md:px-6 py-2 md:py-3 font-burbank text-lg md:text-xl uppercase tracking-wider transform -skew-x-12 transition-all duration-300 ${activeTab === 'giveaway' ? 'bg-purple-600 text-white border-b-4 border-purple-900 shadow-xl' : 'bg-black/80 text-white/60 border-b-4 border-gray-900'}`}>
            <div className="flex items-center gap-2 transform skew-x-12"><Zap className="w-4 h-4 md:w-5 md:h-5" />{t.tab_giveaway}</div>
          </button>
          <button onClick={() => onTabChange('sens')} className={`group relative flex items-center justify-center px-4 md:px-6 py-2 md:py-3 font-burbank text-lg md:text-xl uppercase tracking-wider transform -skew-x-12 transition-all duration-300 ${activeTab === 'sens' ? 'bg-teal-600 text-white border-b-4 border-teal-900 shadow-xl' : 'bg-black/80 text-white/60 border-b-4 border-gray-900'}`}>
            <div className="flex items-center gap-2 transform skew-x-12"><Activity className="w-4 h-4 md:w-5 md:h-5" />{language === 'bg' ? 'Сензитивност' : 'Sens Converter'}</div>
          </button>
          <button onClick={() => onTabChange('leaks')} className={`group relative flex items-center justify-center px-4 md:px-6 py-2 md:py-3 font-burbank text-lg md:text-xl uppercase tracking-wider transform -skew-x-12 transition-all duration-300 ${activeTab === 'leaks' ? 'bg-orange-600 text-white border-b-4 border-orange-900 shadow-xl' : 'bg-black/80 text-white/60 border-b-4 border-gray-900'}`}>
            <div className="flex items-center gap-2 transform skew-x-12"><Sparkles className="w-4 h-4 md:w-5 md:h-5" />{language === 'bg' ? 'Изтекли Скинове' : 'Leaks'}</div>
          </button>
        </div>

        {activeTab === 'shop' ? (
          <Shop language={language} />
        ) : activeTab === 'giveaway' ? (
          <div className="w-full max-w-4xl animate-fade-in flex flex-col items-center">
            <div className="w-full bg-black/40 backdrop-blur-xl border border-orange-500/30 rounded-[3rem] overflow-hidden shadow-2xl relative p-8 md:p-12 text-center">
              <div className="flex flex-col items-center gap-6">
                <img src="https://fortnite-api.com/images/vbuck.png" alt="Giveaway" className="w-48 h-48 object-contain" />
                <h2 className="font-burbank text-4xl md:text-6xl text-orange-400 italic uppercase">{t.giveaway_vbucks_2000_title}</h2>
                <h3 className="font-burbank text-5xl md:text-7xl text-white italic tracking-tighter">{t.giveaway_vbucks_2000_prize}</h3>
                <p className="text-gray-300 font-medium italic max-w-2xl">{t.giveaway_vbucks_2000_winner_info}</p>
                <a href="https://www.facebook.com/profile.php?id=61586612323239" target="_blank" rel="noopener noreferrer" className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-burbank text-3xl uppercase px-12 py-4 rounded-2xl flex items-center gap-3 transition-all transform hover:scale-105 shadow-xl">
                  <Facebook className="w-8 h-8" /> {t.enter_facebook}
                </a>
              </div>
            </div>
          </div>
        ) : activeTab === 'sens' ? (
          <div className="w-full max-w-4xl animate-fade-in">
            <SensConverter language={language} />
          </div>
        ) : activeTab === 'leaks' ? (
          <div className="w-full z-10 animate-fade-in min-h-screen">
            <Leaks language={language} />
          </div>
        ) : (
          <>
            <div className="w-full max-w-4xl flex flex-col items-center justify-center gap-3 mb-8 backdrop-blur-md bg-black/20 p-6 md:p-8 rounded-[2rem] border border-white/5 relative">
              <button onClick={() => setShowStatusInfo(true)} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/20 rounded-full text-white/50"><Info className="w-5 h-5" /></button>
              <div className="flex justify-center mb-1">
                {status === ServerStatus.CHECKING && <RefreshCcw className="w-14 h-14 text-yellow-400 animate-spin" />}
                {status === ServerStatus.ONLINE && <CheckCircle2 className="w-14 h-14 text-green-400 animate-bounce" />}
                {(status === ServerStatus.OFFLINE || status === ServerStatus.ERROR) && <AlertCircle className="w-14 h-14 text-red-500 animate-pulse" />}
              </div>
              <h2 className="font-burbank text-4xl md:text-6xl text-white mb-1 text-center tracking-wide">
                {status === ServerStatus.CHECKING ? t.status_checking : status === ServerStatus.ONLINE ? t.status_online : t.status_offline}
              </h2>
            </div>

            <div className="w-full max-w-6xl flex flex-col items-center gap-6 mb-8 px-2 md:px-0">
              
              {/* Information Panel */}
              <div className="w-full md:w-4/5 lg:w-3/4 transform -skew-x-6 relative group">
                {/* Outer Glow */}
                <div className={`absolute -inset-1 rounded-3xl blur-md opacity-50 group-hover:opacity-100 transition duration-500 bg-gradient-to-r ${
                  isOnline ? 'from-green-500 via-emerald-400 to-green-600' : 'from-red-600 via-orange-500 to-red-700'
                }`}></div>

                <div className="relative bg-black/70 backdrop-blur-xl border-y-4 border-r-4 border-l-8 overflow-hidden rounded-r-2xl rounded-l-md flex flex-col items-center justify-center p-8 md:p-12 shadow-[0_0_30px_rgba(0,0,0,0.8)] z-10 
                  border-l-indigo-500 border-t-white/10 border-b-white/10 border-r-white/10"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Activity className="w-24 h-24 text-white" />
                  </div>

                  <div className="flex flex-col items-center text-center gap-4 transform skew-x-6 relative z-10 w-full max-w-2xl">
                    <div className="flex items-center gap-3 mb-2">
                       <div className={`p-2 rounded-lg ${isOnline ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                         <Info className={`w-5 h-5 ${isOnline ? 'text-green-400' : 'text-red-400'}`} />
                       </div>
                       <h3 className="text-sm md:text-base font-bold text-gray-400 tracking-[0.2em] uppercase">{t.official_label}</h3>
                    </div>
                    
                    <p className="text-xl md:text-3xl text-white font-burbank italic uppercase tracking-wider leading-relaxed drop-shadow-lg">
                      {message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rumor Panel */}
              {rumorMessage && (
                <div className="w-full md:w-3/4 lg:w-2/3 transform skew-x-3 relative group mt-4">
                  
                  <div className="absolute -inset-1 rounded-3xl blur-md opacity-40 group-hover:opacity-70 transition duration-500 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-blue-600"></div>

                  <div className="relative bg-gradient-to-br from-indigo-950/90 to-purple-900/90 border border-fuchsia-500/30 rounded-2xl p-6 md:p-8 shadow-2xl overflow-hidden z-10">
                    <div className="absolute -top-4 -right-4 w-32 h-32 bg-fuchsia-500/20 rounded-full blur-3xl z-0"></div>
                    <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl z-0"></div>

                    <div className="transform -skew-x-3 relative z-10 flex flex-col gap-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-fuchsia-600 to-purple-600 rounded-lg shadow-lg">
                          <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-sm md:text-base font-bold text-fuchsia-300 tracking-[0.2em] uppercase">{t.rumor_label}</h3>
                      </div>
                      
                      <p className="text-slate-100 text-lg md:text-xl leading-relaxed font-medium bg-black/20 p-4 rounded-xl border border-white/5 shadow-inner">
                        {rumorMessage}
                      </p>

                      <div className="space-y-2 mt-2">
                        <div className="flex justify-between text-[10px] md:text-xs font-bold text-slate-400 tracking-wider uppercase">
                          <span>AI Intelligence</span>
                          <span className="text-fuchsia-400 animate-pulse">85% Likely</span>
                        </div>
                        <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 shadow-inner">
                          <div className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-blue-500 w-[85%] rounded-full shadow-[0_0_15px_rgba(217,70,239,0.7)]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {news && news.length > 0 && <NewsSection news={news} language={language} />}

            <div className="flex flex-col items-center gap-2 text-white/60 font-medium pb-8 mt-8 text-center">
              {lastChecked && (
                <div className="bg-black/40 px-6 py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-xl">
                  <Clock className="w-4 h-4" />
                  {t.last_check} {lastChecked.toLocaleTimeString()}
                </div>
              )}
              <p className="text-sm">{t.next_check} {Math.ceil(nextCheckTime / 60)} {t.min}</p>
            </div>
          </>
        )}
      </div>

      {showStatusInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-black border border-white/20 rounded-3xl p-8 max-w-lg w-full text-center relative">
            <button onClick={() => setShowStatusInfo(false)} className="absolute top-4 right-4 p-2 text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
            <Info className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="font-burbank text-3xl text-white uppercase mb-4">{t.status_info_title}</h3>
            <p className="text-white/80 mb-6">{t.status_info_desc}</p>
            <button onClick={() => setShowStatusInfo(false)} className="bg-blue-600 hover:bg-blue-500 text-white font-burbank text-xl px-8 py-3 rounded-xl w-full">OK</button>
          </div>
        </div>
      )}

      {showPremiumModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 border-2 border-yellow-400 rounded-2xl p-8 max-w-md w-full text-center relative shadow-2xl">
            <button onClick={() => setShowPremiumModal(false)} className="absolute top-2 right-2 text-white/50"><X className="w-6 h-6" /></button>
            <Lock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="font-burbank text-3xl text-white mb-2">{t.premium_title}</h3>
            <p className="text-white/80 mb-6">{t.premium_desc}</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleDonate} className="bg-yellow-400 hover:bg-yellow-300 text-black font-burbank text-xl py-3 rounded-lg flex items-center justify-center gap-2"><Heart className="w-5 h-5 fill-red-500" />{t.unlock_fee}</button>
              <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => { setInputCode(e.target.value.toUpperCase()); setCodeError(false); }}
                  placeholder="FN-XXXX-XXXX"
                  className={`w-full bg-black/50 text-white font-mono text-center p-2 rounded border-2 transition-colors ${codeError ? 'border-red-500' : 'border-white/20'}`}
                />
                {codeError && <span className="text-red-400 text-sm block mt-1">{t.invalid_code}</span>}
                {unlockSuccess && <span className="text-green-400 text-sm block mt-1">{t.code_success}</span>}
                <button
                  onClick={handleVerifyCode}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-burbank text-lg py-2 rounded mt-2 flex items-center justify-center gap-2 shadow-lg"
                >
                  {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {t.verify_btn}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer / Credits */}
      <footer className="w-full py-10 flex flex-col items-center justify-center gap-2 relative z-10 border-t border-white/5 mt-auto">
        <a
          href="https://www.facebook.com/p/DavidaX-61578418701694/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-2 transition-all hover:scale-105"
        >
          <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">Built with Excellence</span>
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 group-hover:border-blue-500/50 transition-all shadow-xl">
            <span className="text-white/60 text-sm font-medium">Made by</span>
            <span className="font-burbank text-2xl text-white italic tracking-wider transition-colors group-hover:text-blue-400">DavidaX</span>
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform">
              <Facebook className="w-5 h-5 text-white" />
            </div>
          </div>
        </a>
        <p className="text-white/20 text-[10px] uppercase font-bold tracking-tighter mt-2">© 2026 ISFORTNITE.ONLINE | ALL RIGHTS RESERVED | Build: v8.1.1 (LEAKS_FIXED)</p>
      </footer>
    </div>
  );
};

export default StatusScreen;
