import React from 'react';

/**
 * Anaya Craft Official Tech Emblem & Logo ("AC")
 * Dynamic interlocking letters 'A' and 'C' with industrial steel styling & neon accents
 */
export function AnayaCraftEmblem({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`bg-slate-900 rounded-2xl p-1.5 shadow-md border border-slate-700 flex items-center justify-center shrink-0 relative select-none group ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full transform transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="acGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="acGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Hexagon / Shield Frame */}
        <polygon
          points="50,6 92,28 92,72 50,94 8,72 8,28"
          stroke="url(#acGrad2)"
          strokeWidth="4"
          fill="#0f172a"
        />

        {/* Dynamic Stylized 'A' */}
        <path
          d="M 50 20 L 72 74 L 60 74 L 54 58 L 46 58 L 40 74 L 28 74 Z"
          fill="url(#acGrad1)"
        />
        {/* Inner 'A' Notch */}
        <polygon points="50,34 56,50 44,50" fill="#0f172a" />

        {/* Interlocking 'C' Ring Arc */}
        <path
          d="M 68 40 A 28 28 0 1 0 68 64"
          stroke="url(#acGrad2)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Tech Corner Accent Points */}
        <circle cx="50" cy="6" r="3" fill="#38bdf8" />
        <circle cx="92" cy="28" r="3" fill="#f97316" />
        <circle cx="8" cy="72" r="3" fill="#38bdf8" />
      </svg>
    </div>
  );
}

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

export default function AnayaCraftLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <AnayaCraftEmblem size={44} />
      <div className="flex flex-col">
        <div className="flex items-center space-x-1.5">
          <span className="font-black text-slate-900 tracking-tight text-base">ANAYA</span>
          <span className="font-black text-orange-600 tracking-tight text-base">CRAFT</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-sm bg-orange-100 text-orange-800 font-bold border border-orange-200">
            PLATFORM
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-medium tracking-wide">
          Cloud Steel & Hardware Infrastructure
        </span>
      </div>
    </div>
  );
}
