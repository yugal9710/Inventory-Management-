import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Truck,
  Warehouse,
  Users,
  Building2,
  Wallet,
  FileSpreadsheet,
  Settings,
  Scissors,
  Server
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export type ScreenId =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'purchases'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'cashbook'
  | 'reports'
  | 'settings'
  | 'developer';

interface Props {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
}

interface MenuItem {
  id: ScreenId;
  labelKey: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'cashier', 'storekeeper', 'accountant'] },
  { id: 'pos', labelKey: 'posBilling', icon: ShoppingCart, roles: ['super_admin', 'admin', 'cashier'] },
  { id: 'products', labelKey: 'products', icon: Boxes, roles: ['super_admin', 'admin', 'cashier', 'storekeeper', 'accountant'] },
  { id: 'inventory', labelKey: 'inventory', icon: Warehouse, roles: ['super_admin', 'admin', 'storekeeper', 'accountant'] },
  { id: 'purchases', labelKey: 'purchases', icon: Truck, roles: ['super_admin', 'admin', 'storekeeper', 'accountant'] },
  { id: 'customers', labelKey: 'customers', icon: Users, roles: ['super_admin', 'admin', 'cashier', 'accountant'] },
  { id: 'suppliers', labelKey: 'suppliers', icon: Building2, roles: ['super_admin', 'admin', 'accountant'] },
  { id: 'cashbook', labelKey: 'cashbook', icon: Wallet, roles: ['super_admin', 'admin', 'cashier', 'accountant'] },
  { id: 'reports', labelKey: 'reports', icon: FileSpreadsheet, roles: ['super_admin', 'admin', 'accountant'] },
  { id: 'settings', labelKey: 'settings', icon: Settings, roles: ['super_admin', 'admin'] },
  { id: 'developer', labelKey: 'developerConsole', icon: Server, roles: ['super_admin'] },
];

export const Sidebar: React.FC<Props> = ({ currentScreen, onSelectScreen }) => {
  const { t } = useLanguage();
  const { canAccess, currentUser } = useAuth();

  return (
    <aside className="no-print w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 min-h-[calc(100vh-61px)]">
      {/* Navigation Links */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          Main Navigation
        </div>

        {menuItems.map((item) => {
          const isAllowed = canAccess(item.roles);
          const Icon = item.icon;
          const isActive = currentScreen === item.id;

          if (!isAllowed) return null;

          return (
            <button
              key={item.id}
              onClick={() => onSelectScreen(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-950/40 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>

      {/* User profile & Quick stats footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-orange-500 text-xs">
            {currentUser?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="truncate">
            <div className="text-xs font-semibold text-slate-200 truncate">
              {currentUser?.full_name || 'Authorized User'}
            </div>
            <div className="text-[10px] text-orange-400 font-medium uppercase tracking-wider">
              {currentUser?.role || ''}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
