import React, { createContext, useContext, useState } from 'react';
import { lightTheme, darkTheme } from '../constants/theme';

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
  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
