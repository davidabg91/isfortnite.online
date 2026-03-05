
import React from 'react';
import { Language, NewsItem } from '../types';
import { getTranslation } from '../translations';
import { ExternalLink } from 'lucide-react';

interface NewsSectionProps {
  news: NewsItem[];
  language: Language;
}

const NewsListItem: React.FC<{ item: NewsItem; language: Language; index: number }> = ({ item, language, index }) => {
  const title = item.title?.[language] || item.title?.['en'] || "News Update";
  const summary = item.summary?.[language] || item.summary?.['en'] || "Click to read more.";
  const displayIndex = (index + 1).toString().padStart(2, '0');

  // A pool of official, high-quality Epic Games CDN images for Fortnite
  const fortniteImagePool = [
    "https://cdn-live.prm.ol.epicgames.com/prod/c7053f0346414f08971329a1d25af9c5.jpeg?width=1024",
    "https://cdn-live.prm.ol.epicgames.com/prod/f8192ba004444ee29ae9dd6ad4613443.jpeg?width=1024",
    "https://cdn-live.prm.ol.epicgames.com/prod/6f74dd550a80fe4b5b2bce5f02145f03d99f22ba36174c4f6459486afb70633031933b85b8abede933eb32004cd0d594-c90027ca-131b-49e0-8ba6-e35f09e3b330.jpeg?width=1024",
    "https://cdn-live.prm.ol.epicgames.com/prod/4bbb34d8dd1f390ab6d31acb3c770c30f5711371042c209afda0a54d7cdb8be4-e5b93070-fdd2-465e-b21d-0c11184357c2.jpeg?width=1024",
    "https://cdn-live.prm.ol.epicgames.com/prod/b969d31f10fb8c3b7fa25648e65740102dcb074a67975f7d5d439ac19ae44ee1ea16154b7fc2edc921d5622964512ff1-4469eeef-ad6c-46cd-9dcf-02c0f92f75ec.jpeg?width=1024"
  ];

  // Select image based on index to ensure variety if AI URL fails or is not preferred
  const stableImage = fortniteImagePool[index % fortniteImagePool.length];

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col md:flex-row gap-6 p-6 md:p-8 backdrop-blur-xl bg-white/10 border-2 border-yellow-400/50 rounded-3xl overflow-hidden transition-all duration-500 shadow-[0_10px_60px_rgba(250,204,21,0.2)] hover:shadow-[0_20px_80px_rgba(250,204,21,0.3)] cursor-pointer hover:scale-[1.01] active:scale-95"
    >
      {/* Background Glossy Shine - Constant */}
      <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/5 via-white/5 to-transparent pointer-events-none"></div>

      {/* Image Section */}
      <div className="w-full md:w-64 h-48 md:h-auto overflow-hidden rounded-2xl border border-white/20 flex-shrink-0 group-hover:border-yellow-400/40 transition-colors bg-black/40 relative">
        <img
          src={stableImage}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
        />
        {/* Constant image overlay for beauty */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
      </div>



      {/* Content */}
      <div className="flex-grow flex flex-col relative z-10">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="bg-yellow-400 text-black text-[10px] md:text-xs font-black px-2 py-0.5 rounded-sm uppercase tracking-tighter shadow-[0_0_10px_rgba(250,204,21,0.4)]">
            {item.date}
          </span>
          {item.imageUrl && (
            <span className="text-yellow-400 font-burbank text-2xl italic opacity-50 select-none">#{displayIndex}</span>
          )}
          <div className="h-0.5 flex-grow bg-gradient-to-r from-yellow-400/40 to-transparent"></div>
        </div>

        <h3 className="font-burbank text-3xl md:text-4xl text-yellow-400 mb-4 leading-tight uppercase italic drop-shadow-[0_0_10px_rgba(250,204,21,0.3)] group-hover:drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] transition-all">
          {title}
        </h3>

        <p className="text-white/95 text-lg leading-relaxed font-bold drop-shadow-md">
          {summary}
        </p>

        <div className="mt-auto pt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-400 font-black group-hover:translate-x-2 transition-transform">
            <span className="text-xs uppercase tracking-widest">{language === 'bg' ? 'ПРОЧЕТИ ПОВЕЧЕ' : 'READ MORE'}</span>
            <ExternalLink className="w-4 h-4" />
          </div>
          <div className="text-white/20 font-black text-xs uppercase tracking-[0.2em] italic hidden sm:block">Update Received</div>
        </div>
      </div>

      {/* Persistent background glows */}
      <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-yellow-400/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-yellow-400/5 rounded-full blur-[60px] pointer-events-none"></div>
    </a>
  );
};

export const NewsSection: React.FC<NewsSectionProps> = ({ news, language }) => {
  const t = getTranslation(language);

  if (!news || news.length === 0) return null;

  return (
    <div className="w-full max-w-5xl mt-16 mb-12 animate-fade-in px-4">
      <div className="flex flex-col items-center mb-12">
        <div className="flex items-center gap-6 w-full max-w-3xl mb-4">
          <div className="h-px flex-grow bg-gradient-to-r from-transparent to-white/20"></div>
          <h2 className="font-burbank text-5xl text-white text-center drop-shadow-2xl tracking-tighter italic uppercase">
            {t.news_title}
          </h2>
          <div className="h-px flex-grow bg-gradient-to-l from-transparent to-white/20"></div>
        </div>
        <p className="text-white/40 text-sm uppercase tracking-[0.4em] font-black">Latest Intel</p>
      </div>

      <div className="flex flex-col gap-8">
        {news.map((item, index) => (
          <NewsListItem
            key={index}
            index={index}
            item={item}
            language={language}
          />
        ))}
      </div>
    </div>
  );
};
