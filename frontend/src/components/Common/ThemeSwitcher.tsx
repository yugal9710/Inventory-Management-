import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function ThemeSwitcher({ className = '' }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();
  const { language } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-1.5 md:p-2 rounded-xl border transition-all duration-300 flex items-center justify-center shadow-xs active:scale-95 cursor-pointer select-none ${
        isDark
          ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400 hover:text-amber-300 shadow-amber-950/20'
          : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/60 text-slate-300 hover:text-white'
      } ${className}`}
      title={
        isDark
          ? language === 'np' ? 'उज्यालो मोडमा जानुहोस् (Light)' : 'Switch to Daylight Theme'
          : language === 'np' ? 'अध्यारो मोडमा जानुहोस् (Dark)' : 'Switch to Dark Theme'
      }
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transform transition-transform duration-500 rotate-0 hover:rotate-90" />
      ) : (
        <Moon className="w-4 h-4 text-slate-300 transform transition-transform duration-500 rotate-0 hover:-rotate-45" />
      )}
    </button>
  );
}
