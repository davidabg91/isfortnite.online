import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Trophy, MapPin, Zap } from 'lucide-react';
import { getGameAdvice } from '../services/geminiService';
import { Language } from '../types';
import { getTranslation } from '../translations';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

interface AIMentorProps {
    language: Language;
}

export const AIMentor: React.FC<AIMentorProps> = ({ language }) => {
    const t = getTranslation(language);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: t.ai_mentor_desc,
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (text: string = input) => {
        if (!text.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const advice = await getGameAdvice(text);
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: advice ? advice[language] : "I'm having trouble connecting to my strategy database. Please try again later.",
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("Mentor Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const quickActions = [
        { icon: Zap, text: "How to level up fast?" },
        { icon: MapPin, text: "Best landing spots?" },
        { icon: Trophy, text: "Current Meta loadout?" }
    ];

    return (
        <div className="flex flex-col h-[600px] bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-600/20 to-blue-600/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Bot className="text-white w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">{t.ai_mentor_title}</h2>
                        <p className="text-sm text-purple-200/60 font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Online & Ready
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === 'user' ? 'bg-blue-600' : 'bg-purple-600'
                                }`}>
                                {msg.sender === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                            </div>
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-white/5 text-slate-100 border border-white/5 rounded-tl-none backdrop-blur-md'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="flex gap-3 items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                            <span className="text-sm text-slate-400 font-medium">Mentor is thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length === 1 && (
                <div className="px-6 pb-4 flex flex-wrap gap-2">
                    {quickActions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => handleSend(action.text)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 transition-all hover:scale-105 active:scale-95"
                        >
                            <action.icon className="w-3 h-3 text-purple-400" />
                            {action.text}
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="p-6 bg-slate-900/80 border-t border-white/10 flex gap-3 items-center"
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t.ai_mentor_placeholder}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-500"
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl text-white shadow-lg shadow-purple-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
};
