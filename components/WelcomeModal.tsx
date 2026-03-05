import React from 'react';
import { ShieldCheck, AlertTriangle, Gift } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../translations';

interface WelcomeModalProps {
  onClose: () => void;
  language: Language;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose, language }) => {
  const t = getTranslation(language);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="bg-gradient-to-b from-slate-900 to-black border-2 border-blue-500/30 rounded-2xl p-6 md:p-10 max-w-2xl w-full text-center relative shadow-[0_0_80px_rgba(59,130,246,0.2)] my-8">

        {/* Header Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-blue-600/20 border border-blue-500/50 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)]">
            <ShieldCheck className="w-10 h-10 text-blue-400" />
          </div>
        </div>

        {/* Main Title & Description */}
        <h2 className="font-burbank text-4xl md:text-5xl text-white mb-4 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
          {t.welcome_title}
        </h2>

        <p className="text-white/80 text-lg leading-relaxed mb-8 font-medium px-4">
          {t.welcome_desc}
        </p>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent mb-8"></div>

        {/* Purchase Info Section */}
        <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-500/30 rounded-xl p-6 mb-6 text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Gift className="w-32 h-32 text-yellow-400 transform rotate-12" />
          </div>
          <p className="text-yellow-400 font-bold text-xl mb-2 relative z-10">
            {t.welcome_purchase_info.split(':')[0]}:
          </p>
          <p className="text-white/90 text-md relative z-10">
            {t.welcome_purchase_info.split(':')[1]}
          </p>
        </div>

        {/* Condition Alert Box */}
        <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-6 mb-8 text-left flex gap-4 items-start">
          <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-white font-burbank text-2xl mb-1 text-red-400">
              {t.welcome_condition_title}
            </h3>
            <p className="text-white/80 text-sm leading-relaxed">
              {t.welcome_condition_desc}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-burbank text-3xl py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest"
        >
          {t.welcome_btn}
        </button>
      </div>
    </div>
  );
};