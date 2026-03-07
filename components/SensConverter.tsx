import React, { useState, useEffect } from 'react';
import { Target, MousePointer2, RefreshCw } from 'lucide-react';
import { Language } from '../types';

interface SensConverterProps {
    language: Language;
}

const GAMES = [
    { id: 'valorant', name: 'Valorant', multiplier: 12.6 }, // Val * 1.26 = Fortnite (simplified as 12.6, real is 1.2625 but let's use exact)
    { id: 'cs2', name: 'CS2 / Apex Legends', multiplier: 3.96 }, // CS2 * 3.96 = Fortnite
    { id: 'overwatch', name: 'Overwatch 2', multiplier: 1.18 }, // OW2 * 1.18 = Fortnite
    { id: 'r6', name: 'Rainbow Six Siege', multiplier: 15.3 } // roughly * 15.3 depending on multiplier, but let's keep it simple
];

const preciseMultipliers: Record<string, number> = {
    'valorant': 12.625,
    'cs2': 3.96,
    'overwatch': 1.188,
    'r6': 15.3
};

const labels = {
    en: {
        title: "Sensitivity Converter",
        subtitle: "Convert your mouse sens from other games to Fortnite",
        from: "From Game",
        sens: "Current Sensitivity",
        result: "Fortnite Sensitivity",
        copy: "Copy",
        copied: "Copied!"
    },
    bg: {
        title: "Калкулатор за Сензитивност",
        subtitle: "Превърни сензата си от други игри във Fortnite",
        from: "От Игра:",
        sens: "Текущ Сенз",
        result: "Fortnite Сенз",
        copy: "Копирай",
        copied: "Копирано!"
    }
};

export const SensConverter: React.FC<SensConverterProps> = ({ language }) => {
    const t = (labels as any)[language] || labels['en'];
    const [selectedGame, setSelectedGame] = useState('valorant');
    const [inputSens, setInputSens] = useState('0.3');
    const [fortniteSens, setFortniteSens] = useState('0');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const val = parseFloat(inputSens);
        if (!isNaN(val) && val > 0) {
            const multi = preciseMultipliers[selectedGame];
            const result = (val * multi).toFixed(2);
            setFortniteSens(`${result}%`);
        } else {
            setFortniteSens('0%');
        }
    }, [inputSens, selectedGame]);

    const handleCopy = () => {
        navigator.clipboard.writeText(fortniteSens);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="w-full bg-black/40 backdrop-blur-xl border border-teal-500/30 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden text-white flex flex-col items-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[80px] rounded-full pointer-events-none"></div>

            <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-teal-500/20 rounded-2xl border border-teal-500/40 shadow-[0_0_15px_rgba(20,184,166,0.5)] flex items-center justify-center">
                    <Target className="w-8 h-8 text-teal-400" />
                </div>
                <h2 className="font-burbank text-4xl md:text-5xl text-teal-400 italic tracking-wide drop-shadow-md">
                    {t.title}
                </h2>
            </div>
            <p className="text-gray-400 text-sm md:text-base mb-8 max-w-md text-center">{t.subtitle}</p>

            <div className="w-full max-w-md flex flex-col gap-6 z-10">
                <div className="group relative">
                    <label className="block text-sm text-teal-300/80 mb-2 font-medium uppercase tracking-wider">{t.from}</label>
                    <select
                        value={selectedGame}
                        onChange={(e) => setSelectedGame(e.target.value)}
                        className="w-full bg-black/60 border border-teal-500/30 rounded-xl px-4 py-3 text-white appearance-none outline-none focus:border-teal-400 cursor-pointer shadow-inner"
                    >
                        {GAMES.map(g => (
                            <option key={g.id} value={g.id} className="bg-gray-900">{g.name}</option>
                        ))}
                    </select>
                </div>

                <div className="group relative">
                    <label className="block text-sm text-teal-300/80 mb-2 font-medium uppercase tracking-wider">{t.sens}</label>
                    <div className="relative">
                        <MousePointer2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500/50" />
                        <input
                            type="number"
                            step="0.01"
                            value={inputSens}
                            onChange={(e) => setInputSens(e.target.value)}
                            className="w-full bg-black/60 border border-teal-500/30 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-teal-400 shadow-inner font-mono text-lg"
                        />
                    </div>
                </div>

                <div className="h-px w-full bg-gradient-to-r from-transparent via-teal-500/30 to-transparent my-2" />

                <div className="group relative flex flex-col items-center">
                    <label className="block text-sm text-teal-300/80 mb-2 font-medium uppercase tracking-wider">{t.result}</label>
                    <div className="flex items-center gap-3">
                        <div className="bg-teal-500/20 border border-teal-400/50 rounded-2xl px-6 py-4 min-w-[160px] text-center shadow-[0_0_20px_rgba(20,184,166,0.2)]">
                            <span className="font-burbank text-4xl text-white tracking-widest">{fortniteSens}</span>
                        </div>
                        <button
                            onClick={handleCopy}
                            className={`p-4 rounded-2xl border transition-all duration-300 ${copied ? 'bg-green-500/20 border-green-400 text-green-400' : 'bg-black/40 border-teal-500/30 text-teal-400 hover:bg-teal-500/20'}`}
                        >
                            <RefreshCw className={`w-6 h-6 ${copied ? '' : 'hover:rotate-180 transition-transform duration-500'}`} />
                        </button>
                    </div>
                    {copied && <span className="absolute -bottom-6 text-green-400 text-xs font-bold animate-pulse">{t.copied}</span>}
                </div>
            </div>
        </div>
    );
};
