import { configureFonts } from 'react-native-paper';
import { colors as darkColors, colorsLight as lightColors } from '../theme/tokens';

/**
 * Generate a Paper MD3 theme from our token system.
 * Pass dark or light colors to get the correct theme.
 *
 * Typography: Inter (body) + Space Grotesk (display/headings)
 * Note: These will be loaded separately via react-native.config.js
 */
export function createPaperTheme(themeColors: typeof darkColors | typeof lightColors) {
  return {
    dark: themeColors === darkColors,
    roundness: 12,
    animation: { scale: 1 },
    fonts: configureFonts({
      config: {
        fontFamily: 'Inter',
      },
    }),
    colors: {
      // MD3 required colors
      primary: themeColors.primary,
      onPrimary: themeColors.white,
      primaryContainer: themeColors.primaryContainer,
      onPrimaryContainer: themeColors.onPrimaryContainer,

      secondary: themeColors.secondary,
      onSecondary: themeColors.white,
      secondaryContainer: themeColors.secondaryContainer,
      onSecondaryContainer: themeColors.onSecondaryContainer,

      tertiary: themeColors.tertiary,
      onTertiary: themeColors.white,
      tertiaryContainer: themeColors.tertiaryContainer,
      onTertiaryContainer: themeColors.onTertiaryContainer,

      surface: themeColors.surfacePrimary,
      onSurface: themeColors.textPrimary,
      surfaceVariant: themeColors.surfaceSecondary,
      onSurfaceVariant: themeColors.textSecondary,
      surfaceDisabled: themeColors.surfaceHover,
      onSurfaceDisabled: themeColors.textTertiary,

      background: themeColors.bgBase,
      onBackground: themeColors.textPrimary,

      error: themeColors.error,
      onError: themeColors.white,
      errorContainer: themeColors.errorContainer,
      onErrorContainer: themeColors.onErrorContainer,

      outline: themeColors.borderDefault,
      outlineVariant: themeColors.borderSubtle,
      shadow: themeColors.black,
      scrim: themeColors.overlay,
      success: themeColors.credit,
      successContainer: themeColors.successContainer,
      onSuccess: themeColors.onSuccess,
      onSuccessContainer: themeColors.onSuccessContainer,

      inverseSurface: themeColors.surfaceHover,
      inverseOnSurface: themeColors.textPrimary,
      inversePrimary: themeColors.primaryLight,

      elevation: {
        level0: 'transparent',
        level1: themeColors.elevation?.level1 ?? themeColors.surfaceSecondary,
        level2: themeColors.elevation?.level2 ?? themeColors.surfaceHover,
        level3: themeColors.elevation?.level3 ?? themeColors.surfaceActive,
        level4: themeColors.elevation?.level4 ?? themeColors.surfaceActive,
        level5: themeColors.elevation?.level5 ?? themeColors.surfaceActive,
      },

      // iOS MD3 additions
      backdrop: themeColors.overlay,
    },
  };
}

// Export static dark/light themes for backward compatibility
export const paperDarkTheme = createPaperTheme(darkColors);
export const paperLightTheme = createPaperTheme(lightColors);
