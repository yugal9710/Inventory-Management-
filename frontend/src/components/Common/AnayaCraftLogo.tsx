import React from 'react';

/**
 * Anaya Craft Official Tech Emblem Monogram ("AC")
 */
export function AnayaCraftEmblem({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`bg-white dark:bg-slate-900 rounded-2xl p-1 shadow-sm border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shrink-0 relative select-none group ${className}`}
    >
      <img
        src="/anaya-craft-icon.png"
        alt="Anaya Craft"
        className="w-full h-full object-contain select-none transition-transform duration-300 group-hover:scale-105"
        onError={(e) => {
          // Fallback to SVG if image file not loaded
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}

/**
 * Decorative Tech Graphic Elements (Corner dot matrices, circuit-traces, pin node)
 */
export function AnayaCraftTechDecor() {
  return (
    <>
      {/* Top-Right: Dot-Matrix Grid + Angular Circuit-Trace Line */}
      <svg className="absolute top-2.5 right-2.5 w-16 h-12 pointer-events-none opacity-60" viewBox="0 0 64 48" fill="none">
        <circle cx="28" cy="6" r="1.4" fill="#0284c7" fillOpacity="0.75" />
        <circle cx="38" cy="6" r="1.4" fill="#0284c7" fillOpacity="0.55" />
        <circle cx="48" cy="6" r="1.4" fill="#38bdf8" fillOpacity="0.7" />
        <circle cx="58" cy="6" r="1.4" fill="#38bdf8" fillOpacity="0.9" />

        <circle cx="28" cy="14" r="1.4" fill="#0284c7" fillOpacity="0.55" />
        <circle cx="38" cy="14" r="1.4" fill="#0284c7" fillOpacity="0.4" />
        <circle cx="48" cy="14" r="1.4" fill="#38bdf8" fillOpacity="0.5" />
        <circle cx="58" cy="14" r="1.4" fill="#38bdf8" fillOpacity="0.7" />

        <circle cx="38" cy="22" r="1.4" fill="#0284c7" fillOpacity="0.25" />
        <circle cx="48" cy="22" r="1.4" fill="#38bdf8" fillOpacity="0.35" />
        <circle cx="58" cy="22" r="1.4" fill="#38bdf8" fillOpacity="0.5" />

        <path
          d="M 8 4 L 20 4 L 28 12 L 28 38 L 36 38"
          stroke="#0284c7"
          strokeWidth="1.2"
          strokeOpacity="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="36" cy="38" r="2" fill="#38bdf8" fillOpacity="0.9" />
      </svg>
    </>
  );
}

/**
 * Anaya Craft Official High-Resolution Branding Card
 */
export function AnayaCraftBrandCard({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const iconHeight = isSm ? 'h-8' : isLg ? 'h-14' : 'h-10';
  const titleSize = isSm ? 'text-xs' : isLg ? 'text-lg' : 'text-sm';
  const tagPrimary = isSm ? 'text-[8.5px]' : isLg ? 'text-[11px]' : 'text-[9.5px]';
  const tagSecondary = isSm ? 'text-[7px]' : isLg ? 'text-[9px]' : 'text-[7.5px]';
  const bannerWidth = isSm ? 'max-w-[170px]' : isLg ? 'max-w-[260px]' : 'max-w-[215px]';

  return (
    <div className={`flex flex-col items-center justify-center text-center select-none py-1 group ${className}`}>
      {/* 3D Ribbon / Origami Monogram */}
      <img
        src="/anaya-craft-icon.png"
        alt="Anaya Craft"
        className={`${iconHeight} w-auto object-contain transition-transform duration-300 group-hover:scale-105 select-none drop-shadow-xs`}
        loading="eager"
      />

      {/* Brand Name Typography */}
      <div className={`mt-1 flex items-center justify-center space-x-1 leading-none ${titleSize}`}>
        <span className="font-extrabold text-[#0072E5] tracking-tight">Anaya</span>
        <span className="font-black text-[#0F1C3F] dark:text-slate-100 tracking-tight">Craft</span>
      </div>

      {/* Vibrant Orange Tagline Banner with High Contrast */}
      <div className={`mt-1.5 w-full ${bannerWidth} bg-gradient-to-r from-orange-500 via-amber-600 to-orange-600 text-white rounded-lg px-2.5 py-1 shadow-xs flex flex-col items-center justify-center border border-orange-400/40`}>
        <span className={`${tagPrimary} font-black uppercase tracking-wider text-white leading-tight drop-shadow-xs whitespace-nowrap`}>
          ALL KINDS OF IT SOLUTIONS
        </span>
        <span className={`${tagSecondary} font-bold uppercase tracking-widest text-amber-100 leading-tight mt-0.5 whitespace-nowrap`}>
          TECHNOLOGY • BUILT AROUND YOU
        </span>
      </div>
    </div>
  );
}

export interface AnayaCraftLogoProps {
  variant?: 'card' | 'brand-card' | 'horizontal' | 'stacked' | 'emblem';
  size?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark';
  className?: string;
}

/**
 * Anaya Craft Complete Component
 */
export function AnayaCraftLogo({
  variant = 'brand-card',
  size = 'md',
  theme = 'light',
  className = ''
}: AnayaCraftLogoProps) {
  if (variant === 'card' || variant === 'brand-card' || variant === 'stacked') {
    return <AnayaCraftBrandCard className={className} size={size} />;
  }

  if (variant === 'emblem') {
    return <AnayaCraftEmblem size={size === 'sm' ? 36 : size === 'lg' ? 64 : 44} className={className} />;
  }

  const isDark = theme === 'dark';
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <div className={`flex items-center space-x-3 text-left select-none ${className}`}>
      <img
        src="/anaya-craft-icon.png"
        alt="Anaya Craft"
        className={`${isSm ? 'h-8' : isLg ? 'h-12' : 'h-10'} w-auto object-contain shrink-0 drop-shadow-xs`}
      />

      <div className="min-w-0 flex-1 leading-none space-y-1">
        <div className={`tracking-tight ${isSm ? 'text-xs' : isLg ? 'text-lg' : 'text-sm'}`}>
          <span className={`font-extrabold ${isDark ? 'text-blue-400' : 'text-[#0072E5]'}`}>Anaya</span>{' '}
          <span className={`font-black ${isDark ? 'text-white' : 'text-[#0F1C3F]'}`}>Craft</span>
        </div>

        <div className="bg-gradient-to-r from-orange-500 via-amber-600 to-orange-600 text-white rounded-md px-2 py-0.5 inline-flex flex-col shadow-2xs">
          <span className="text-[8.5px] font-black uppercase tracking-wider text-white leading-tight whitespace-nowrap">
            ALL KINDS OF IT SOLUTIONS
          </span>
          <span className="text-[7px] font-bold uppercase tracking-widest text-amber-100 leading-tight mt-0.5 whitespace-nowrap">
            TECHNOLOGY • BUILT AROUND YOU
          </span>
        </div>
      </div>
    </div>
  );
}

export default AnayaCraftLogo;
