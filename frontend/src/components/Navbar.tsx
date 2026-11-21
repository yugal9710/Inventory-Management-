import React, { useEffect, useState, useRef } from 'react';
import { Calendar, Globe, Banknote, LogOut, Building2, ChevronDown, Check, ArrowLeftRight, Shield } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { CashSession } from '../types';
import { getTodayBs, formatBsDate } from '../utils/nepaliCalendar';
import { formatNpr } from '../utils/formatters';
import ThemeSwitcher from './Common/ThemeSwitcher';
import { ScreenId } from './Sidebar';

interface NavbarProps {
  onNavigate?: (screen: ScreenId) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const { language, setLanguage } = useLanguage();
  const { currentUser, logout } = useAuth();
  const { activeTenant, activeTenantId, availableTenants, switchTenant } = useTenant();
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [activeFy, setActiveFy] = useState<string>('2081/82');
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const todayBs = getTodayBs();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Fetch drawer status and active FY for active tenant
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
        } else {
          setCashSession(null);
        }
        if (settingsData.success && settingsData.data?.active_fiscal_year) {
          setActiveFy(settingsData.data.active_fiscal_year);
        }
      } catch (e) {
        console.error('Navbar meta error:', e);
      }
    };
    fetchMeta();
  }, [activeTenantId]);

  const displayName = activeTenant?.name || 'Jagdamba Steel & Iron Suppliers Pvt. Ltd.';

  return (
    <header className="no-print bg-slate-900 border-b border-slate-800 text-white px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Brand & Store Name & Fiscal Year */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-600 text-white font-black text-xl shadow shrink-0">
          Fe
        </div>
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-sm md:text-base tracking-tight leading-none text-slate-100 max-w-[280px] md:max-w-md truncate" title={displayName}>
              {displayName}
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30 shrink-0">
              FY {activeFy}
            </span>

            {/* Super Admin Store Switcher Dropdown Button */}
            {currentUser?.role === 'super_admin' && (
              <button
                type="button"
                onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                title="Switch active store tenant (Super Admin)"
              >
                <ArrowLeftRight className="w-3 h-3 text-orange-400" />
                <span className="hidden sm:inline">Switch Store</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${storeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-medium truncate max-w-sm">
            {activeTenant?.address || (language === 'np' ? 'फलाम तथा निर्माण सामग्री भण्डार' : 'Nepal Steel & Construction Inventory System')}
          </p>

          {/* Super Admin Tenant Dropdown Menu */}
          {currentUser?.role === 'super_admin' && storeDropdownOpen && (
            <div className="absolute left-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
              <div className="px-3 py-1.5 border-b border-slate-700/80 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Active Store Tenant
                </span>
                <span className="text-[9px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded font-mono">
                  Isolated SQLite DB
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto py-1">
                {availableTenants.map((t) => {
                  const isCurrent = t.id === activeTenantId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        switchTenant(t.id);
                        setStoreDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-700/70 transition cursor-pointer ${
                        isCurrent ? 'bg-orange-600/20 text-orange-300 font-bold' : 'text-slate-200'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="font-bold truncate">{t.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {t.id} {t.pan ? `• PAN: ${t.pan}` : ''}
                        </div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-orange-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {onNavigate && (
                <div className="pt-1.5 border-t border-slate-700/80 px-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStoreDropdownOpen(false);
                      onNavigate('developer');
                    }}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Open Multi-Tenant Developer Console</span>
                  </button>
                </div>
              )}
            </div>
          )}
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
