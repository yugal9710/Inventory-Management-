// Theme Manager for Nepal Iron Store Inventory & Billing System
// Supports Light and Dark modes with persistent localStorage storage

export interface ThemeOption {
  id: 'light' | 'dark';
  name: string;
  nameNp: string;
  subtitle: string;
  iconName: 'Sun' | 'Moon';
  isDark: boolean;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'light',
    name: 'Daylight Mode',
    nameNp: 'उज्यालो (Day)',
    subtitle: 'Crisp high-contrast retail counter view',
    iconName: 'Sun',
    isDark: false
  },
  {
    id: 'dark',
    name: 'Industrial Dark Mode',
    nameNp: 'अध्यारो (Night)',
    subtitle: 'Low-glare deep steel & graphite mode',
    iconName: 'Moon',
    isDark: true
  }
];

const STORAGE_KEY = 'iron_store_theme';

export function getCurrentTheme(): ThemeOption {
  if (typeof window === 'undefined') return THEMES[0];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark') return THEMES[1];
    if (saved === 'light') return THEMES[0];
    
    // Check system preference if no user preference is saved
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return THEMES[1];
    }
  } catch (e) {
    // Ignore storage errors
  }
  return THEMES[0];
}

export function applyTheme(themeId: 'light' | 'dark'): ThemeOption {
  const root = document.documentElement;
  
  root.classList.remove('light', 'dark', 'theme-light', 'theme-dark');
  
  const selected = THEMES.find(t => t.id === themeId) || THEMES[0];
  root.classList.add(`theme-${selected.id}`);
  if (selected.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.add('light');
  }
  
  root.setAttribute('data-theme', selected.id);

  try {
    localStorage.setItem(STORAGE_KEY, selected.id);
  } catch (e) {
    console.warn('Could not save theme preference to localStorage', e);
  }

  // Dispatch custom event for reactive non-React listeners
  window.dispatchEvent(new CustomEvent('iron-theme-changed', { detail: selected.id }));
  return selected;
}

export function toggleTheme(): ThemeOption {
  const current = getCurrentTheme();
  const nextId = current.id === 'dark' ? 'light' : 'dark';
  return applyTheme(nextId);
}

// Initial auto-apply on script load
if (typeof window !== 'undefined') {
  const current = getCurrentTheme();
  applyTheme(current.id);
}
