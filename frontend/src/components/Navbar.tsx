import React, { useEffect, useState } from 'react';
import { Calendar, Globe, Banknote, LogOut } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { CashSession } from '../types';
import { getTodayBs, formatBsDate } from '../utils/nepaliCalendar';
import { formatNpr } from '../utils/formatters';
import ThemeSwitcher from './Common/ThemeSwitcher';

export const Navbar: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const { logout } = useAuth();
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [activeFy, setActiveFy] = useState<string>('2081/82');

  const todayBs = getTodayBs();

  useEffect(() => {
    // Fetch drawer status and active FY
    const fetchMeta = async () => {
      try {
        const [cashRes, settingsRes] = await Promise.all([
          fetch('/api/cashbook/current-session'),
          fetch('/api/settings')
        ]);
        const cashData = await cashRes.json();
        const settingsData = await settingsRes.json();

        if (cashData.success && cashData.data) {
          setCashSession(cashData.data);
        }
        if (settingsData.success && settingsData.data?.active_fiscal_year) {
          setActiveFy(settingsData.data.active_fiscal_year);
        }
      } catch (e) {
        console.error('Navbar meta error:', e);
      }
    };
    fetchMeta();
  }, []);

  return (
    <header className="no-print bg-slate-900 border-b border-slate-800 text-white px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Brand & Fiscal Year */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-600 text-white font-black text-xl shadow">
          Fe
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-base md:text-lg tracking-tight leading-none text-slate-100">
              SHREE KRISHNA IRON
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
              FY {activeFy}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {language === 'np' ? 'श्री कृष्ण फलाम तथा निर्माण सामग्री' : 'Nepal Steel & Construction Inventory System'}
          </p>
        </div>
      </div>

      {/* Center/Right Info: BS Date & Cash Drawer Float & Controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Today Bikram Sambat Date */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-200">
          <Calendar className="w-3.5 h-3.5 text-orange-400" />
          <span className="font-medium font-mono">
            {formatBsDate(todayBs, language === 'np' ? 'np' : 'en')}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            ({todayBs} BS)
          </span>
        </div>

        {/* Cash Drawer Status */}
        <div className="hidden md:flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs">
          <Banknote className="w-3.5 h-3.5 text-emerald-400" />
          {cashSession ? (
            <span className="text-emerald-400 font-medium">
              Drawer: {formatNpr(cashSession.current_expected_cash || cashSession.opening_cash)}
            </span>
          ) : (
            <span className="text-amber-400 font-medium">
              Drawer: Closed
            </span>
          )}
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'np' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600/90 hover:bg-orange-600 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
          title="Switch Language"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{language === 'en' ? 'नेपाली' : 'English'}</span>
        </button>

        {/* Dark / Light Theme Switcher */}
        <ThemeSwitcher />

        {/* Logout Button */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/90 border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
          title={language === 'np' ? 'लगआउट गर्नुहोस्' : 'Sign Out'}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">{language === 'np' ? 'लगआउट' : 'Logout'}</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
