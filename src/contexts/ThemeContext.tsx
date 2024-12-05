import React, { createContext, useContext, useState, useEffect } from 'react';
import { rewardService, type Theme } from '../lib/services/rewardService';

interface ThemeContextType {
  currentTheme: Theme | null;
  setTheme: (theme: Theme) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActiveTheme();
  }, []);

  const loadActiveTheme = async () => {
    try {
      const userThemes = await rewardService.getUserThemes();
      const activeTheme = userThemes.find(ut => ut.is_active)?.theme;
      if (activeTheme) {
        setCurrentTheme(activeTheme);
        applyTheme(activeTheme.css_variables);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyTheme = (variables: Record<string, string>) => {
    const root = document.documentElement;
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  };

  const setTheme = (theme: Theme) => {
    setCurrentTheme(theme);
    applyTheme(theme.css_variables);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, isLoading }}>
      {!isLoading && children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 