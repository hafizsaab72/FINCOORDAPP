import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../constants/theme';

const THEME_STORAGE_KEY = 'fincoord-theme-preference';

interface ThemeContextType {
  theme: typeof lightTheme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

interface ThemeProviderProps {
  children: React.ReactNode;
  initialDark?: boolean;
}

export const ThemeProvider = ({ children, initialDark = false }: ThemeProviderProps) => {
  const [isDark, setIsDark] = useState(initialDark);
  const [loaded, setLoaded] = useState(false);
  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(stored => {
        if (stored !== null) {
          setIsDark(stored === 'dark');
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  };

  if (!loaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
