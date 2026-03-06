import React from 'react';

export const FortniteLogo: React.FC<{ subtitle: string }> = ({ subtitle }) => {
  return (
    <div className="relative select-none mb-12 group flex flex-col items-center">
      {/* Top Text */}
      <h2 className="font-burbank text-4xl md:text-5xl text-white lowercase italic text-center mb-[-12px] md:mb-[-15px] relative z-10 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] transform -skew-x-6">
        is
      </h2>

      {/* Main Text with Shadow */}
      <div className="relative">
        <h1 className="font-burbank text-7xl md:text-9xl text-white italic tracking-tighter relative z-10 drop-shadow-[0_8px_15px_rgba(0,0,0,0.8)] transform -skew-x-6">
          FORTNITE
        </h1>
        <h1 className="font-burbank text-7xl md:text-9xl text-blue-500/20 italic tracking-tighter absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 -z-0 blur-sm">
          FORTNITE
        </h1>

        {/* Re-designed Cyber/Hacker Official Badge - Moved to Top Right Option */}
        <div className="absolute -top-4 -right-12 md:-top-6 md:-right-20 z-20 group-hover:scale-105 transition-transform duration-500">
          <div className="relative">
            {/* Neon Glow Backplate */}
            <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-40 animate-pulse"></div>

            {/* Main Badge Body - Sci-Fi / Cyberpunk themed */}
            <div className="relative bg-slate-900 border border-cyan-400 px-4 py-2 md:px-6 md:py-2.5 shadow-[0_0_15px_rgba(34,211,238,0.5)] transform -skew-x-[20deg] flex items-center justify-center gap-3 overflow-hidden">

              {/* Subtle scanline overlay */}
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] pointer-events-none"></div>

              {/* Glowing Accent Strike */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent"></div>

              <div className="flex flex-col items-end transform skew-x-[20deg]">
                <span className="font-burbank text-cyan-50 text-sm md:text-xl leading-none text-right tracking-widest relative z-10 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
                  {subtitle}
                </span>

                {/* Technological Sub-Accent */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-sm animate-ping"></div>
                  <span className="text-[7px] md:text-[9px] font-mono text-cyan-400 uppercase tracking-widest opacity-80">SYS.ONLINE // OFFICIAL</span>
                </div>
              </div>

              {/* Decorative Side Accents */}
              <div className="h-full w-1 border-l-2 border-dashed border-cyan-500/50 absolute left-2 transform skew-x-[20deg]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Text */}
      <h2 className="font-burbank text-5xl md:text-6xl text-white lowercase italic text-center mt-[-8px] md:mt-[-10px] relative z-10 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] transform -skew-x-6">
        .online
      </h2>
    </div>
  );
};