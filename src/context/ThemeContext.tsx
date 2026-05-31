import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as darkColors, colorsLight as lightColors } from '../theme/tokens';

/* ── Type ────────────────────────────────────────────────── */
export interface AppTheme {
  background: string;
  surface: string;
  primary: string;
  onPrimary: string;
  text: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderSubtle: string;
  outline: string;
  outlineVariant: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  credit: string;
  debt: string;
  disabled: string;
  cardBg: string;
  navBg: string;
  navActive: string;
  navInactive: string;
  surfaceVariant: string;
  colors: typeof darkColors | typeof lightColors;
}

/* ── Context ─────────────────────────────────────────────── */
interface ThemeCtx {
  appTheme: AppTheme;
  colors: typeof darkColors | typeof lightColors;
  isDark: boolean;
  toggleTheme: () => void;
}

// Default: dark mode
const defaultTheme: AppTheme = {
  background: darkColors.bgBase,
  surface: darkColors.surfacePrimary,
  primary: darkColors.primary,
  onPrimary: darkColors.white,
  text: darkColors.textPrimary,
  textPrimary: darkColors.textPrimary,
  textSecondary: darkColors.textSecondary,
  textTertiary: darkColors.textTertiary,
  border: darkColors.borderDefault,
  borderSubtle: darkColors.borderSubtle,
  outline: darkColors.borderDefault,
  error: darkColors.debt,
  success: darkColors.credit,
  warning: darkColors.warning,
  info: darkColors.info,
  credit: darkColors.credit,
  debt: darkColors.debt,
  disabled: darkColors.surfaceHover,
  cardBg: darkColors.surfaceSecondary,
  navBg: darkColors.bgElevated,
  navActive: darkColors.primary,
  navInactive: darkColors.textSecondary,
  surfaceVariant: darkColors.surfaceSecondary,
  outlineVariant: darkColors.borderSubtle,
  colors: darkColors,
};

const ThemeContext = createContext<ThemeCtx>({
  appTheme: defaultTheme,
  colors: darkColors,
  isDark: true,
  toggleTheme: () => {},
});

/* ── Provider ────────────────────────────────────────────── */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem('theme_mode').then((mode) => {
      if (mode === 'light') setIsDark(false);
      else if (mode === 'dark') setIsDark(true);
      // else: default dark
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem('theme_mode', next ? 'dark' : 'light');
  };

  const themeColors = isDark ? darkColors : lightColors;

  const appTheme: AppTheme = {
    background: themeColors.bgBase,
    surface: themeColors.surfacePrimary,
    primary: themeColors.primary,
    onPrimary: themeColors.white,
    text: themeColors.textPrimary,
    textPrimary: themeColors.textPrimary,
    textSecondary: themeColors.textSecondary,
    textTertiary: themeColors.textTertiary,
    border: themeColors.borderDefault,
    borderSubtle: themeColors.borderSubtle,
    outline: themeColors.borderDefault,
    error: themeColors.debt,
    success: themeColors.credit,
    warning: themeColors.warning,
    info: themeColors.info,
    credit: themeColors.credit,
    debt: themeColors.debt,
    disabled: themeColors.surfaceHover,
    cardBg: themeColors.surfaceSecondary,
    navBg: themeColors.bgElevated,
    navActive: themeColors.primary,
    navInactive: themeColors.textSecondary,
    surfaceVariant: themeColors.surfaceSecondary,
    outlineVariant: themeColors.borderSubtle,
    colors: themeColors,
  };

  return (
    <ThemeContext.Provider value={{ appTheme, colors: themeColors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/* ── Hook ────────────────────────────────────────────────── */
export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  return { ...ctx, theme: ctx.appTheme };
}

export function useTheme() {
  const { colors, isDark, appTheme } = useContext(ThemeContext);
  // Map our token colors to React Native Paper MD3 color shape
  // so that converted components can keep using theme.colors.primary etc.
  const paperColors = {
    // React Native Paper MD3 color names
    primary: colors.accentPrimary,
    onPrimary: colors.white,
    primaryLight: colors.primaryLight,
    primaryContainer: colors.primaryContainer,
    onPrimaryContainer: colors.onPrimaryContainer,
    secondary: colors.accentSecondary,
    onSecondary: colors.white,
    secondaryContainer: colors.secondaryContainer,
    onSecondaryContainer: colors.onSecondaryContainer,
    tertiary: colors.accentPurple,
    onTertiary: colors.white,
    tertiaryContainer: colors.tertiaryContainer,
    onTertiaryContainer: colors.onTertiaryContainer,
    surface: colors.surfacePrimary,
    onSurface: colors.textPrimary,
    surfaceVariant: colors.surfaceSecondary,
    onSurfaceVariant: colors.textSecondary,
    surfaceDisabled: colors.surfaceHover,
    onSurfaceDisabled: colors.textTertiary,
    background: colors.bgBase,
    onBackground: colors.textPrimary,
    error: colors.debt,
    onError: colors.white,
    errorContainer: colors.errorContainer,
    onErrorContainer: colors.onErrorContainer,
    success: colors.credit,
    onSuccess: colors.white,
    successContainer: colors.successContainer,
    onSuccessContainer: colors.onSuccessContainer,
    outline: colors.borderDefault,
    outlineVariant: colors.borderSubtle,
    shadow: colors.black,
    scrim: colors.overlay,
    inverseSurface: colors.surfaceHover,
    inverseOnSurface: colors.textPrimary,
    inversePrimary: colors.primaryLight,
    elevation: {
      level0: 'transparent',
      level1: colors.surfaceSecondary,
      level2: colors.surfaceHover,
      level3: colors.surfaceActive,
      level4: colors.surfaceActive,
      level5: colors.surfaceActive,
    },
    backdrop: colors.overlay,

    // Raw token aliases for backward compatibility
    accentPrimary: colors.accentPrimary,
    accentSecondary: colors.accentSecondary,
    accentPurple: colors.accentPurple,
    bgBase: colors.bgBase,
    bgCard: colors.bgCard,
    bgElevated: colors.bgElevated,
    bgHeaderStart: colors.bgHeaderStart,
    bgHeaderEnd: colors.bgHeaderEnd,
    surfacePrimary: colors.surfacePrimary,
    surfaceSecondary: colors.surfaceSecondary,
    surfaceHover: colors.surfaceHover,
    surfacePressed: colors.surfacePressed,
    surfaceActive: colors.surfaceActive,
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    textTertiary: colors.textTertiary,
    textInverse: colors.textInverse,
    borderDefault: colors.borderDefault,
    borderSubtle: colors.borderSubtle,
    borderActive: colors.borderActive,
    debt: colors.debt,
    credit: colors.credit,
    settled: colors.settled,
    warning: colors.warning,
    info: colors.info,
    warningColor: colors.warning,
    infoColor: colors.info,
    white: colors.white,
    black: colors.black,
    transparent: colors.transparent,
    overlay: colors.overlay,
    overlayLight: colors.overlayLight,
    overlayMedium: colors.overlayMedium,
    overlayDark: colors.overlayDark,
  };
  return { ...appTheme, colors: paperColors, isDark };
}
