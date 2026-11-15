import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeOption, THEMES, getCurrentTheme, applyTheme, toggleTheme as toggleThemeUtil } from '../utils/themeManager';

interface ThemeContextType {
  theme: ThemeOption;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (themeId: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeOption>(getCurrentTheme);

  useEffect(() => {
    // Sync initial theme
    const active = applyTheme(theme.id);
    setThemeState(active);

    const handleThemeChange = (e: any) => {
      const match = THEMES.find(t => t.id === e.detail);
      if (match) setThemeState(match);
    };

    window.addEventListener('iron-theme-changed', handleThemeChange);
    return () => window.removeEventListener('iron-theme-changed', handleThemeChange);
  }, []);

  const handleToggleTheme = () => {
    const updated = toggleThemeUtil();
    setThemeState(updated);
  };

  const handleSetTheme = (themeId: 'light' | 'dark') => {
    const updated = applyTheme(themeId);
    setThemeState(updated);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme.isDark,
        toggleTheme: handleToggleTheme,
        setTheme: handleSetTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
