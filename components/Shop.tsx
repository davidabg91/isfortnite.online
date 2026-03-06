import React, { useEffect, useState, useCallback } from 'react';
import { ShopItem, ShopResponse, Language } from '../types';
import { fetchFortniteShop } from '../services/fortniteShopService';
import { getTranslation } from '../translations';
import { Loader2, AlertCircle, X, ShoppingCart, CheckCircle, Info, Clock, Zap, CheckCircle2 } from 'lucide-react';

const VBUCK_RATE = 0.0049; // 0.49 euro cents per V-Buck

interface ShopProps {
    language: Language;
}

const getRarityColor = (rarity: string) => {
    const r = rarity.toLowerCase();
    if (r.includes('uncommon')) return 'from-green-500 to-green-700 border-green-400';
    if (r.includes('rare')) return 'from-blue-500 to-blue-700 border-blue-400';
    if (r.includes('epic')) return 'from-purple-500 to-purple-700 border-purple-400';
    if (r.includes('legendary')) return 'from-orange-500 to-orange-700 border-orange-400';
    if (r.includes('mythic')) return 'from-yellow-400 to-yellow-600 border-yellow-300';
    if (r.includes('icon')) return 'from-cyan-400 to-blue-600 border-cyan-300';
    return 'from-gray-500 to-gray-700 border-gray-400'; // common
};

// --- Telegram notify helper ---
const sendOrderNotification = async (itemName: string, itemPrice: string, username: string, email: string) => {
    const s_dec = (s: string) => { try { if (s && s.length > 20 && !s.includes(':')) return atob(s); return s; } catch { return s; } };
    const token = s_dec(import.meta.env.VITE_TELEGRAM_BOT_TOKEN);
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    if (!token || !chatId || token === 'REPLACE_WITH_YOUR_BOT_TOKEN') return;

    const escapeHTML = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeUser = escapeHTML(username);
    const safeEmail = escapeHTML(email);
    const safeItem = escapeHTML(itemName);

    const message =
        `🛒 <b>НОВА ПОРЪЧКА</b>\n` +
        `👤 Fortnite Username: <code>${safeUser}</code>\n` +
        `📧 Email: <code>${safeEmail}</code>\n` +
        `🎮 Предмет: <b>${safeItem}</b>\n` +
        `💶 Цена: <b>${itemPrice} €</b>\n` +
        `⏰ Дата: ${new Date().toLocaleString('bg-BG')}`;

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
        });
        if (!res.ok) {
            const errData = await res.json();
            console.error('Telegram API error:', errData);
        }
    } catch (e) {
        console.error('Telegram notify failed:', e);
    }
};

// --- Telegram contact helper ---
const sendContactNotification = async (name: string, email: string, message: string) => {
    const s_dec = (s: string) => { try { if (s && s.length > 20 && !s.includes(':')) return atob(s); return s; } catch { return s; } };
    const token = s_dec(import.meta.env.VITE_TELEGRAM_BOT_TOKEN);
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    if (!token || !chatId || token === 'REPLACE_WITH_YOUR_BOT_TOKEN') return;

    const escapeHTML = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeName = escapeHTML(name);
    const safeEmail = escapeHTML(email);
    const safeMsg = escapeHTML(message);

    const text =
        `❓ <b>НОВ ВЪПРОС</b>\n` +
        `👤 Име: <b>${safeName}</b>\n` +
        `📧 Email: <code>${safeEmail}</code>\n` +
        `💬 Съобщение:\n${safeMsg}\n` +
        `⏰ Дата: ${new Date().toLocaleString('bg-BG')}`;

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' }),
        });
        if (!res.ok) {
            const errData = await res.json();
            console.error('Telegram contact API error:', errData);
        }
    } catch (e) {
        console.error('Telegram contact notify failed:', e);
    }
};

// --- Buy Modal ---
const BuyModal = ({ item, language, onClose }: { item: ShopItem; language: Language; onClose: () => void }) => {
    const t = getTranslation(language);
    const euroPrice = (item.price * VBUCK_RATE).toFixed(2);

    const [username, setUsername] = useState<string>(() => localStorage.getItem('fn_username') || '');
    const [inputVal, setInputVal] = useState<string>(() => localStorage.getItem('fn_username') || '');
    const [email, setEmail] = useState<string>(() => localStorage.getItem('fn_email') || '');
    const [emailVal, setEmailVal] = useState<string>(() => localStorage.getItem('fn_email') || '');
    const [usernameConfirmed, setUsernameConfirmed] = useState<boolean>(() => !!localStorage.getItem('fn_username') && !!localStorage.getItem('fn_email'));
    const [inputError, setInputError] = useState<boolean>(false);
    const [emailError, setEmailError] = useState<boolean>(false);
    const [sending, setSending] = useState<boolean>(false);
    const [sent, setSent] = useState<boolean>(false);
    const [showUsernameHelp, setShowUsernameHelp] = useState<boolean>(false);

    const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

    const handleApply = () => {
        const uErr = !inputVal.trim();
        const eErr = !isValidEmail(emailVal.trim());
        setInputError(uErr);
        setEmailError(eErr);
        if (uErr || eErr) return;
        const cleanedUser = inputVal.trim();
        const cleanedEmail = emailVal.trim();
        setUsername(cleanedUser);
        setEmail(cleanedEmail);
        localStorage.setItem('fn_username', cleanedUser);
        localStorage.setItem('fn_email', cleanedEmail);
        setUsernameConfirmed(true);
    };

    const handlePay = async () => {
        if (!username || !email) { setUsernameConfirmed(false); return; }
        setSending(true);
        // @ts-ignore
        if (typeof sendOrderNotification !== 'undefined') {
            // @ts-ignore
            await sendOrderNotification(item.name, euroPrice, username, email);
        }
        setSending(false);
        setSent(true);
        window.open('https://revolut.me/deyvidp7g', '_blank');
        setTimeout(() => setSent(false), 4000);
    };

    return (
        <div
            className="fixed inset-0 flex items-center justify-center p-2 md:p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto"
            style={{ zIndex: 999999 }}
        >
            <div className="relative w-full max-w-[95%] sm:max-w-4xl bg-gradient-to-br from-gray-900 via-gray-900 to-black rounded-3xl border-2 border-green-500/40 overflow-hidden shadow-[0_0_60px_rgba(74,222,128,0.2)] my-auto max-h-[95vh] flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all hover:rotate-90"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="bg-gradient-to-r from-green-900/60 to-emerald-900/60 p-4 md:p-5 border-b border-green-500/20 flex-shrink-0">
                    <div className="flex items-center gap-3 mb-1">
                        <ShoppingCart className="w-6 h-6 text-green-400" />
                        <h2 className="font-burbank text-2xl md:text-3xl text-white uppercase tracking-wide">{t.buy_modal_title}</h2>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-green-300 font-bold text-lg">{item.name}</p>
                        <div className="inline-flex items-center gap-2 bg-black/40 px-3 py-1 rounded-lg">
                            <span className="text-white/60 text-xs line-through">{(item.price).toLocaleString()} V-Bucks</span>
                            <span className="text-green-400 font-burbank text-xl md:text-2xl">{euroPrice} €</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-grow">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">

                        {/* LEFT COLUMN: Input Form */}
                        <div className="space-y-4">
                            <div className={`rounded-2xl p-4 md:p-5 border transition-all h-full flex flex-col justify-center ${usernameConfirmed ? 'bg-green-900/20 border-green-500/40' : 'bg-white/5 border-white/15'}`}>
                                <p className="text-white font-bold mb-4 flex items-center gap-2 text-lg">
                                    {usernameConfirmed
                                        ? <><CheckCircle className="w-5 h-5 text-green-400" /> <span className="text-green-300">{t.buy_step_1_confirmed}</span></>
                                        : <span className="text-white/80">{t.buy_step_1_input}</span>
                                    }
                                </p>

                                <div className="space-y-3">
                                    {/* Username row */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-white/60 text-[10px] uppercase tracking-wider font-black block">{t.buy_username_label}</label>
                                            <button
                                                onClick={() => setShowUsernameHelp(!showUsernameHelp)}
                                                className="text-cyan-400 hover:text-cyan-300 text-[9px] font-bold uppercase flex items-center gap-1 transition-colors"
                                            >
                                                <Info className="w-3 h-3" />
                                                {t.buy_username_help_btn}
                                            </button>
                                        </div>

                                        {showUsernameHelp && (
                                            <div className="mb-3 bg-cyan-950/40 border border-cyan-500/30 p-3 rounded-xl animate-fade-in">
                                                <p className="text-cyan-300 text-[11px] font-bold mb-1 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> {t.buy_username_help_title}
                                                </p>
                                                <p className="text-white/70 text-[10px] leading-tight leading-relaxed italic">
                                                    {t.buy_username_help_desc}
                                                </p>
                                            </div>
                                        )}
                                        <input
                                            type="text"
                                            value={inputVal}
                                            onChange={e => { setInputVal(e.target.value); setInputError(false); setUsernameConfirmed(false); }}
                                            onKeyDown={e => e.key === 'Enter' && handleApply()}
                                            placeholder={t.buy_username_placeholder}
                                            className={`w-full bg-black/60 text-white font-mono px-4 py-2 rounded-xl border-2 focus:outline-none focus:border-green-400 transition-colors ${inputError ? 'border-red-500 animate-pulse' : usernameConfirmed ? 'border-green-500' : 'border-white/20'}`}
                                        />
                                        {inputError && <p className="text-red-400 text-[10px] mt-1 font-bold">{t.buy_error_empty}</p>}
                                    </div>

                                    {/* Email row */}
                                    <div>
                                        <label className="text-white/60 text-[10px] uppercase tracking-wider font-black mb-1 block">{t.buy_email_label}</label>
                                        <input
                                            type="email"
                                            value={emailVal}
                                            onChange={e => { setEmailVal(e.target.value); setEmailError(false); setUsernameConfirmed(false); }}
                                            onKeyDown={e => e.key === 'Enter' && handleApply()}
                                            placeholder="example@gmail.com"
                                            className={`w-full bg-black/60 text-white font-mono px-4 py-2 rounded-xl border-2 focus:outline-none focus:border-green-400 transition-colors ${emailError ? 'border-red-500 animate-pulse' : usernameConfirmed ? 'border-green-500' : 'border-white/20'}`}
                                        />
                                        {emailError && <p className="text-red-400 text-[10px] mt-1 font-bold">{t.buy_error_email}</p>}
                                    </div>

                                    <button
                                        onClick={handleApply}
                                        className="w-full bg-green-600 hover:bg-green-500 text-white font-burbank text-xl px-4 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {usernameConfirmed ? t.buy_btn_change : t.buy_btn_confirm}
                                    </button>

                                    {usernameConfirmed && (
                                        <div className="bg-black/40 p-2 rounded-xl border border-green-500/20 text-green-400 text-[11px] font-bold space-y-1">
                                            <p className="truncate">👤 <span className="text-white/60 uppercase mr-1">User:</span> {username}</p>
                                            <p className="truncate">✉ <span className="text-white/60 uppercase mr-1">Mail:</span> {email}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Steps & Conditions */}
                        <div className="space-y-3">
                            {/* STEP 2 */}
                            <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border-2 border-cyan-500/30 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                                    <Zap className="w-10 h-10 text-cyan-400" />
                                </div>
                                <div className="flex gap-4 items-center relative z-10">
                                    <div className="bg-cyan-500 text-black font-burbank text-xl w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.5)]">2</div>
                                    <div>
                                        <h4 className="text-cyan-300 font-burbank text-lg uppercase tracking-wider mb-0.5">{t.buy_step_2_title}</h4>
                                        <p className="text-white/90 text-[11px] leading-tight">{t.buy_step_2_desc} <span className="text-cyan-400 font-black font-mono">ImBotBg</span></p>
                                    </div>
                                </div>
                            </div>

                            {/* STEP 3 */}
                            <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-2 border-green-500/30 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                                    <CheckCircle2 className="w-10 h-10 text-green-400" />
                                </div>
                                <div className="flex gap-4 items-center relative z-10">
                                    <div className="bg-green-500 text-black font-burbank text-xl w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 shadow-[0_0_15px_rgba(34,197,94,0.5)]">3</div>
                                    <div>
                                        <h4 className="text-green-300 font-burbank text-lg uppercase tracking-wider mb-0.5">{t.buy_step_3_title}</h4>
                                        <p className="text-white/90 text-[11px] leading-tight">{t.buy_step_3_pay} <span className="text-green-400 font-black">{euroPrice} €</span> {t.buy_step_3_desc}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Important Conditions */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
                                <div className="flex gap-3 items-center opacity-80">
                                    <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                    <p className="text-[10px] text-amber-100/90 leading-snug">{t.buy_condition_new}</p>
                                </div>
                                <div className="flex gap-3 items-center bg-green-500/10 p-2 rounded-xl border border-green-500/20">
                                    <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-pulse" />
                                    <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-tighter">{t.buy_condition_instant}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pay Button Area */}
                    <div className="mt-5 space-y-2 flex-shrink-0">
                        <button
                            onClick={handlePay}
                            disabled={!usernameConfirmed || sending}
                            className={`w-full flex items-center justify-center gap-3 font-burbank text-2xl py-3.5 rounded-2xl shadow-xl transition-all uppercase tracking-widest ${!usernameConfirmed
                                ? 'bg-gray-800 text-white/30 cursor-not-allowed border border-white/5'
                                : sent
                                    ? 'bg-green-600 text-white scale-[1.01] shadow-[0_0_30px_rgba(74,222,128,0.4)] border-2 border-white/20'
                                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-2 border-white/10 hover:shadow-[0_0_25px_rgba(139,92,246,0.3)] active:scale-95'
                                }`}
                        >
                            {sending ? (
                                <><Loader2 className="w-6 h-6 animate-spin" /> {language === 'bg' ? 'ОБРАБОТКА...' : 'PROCESSING...'}</>
                            ) : sent ? (
                                <><CheckCircle className="w-7 h-7" /> {language === 'bg' ? 'ЗАЯВКАТА Е ИЗПРАТЕНА!' : 'ORDER SENT!'}</>
                            ) : (
                                <><CheckCircle className="w-7 h-7" /> {language === 'bg' ? `ПЛАТИ ${euroPrice} € В REVOLUT` : `PAY ${euroPrice} € IN REVOLUT`}</>
                            )}
                        </button>

                        {!usernameConfirmed && (
                            <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold text-[9px] uppercase tracking-widest animate-pulse">
                                <AlertCircle className="w-3 h-3" />
                                {language === 'bg' ? 'ПЪРВО ПОТВЪРДИ ДАННИТЕ СИ ПО-ГОРЕ' : 'FIRST CONFIRM YOUR DATA ABOVE'}
                            </div>
                        )}

                        <button onClick={onClose} className="w-full text-white/20 hover:text-white/60 text-[10px] uppercase tracking-widest transition-colors font-bold">
                            {t.cancel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Contact Modal ---
const ContactModal = ({ onClose, language }: { onClose: () => void; language: Language }) => {
    const t = getTranslation(language);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !message.trim()) {
            setError(t.contact_error_all);
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError(t.contact_error_email);
            return;
        }

        setSending(true);
        setError('');
        await sendContactNotification(name, email, message);
        setSending(false);
        setSent(true);
        setTimeout(() => onClose(), 2500);
    };

    return (
        <div
            className="fixed inset-0 flex items-start md:items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fade-in overflow-y-auto"
            style={{ zIndex: 1100000 }}
        >
            <div className="relative w-full max-w-[95%] sm:max-w-md bg-gradient-to-br from-gray-900 via-slate-900 to-black rounded-3xl border-2 border-blue-500/30 overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.2)] my-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all hover:rotate-90"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="bg-gradient-to-r from-blue-900/60 to-indigo-900/60 p-6 border-b border-blue-500/20 text-center">
                    <h2 className="font-burbank text-4xl text-white uppercase tracking-wider">{t.contact_title}</h2>
                    <p className="text-blue-300 text-sm">{t.contact_subtitle}</p>
                </div>

                <div className="p-6">
                    {sent ? (
                        <div className="text-center py-10 animate-fade-in">
                            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                            <h3 className="text-white text-2xl font-bold">{t.contact_sent_title}</h3>
                            <p className="text-white/60">{t.contact_sent_desc}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-white/60 text-xs uppercase font-bold mb-1 block">{t.contact_name_label}</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-black/60 text-white p-3 rounded-xl border border-white/10 focus:border-blue-500 outline-none transition-all"
                                    placeholder={t.contact_name_placeholder}
                                />
                            </div>
                            <div>
                                <label className="text-white/60 text-xs uppercase font-bold mb-1 block">{t.contact_email_label}</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-black/60 text-white p-3 rounded-xl border border-white/10 focus:border-blue-500 outline-none transition-all"
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div>
                                <label className="text-white/60 text-xs uppercase font-bold mb-1 block">{t.contact_message_label}</label>
                                <textarea
                                    rows={4}
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    className="w-full bg-black/60 text-white p-3 rounded-xl border border-white/10 focus:border-blue-500 outline-none transition-all resize-none"
                                    placeholder={t.contact_message_placeholder}
                                />
                            </div>

                            {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}

                            <button
                                type="submit"
                                disabled={sending}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-burbank text-2xl py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                            >
                                {sending ? t.contact_btn_sending : t.contact_btn_send}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- How It Works Modal ---
const HowItWorksModal = ({ onClose, language }: { onClose: () => void; language: Language }) => {
    const t = getTranslation(language);

    return (
        <div
            className="fixed inset-0 flex items-start md:items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fade-in overflow-y-auto"
            style={{ zIndex: 1000000 }}
        >
            <div className="relative w-full max-w-[95%] sm:max-w-2xl bg-gradient-to-br from-gray-900 via-slate-900 to-black rounded-3xl border-2 border-blue-500/30 overflow-hidden shadow-[0_0_100px_rgba(59,130,246,0.2)] my-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all hover:rotate-90"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900/60 to-indigo-900/60 p-8 border-b border-blue-500/20">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-400/30 shadow-lg">
                            <ShoppingCart className="w-8 h-8 text-blue-400" />
                        </div>
                        <h2 className="font-burbank text-4xl text-white uppercase tracking-wider">{t.how_title}</h2>
                    </div>
                    <p className="text-blue-300 font-medium text-lg">{t.how_subtitle}</p>
                </div>

                <div className="p-8 space-y-6">
                    {/* Process Steps */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex gap-4 items-start">
                            <div className="bg-blue-600 text-white font-burbank text-xl w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 shadow-lg">1</div>
                            <div>
                                <h4 className="text-white font-bold text-lg mb-1">{t.how_step_1_title}</h4>
                                <p className="text-white/60 text-sm italic">{t.how_step_1_desc}</p>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex gap-4 items-start">
                            <div className="bg-blue-600 text-white font-burbank text-xl w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 shadow-lg">2</div>
                            <div>
                                <h4 className="text-white font-bold text-lg mb-1">{t.how_step_2_title}</h4>
                                <p className="text-white/60 text-sm italic">{t.how_step_2_desc}</p>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex gap-4 items-start">
                            <div className="bg-blue-600 text-white font-burbank text-xl w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 shadow-lg">3</div>
                            <div>
                                <h4 className="text-white font-bold text-lg mb-1">{t.how_step_3_title}</h4>
                                <p className="text-white/60 text-sm italic">{t.how_step_3_desc}</p>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex gap-4 items-start">
                            <div className="bg-blue-600 text-white font-burbank text-xl w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 shadow-lg">4</div>
                            <div>
                                <h4 className="text-white font-bold text-lg mb-1">{t.how_step_4_title}</h4>
                                <p className="text-white/60 text-sm italic">{t.how_step_4_desc}</p>
                            </div>
                        </div>
                    </div>

                    {/* Important Condition */}
                    <div className="bg-amber-950/30 border border-amber-500/30 p-5 rounded-2xl flex gap-4 items-start shadow-inner">
                        <Clock className="w-8 h-8 text-amber-500 flex-shrink-0 mt-1" />
                        <div>
                            <h4 className="text-amber-400 font-bold text-lg mb-1 uppercase tracking-wider">{t.how_condition_title}</h4>
                            <p className="text-white/80 text-sm leading-relaxed">
                                {t.how_condition_desc}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-burbank text-2xl py-4 rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest mt-2"
                    >
                        {t.how_btn_close}
                    </button>
                </div>
            </div>
        </div>
    );
};



const ItemModal = ({ item, vbuckIcon, language, onClose, onBuy }: { item: ShopItem; vbuckIcon?: string; language: Language; onClose: () => void; onBuy: (item: ShopItem) => void }) => {
    const t = getTranslation(language);
    return (
        <div
            className="fixed inset-0 flex items-start md:items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto"
            style={{ zIndex: 999990 }}
        >
            <div className="relative w-full max-w-5xl bg-gradient-to-br from-gray-900 to-black rounded-3xl border-2 border-white/10 overflow-hidden shadow-[0_0_100px_rgba(255,255,255,0.1)] flex flex-col md:flex-row my-auto">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 md:top-6 md:right-6 z-[210] p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all hover:rotate-90"
                >
                    <X className="w-6 h-6 md:w-8 md:h-8" />
                </button>

                {/* Left: Image */}
                <div className={`w-full md:w-3/5 min-h-[300px] md:h-auto bg-gradient-to-br ${getRarityColor(item.rarity)} p-4 md:p-8 flex items-center justify-center relative`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                    <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="max-w-full max-h-[350px] md:max-h-full object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-500"
                    />
                </div>

                {/* Right: Info */}
                <div className="w-full md:w-2/5 p-6 md:p-8 flex flex-col justify-center">
                    <div className="mb-4 md:mb-6">
                        <p className="text-yellow-400 font-bold uppercase tracking-[0.2em] text-[10px] md:text-sm mb-2">{item.rarity} {item.type}</p>
                        <h2 className="font-burbank text-4xl md:text-6xl text-white uppercase leading-none mb-3 md:mb-4 italic tracking-tight">{item.name}</h2>
                        <div className="h-1 w-16 md:w-20 bg-yellow-400 mb-4 md:mb-6"></div>
                        <p className="text-white/70 text-base md:text-lg leading-relaxed">{item.description}</p>
                    </div>

                    <div className="mt-auto flex items-center gap-4 flex-wrap">
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2 opacity-60 whitespace-nowrap">
                                {vbuckIcon && <img src={vbuckIcon} alt="V-Bucks" className="w-5 h-5 md:w-6 md:h-6 grayscale" />}
                                <span className="text-white font-burbank text-xl md:text-2xl line-through">{item.price.toLocaleString()}</span>
                            </div>
                            <div className="bg-white/10 border border-white/20 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-green-400 font-burbank text-3xl md:text-4xl shadow-[0_0_15px_rgba(74,222,128,0.2)] whitespace-nowrap">
                                {(item.price * VBUCK_RATE).toFixed(2)} €
                            </div>
                        </div>
                        {item.isBundle && (
                            <span className="bg-yellow-400 text-black px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold uppercase text-xs md:text-base italic skew-x-[-12deg] whitespace-nowrap">BUNDLE</span>
                        )}
                    </div>
                    <div className="mt-8">
                        <button
                            onClick={() => onBuy(item)}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-burbank text-2xl py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 uppercase tracking-wider hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(74,222,128,0.2)]"
                        >
                            <ShoppingCart className="w-6 h-6" />
                            {t.buy_button}
                        </button>
                        <p className="text-white/30 text-[10px] text-center mt-3 uppercase tracking-widest font-bold">Сигурна доставка чрез Gift системата</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ShopItemCard = ({ item, vbuckIcon, language, onSelect, onBuy }: { item: ShopItem; vbuckIcon?: string; language: Language; onSelect: (item: ShopItem) => void; onBuy: (item: ShopItem) => void }) => {
    const t = getTranslation(language);
    return (
        <div
            className="group relative flex flex-col bg-black/40 border-2 border-white/10 rounded-xl overflow-hidden transform transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer"
        >
            {/* Clickable image area */}
            <div onClick={() => onSelect(item)} className="flex flex-col flex-grow">
                {/* Rarity Header/Background */}
                <div className={`h-48 w-full bg-gradient-to-b ${getRarityColor(item.rarity)} relative overflow-hidden`}>
                    <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-contain p-2 drop-shadow-2xl"
                        loading="lazy"
                    />
                </div>

                {/* Item Details */}
                <div className="p-4 flex flex-col flex-grow bg-gradient-to-b from-black/60 to-black/80">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-burbank text-xl text-white uppercase tracking-tight truncate flex-grow mr-2">
                            {item.name}
                        </h3>
                        <div className="flex flex-col items-end gap-1 bg-black/40 px-2 py-1.5 rounded-lg border border-white/10 flex-shrink-0 min-w-fit">
                            <div className="flex items-center gap-1 opacity-50 line-through whitespace-nowrap">
                                {vbuckIcon && <img src={vbuckIcon} alt="V-Bucks" className="w-3 h-3 grayscale" />}
                                <span className="text-white font-burbank text-[10px]">{item.price.toLocaleString()}</span>
                            </div>
                            <span className="text-green-400 font-burbank text-lg leading-none drop-shadow-md whitespace-nowrap">
                                {(item.price * VBUCK_RATE).toFixed(2)} €
                            </span>
                        </div>
                    </div>

                    <p className="text-white/50 text-xs font-medium uppercase mb-2">
                        {item.rarity}
                    </p>

                    <p className="text-white/70 text-sm line-clamp-2 italic leading-tight">
                        {item.description}
                    </p>

                    {item.isBundle && (
                        <div className="mt-2 text-[10px] bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-400/30 w-fit font-bold uppercase">
                            Bundle
                        </div>
                    )}
                </div>

            </div>{/* end clickable area */}

            {/* Buy Button */}
            <button
                onClick={(e) => { e.stopPropagation(); onBuy(item); }}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-burbank text-lg py-2.5 uppercase tracking-wider transition-all flex items-center justify-center gap-2 border-t border-green-500/30 hover:shadow-[0_0_15px_rgba(74,222,128,0.4)] active:scale-95"
            >
                <ShoppingCart className="w-4 h-4" />
                {t.buy_button}
            </button>

            {/* Hover Overlay Effect */}
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"></div>
        </div>
    );
};

export const Shop: React.FC<ShopProps> = ({ language }) => {
    const [shopData, setShopData] = useState<ShopResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
    const [buyItem, setBuyItem] = useState<ShopItem | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const t = getTranslation(language);

    const [showHowItWorks, setShowHowItWorks] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [timeLeft, setTimeLeft] = useState("");

    const getShop = useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true);
        setError(false);
        const data = await fetchFortniteShop(language);
        if (data) {
            setShopData(data);
        } else if (!shopData) {
            setError(true);
        }
        setLoading(false);
    }, [language, shopData]);

    useEffect(() => {
        getShop(true);
    }, [language]); // Initial fetch and language change

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const target = new Date();

            // Shop resets at 02:00 BG time (00:00 UTC)
            target.setHours(2, 0, 0, 0);

            if (now >= target) {
                target.setDate(target.getDate() + 1);
            }

            const diff = target.getTime() - now.getTime();

            // If we are within 1 second of reset, trigger a refresh
            if (diff <= 1000 && diff > 0) {
                setTimeout(() => getShop(false), 2000);
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        const refreshInterval = setInterval(() => getShop(false), 30 * 60 * 1000); // 30 min background refresh

        return () => {
            clearInterval(timer);
            clearInterval(refreshInterval);
        };
    }, [getShop]);

    // Group items by category
    const categorizedItems = shopData?.items.reduce((acc, item) => {
        const category = item.type || 'Other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
    }, {} as Record<string, ShopItem[]>) || {};

    // Sort categories (Outfits first, then Emotes, etc.)
    const categoryOrder = ['Outfits', 'Emotes', 'Tracks', 'Instruments', 'Cars', 'Bundles', 'Back Bling', 'Pickaxes', 'Gliders', 'Wraps', 'Other'];
    const sortedCategories = Object.keys(categorizedItems)
        .filter(cat => activeCategory === 'All' || cat === activeCategory)
        .sort((a, b) => {
            const indexA = categoryOrder.indexOf(a);
            const indexB = categoryOrder.indexOf(b);
            if (indexA === -1 && indexB === -1) return a.localeCompare(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

    const categoryIcons: Record<string, any> = {
        'Outfits': '👕',
        'Emotes': '💃',
        'Tracks': '🎵',
        'Instruments': '🎸',
        'Cars': '🚗',
        'Bundles': '📦',
        'Back Bling': '🎒',
        'Pickaxes': '⛏️',
        'Gliders': '🪂',
        'Wraps': '🔫',
        'Other': '❓',
        'All': '✨'
    };

    const bgCategoryNames: Record<string, string> = {
        'Outfits': 'СКИНОВЕ',
        'Emotes': 'ЕМОУТИ',
        'Tracks': 'МУЗИКА',
        'Instruments': 'ИНСТРУМЕНТИ',
        'Cars': 'КОЛИ',
        'Bundles': 'ПАКЕТИ',
        'Back Bling': 'РАНИЦИ',
        'Pickaxes': 'КИРКИ',
        'Gliders': 'ПЛАНЕРИ',
        'Wraps': 'ОБВИВКИ',
        'Other': 'ДРУГИ',
        'All': 'ВСИЧКИ'
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 text-white">
                <Loader2 className="w-16 h-16 text-yellow-400 animate-spin mb-4" />
                <p className="font-burbank text-2xl animate-pulse uppercase tracking-widest">{t.status_checking}</p>
            </div>
        );
    }

    if (error || !shopData) {
        return (
            <div className="flex flex-col items-center justify-center py-40 text-white px-4 text-center">
                <AlertCircle className="w-20 h-20 text-red-500 mb-6 animate-bounce" />
                <h2 className="font-burbank text-4xl mb-4">{t.status_error}</h2>
                <p className="text-white/60 max-w-md">{t.fallback_message}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-8 bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-lg font-burbank text-xl transition-all"
                >
                    {t.check_now}
                </button>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col items-center px-4 md:px-8 pb-20">
            {/* Item Detail Modal */}
            {selectedItem && <ItemModal item={selectedItem} vbuckIcon={shopData?.vbuckIcon} language={language} onClose={() => setSelectedItem(null)} onBuy={(item) => { setSelectedItem(null); setBuyItem(item); }} />}
            {/* Buy Modal */}
            {buyItem && <BuyModal item={buyItem} language={language} onClose={() => setBuyItem(null)} />}
            {/* How It Works Modal */}
            {showHowItWorks && <HowItWorksModal language={language} onClose={() => setShowHowItWorks(false)} />}
            {/* Contact Modal */}
            {showContactModal && <ContactModal language={language} onClose={() => setShowContactModal(false)} />}

            {/* Discount & Info Banner */}
            <div className="w-full max-w-4xl bg-gradient-to-r from-indigo-900/50 via-purple-900/50 to-indigo-900/50 border border-purple-500/30 rounded-2xl p-6 mb-10 text-center shadow-[0_0_40px_rgba(168,85,247,0.15)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

                <div className="relative z-10 flex flex-col items-center gap-4">
                    <h3 className="text-3xl md:text-5xl font-burbank text-yellow-400 drop-shadow-md tracking-wide uppercase">
                        {t.shop_banner_title}
                    </h3>

                    <div className="flex flex-wrap justify-center gap-4">
                        <button
                            onClick={() => setShowContactModal(true)}
                            className="inline-flex items-center gap-2 bg-blue-600/30 text-blue-300 px-4 py-2 rounded-lg font-bold border border-blue-500/40 hover:bg-blue-600/50 transition-all shadow-lg active:scale-95"
                        >
                            <Info className="w-5 h-5" />
                            {language === 'bg' ? 'ИМАШ ВЪПРОС?' : 'HAVE A QUESTION?'}
                        </button>

                        <button
                            onClick={() => setShowHowItWorks(true)}
                            className="inline-flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-300 transition-all shadow-lg active:scale-95"
                        >
                            <ShoppingCart className="w-5 h-5" />
                            {language === 'bg' ? 'КАК СТАВА? (ИНФОРМАЦИЯ)' : 'HOW IT WORKS?'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Reset Countdown & Categories Bar */}
            <div className="w-full max-w-7xl flex flex-col md:flex-row gap-4 items-center justify-between mb-8 bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>

                {/* Reset Timer */}
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 shrink-0">
                    <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />
                    <div className="flex flex-col">
                        <span className="text-white/40 text-[10px] uppercase font-black tracking-tighter leading-none">{t.shop_reset}</span>
                        <span className="text-white font-mono text-xl font-bold tracking-tighter tabular-nums">{timeLeft}</span>
                    </div>
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 w-full px-2 py-1">
                    {['All', ...categoryOrder].filter(cat => cat === 'All' || categorizedItems[cat]).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border-2 ${activeCategory === cat
                                ? 'bg-yellow-400 text-black border-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.3)] scale-105'
                                : 'bg-white/5 text-white/60 border-transparent hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <span className="text-lg">{categoryIcons[cat]}</span>
                            {language === 'bg' ? bgCategoryNames[cat] : cat}
                            {cat !== 'All' && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeCategory === cat ? 'bg-black/20' : 'bg-white/10'}`}>
                                    {categorizedItems[cat]?.length || 0}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-full max-w-7xl space-y-16 animate-fade-in">
                {sortedCategories.map(category => (
                    <div key={category} className="animate-fade-in-up">
                        <h2 className="font-burbank text-4xl text-white mb-6 italic tracking-wider drop-shadow-lg flex items-center gap-3">
                            <div className="h-8 w-2 bg-yellow-400"></div>
                            {category.toUpperCase()}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {categorizedItems[category].map((item, idx) => (
                                <ShopItemCard key={item.id + idx} item={item} vbuckIcon={shopData?.vbuckIcon} language={language} onSelect={setSelectedItem} onBuy={setBuyItem} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Branding */}
            <div className="mt-20 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default flex flex-col items-center gap-2">
                <p className="text-[10px] text-white/50 uppercase tracking-[0.3em] font-bold">Powered by</p>
                <img src="https://fortnite-api.com/assets/logo.png" alt="Fortnite API" className="h-6" />
            </div>
        </div>
    );
};
