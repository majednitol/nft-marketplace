import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  systemTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  storageKey = 'nft-marketplace-theme',
}) => {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');

  // Get system theme preference
  const getSystemTheme = useCallback((): ResolvedTheme => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Update resolved theme based on current theme and system preference
  const updateResolvedTheme = useCallback((currentTheme: Theme, currentSystemTheme: ResolvedTheme) => {
    const resolved = currentTheme === 'system' ? currentSystemTheme : currentTheme;
    setResolvedTheme(resolved);
    
    // Apply theme to document
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolved === 'dark' ? '#030307' : '#f8f8fc');
    }
  }, []);

  // Set theme with persistence
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    
    try {
      localStorage.setItem(storageKey, newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
    
    updateResolvedTheme(newTheme, systemTheme);
  }, [storageKey, systemTheme, updateResolvedTheme]);

  // Toggle between light and dark (skips system)
  const toggleTheme = useCallback(() => {
    if (theme === 'system') {
      // If currently system, toggle to opposite of system theme
      setTheme(systemTheme === 'dark' ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  }, [theme, systemTheme, setTheme]);

  // Initialize theme from localStorage and system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem(storageKey) as Theme | null;
    const initialSystemTheme = getSystemTheme();
    
    setSystemTheme(initialSystemTheme);
    
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme);
      updateResolvedTheme(savedTheme, initialSystemTheme);
    } else {
      updateResolvedTheme(defaultTheme, initialSystemTheme);
    }
  }, [defaultTheme, storageKey, getSystemTheme, updateResolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystemTheme);
      
      // Update resolved theme if currently using system preference
      if (theme === 'system') {
        updateResolvedTheme(theme, newSystemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, updateResolvedTheme]);

  // Update CSS custom properties based on theme
  useEffect(() => {
    const root = document.documentElement;
    
    if (resolvedTheme === 'light') {
      // Light theme colors
      root.style.setProperty('--bg-primary', '#f8f8fc');
      root.style.setProperty('--bg-secondary', '#f1f1f7');
      root.style.setProperty('--bg-tertiary', '#e4e4f0');
      root.style.setProperty('--text-primary', '#13131c');
      root.style.setProperty('--text-secondary', '#3c3c52');
      root.style.setProperty('--text-muted', '#737399');
      root.style.setProperty('--border-primary', '#e4e4f0');
      root.style.setProperty('--border-secondary', '#d1d1e6');
    } else {
      // Dark theme colors (default)
      root.style.setProperty('--bg-primary', '#030307');
      root.style.setProperty('--bg-secondary', '#0a0914');
      root.style.setProperty('--bg-tertiary', '#12101e');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#f1f1f7');
      root.style.setProperty('--text-muted', '#a3a3c2');
      root.style.setProperty('--border-primary', '#222230');
      root.style.setProperty('--border-secondary', '#3c3c52');
    }
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        systemTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook for theme-aware styling
export const useThemeStyles = () => {
  const { resolvedTheme } = useTheme();
  
  return {
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    
    // Common style utilities
    bg: {
      primary: resolvedTheme === 'dark' ? 'bg-dark-900' : 'bg-white',
      secondary: resolvedTheme === 'dark' ? 'bg-dark-800' : 'bg-gray-50',
      tertiary: resolvedTheme === 'dark' ? 'bg-dark-700' : 'bg-gray-100',
    },
    
    text: {
      primary: resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900',
      secondary: resolvedTheme === 'dark' ? 'text-gray-200' : 'text-gray-700',
      muted: resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500',
    },
    
    border: {
      primary: resolvedTheme === 'dark' ? 'border-gray-600' : 'border-gray-300',
      secondary: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200',
    },
    
    // Card styles
    card: resolvedTheme === 'dark' 
      ? 'bg-dark-700/50 border-primary-800/30' 
      : 'bg-white border-gray-200 shadow-sm',
      
    // Input styles
    input: resolvedTheme === 'dark'
      ? 'bg-dark-400/50 border-primary-800/30 text-white'
      : 'bg-white border-gray-300 text-gray-900',
  };
};

// Theme-aware gradient utility
export const useThemeGradients = () => {
  const { resolvedTheme } = useTheme();
  
  return {
    primary: resolvedTheme === 'dark'
      ? 'bg-gradient-to-r from-primary-600 to-primary-700'
      : 'bg-gradient-to-r from-primary-500 to-primary-600',
      
    background: resolvedTheme === 'dark'
      ? 'bg-gradient-to-br from-dark-900 via-dark-800 to-primary-900/20'
      : 'bg-gradient-to-br from-gray-50 via-white to-primary-50',
      
    card: resolvedTheme === 'dark'
      ? 'bg-gradient-to-br from-dark-700/50 to-dark-600/30'
      : 'bg-gradient-to-br from-white to-gray-50',
  };
};