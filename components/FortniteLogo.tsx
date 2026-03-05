import React from 'react';

export const FortniteLogo: React.FC<{ subtitle: string }> = ({ subtitle }) => {
  return (
    <div className="relative select-none mb-12 group">
      {/* Main Text with Shadow */}
      <h1 className="font-burbank text-7xl md:text-9xl text-white italic tracking-tighter relative z-10 drop-shadow-[0_8px_15px_rgba(0,0,0,0.8)] transform -skew-x-6">
        FORTNITE
      </h1>
      <h1 className="font-burbank text-7xl md:text-9xl text-blue-500/20 italic tracking-tighter absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 -z-0 blur-sm">
        FORTNITE
      </h1>

      {/* Re-designed Official Badge / Sign */}
      <div className="absolute -top-6 -right-10 md:-top-10 md:-right-16 z-20 group-hover:scale-110 transition-transform duration-500">
        <div className="relative">
          {/* Animated Glow Backplate */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-yellow-600 rounded-xl blur-md opacity-50 animate-pulse"></div>

          {/* Main Badge Body */}
          <div className="relative bg-yellow-400 border-[3px] border-black px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.4)] transform rotate-6 hover:rotate-0 transition-all duration-300 min-w-[100px] md:min-w-[120px] flex flex-col items-center justify-center">
            {/* Technological Details */}
            <div className="absolute top-0 left-0 w-full h-1 bg-black/10"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-black/10"></div>

            <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-black"></div>
            <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-black"></div>
            <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-black"></div>
            <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-black"></div>

            <span className="font-burbank text-black text-xl md:text-2xl leading-none text-center whitespace-pre-line relative z-10 italic font-black tracking-tight">
              {subtitle}
            </span>

            {/* Small 'Certified' or 'Live' dot */}
            <div className="mt-1 flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-black rounded-full animate-ping"></div>
              <span className="text-[8px] font-black text-black uppercase tracking-tighter">OFFICIAL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};