/**
 * OnTheTab Design System Tokens
 * Royal Purple Theme — v4
 * Generated: 2026-05-30
 *
 * Theme: Royal Purple — Social & Fun Finance
 * Inspired by modern fintech apps like Venmo, Cash App
 *
 * Usage: import { colors, typography, spacing, radius, shadows } from '../theme/tokens';
 */

// ═══════════════════════════════════════════════════════════════
// COLORS — DARK MODE (default)
// Royal Purple Theme — Social & Fun Finance
// ═══════════════════════════════════════════════════════════════

export const colors = {
  // Backgrounds — Deep purple-black palette
  bgBase: '#0F0A1A',
  bgCard: '#1A1425',
  bgElevated: '#231A33',
  bgHeaderStart: '#1A0F2E',
  bgHeaderEnd: '#0F0A1A',

  // Surfaces
  surfacePrimary: '#1A1425',
  surfaceSecondary: '#231A33',
  surfaceHover: '#2D2144',
  surfacePressed: '#3A2B58',
  surfaceActive: '#4A3880',

  // Text
  textPrimary: '#F5F0FF',
  textSecondary: 'rgba(200,185,240,0.70)',
  textTertiary: 'rgba(200,185,240,0.40)',
  textInverse: '#0F0A1A',

  // Brand Accents — Royal Purple palette
  accentPrimary: '#A855F7',    // Vibrant Purple — primary actions, headers
  accentSecondary: '#C084FC',  // Light Lavender — secondary actions, highlights
  accentPurple: '#EC4899',     // Hot Pink — Pro features, CTAs, social actions
  accentWarm: '#F97316',       // Orange — notifications, alerts

  // Semantic — Financial States (kept from blue theme for familiarity)
  debt: '#F87171',     // Soft Red — money owed TO others
  credit: '#4ADE80',   // Mint Green — money owed TO YOU
  settled: '#6B7280',  // Gray — settled/paid
  warning: '#FBBF24',  // Amber — overdue, attention needed
  info: '#A855F7',     // Purple — informational

  // Borders
  borderSubtle: '#2D2144',
  borderDefault: '#3D2D5C',
  borderActive: '#A855F7',

  // Semantic aliases for Paper theme compatibility
  primary: '#A855F7',
  primaryLight: '#C084FC',
  onPrimary: '#FFFFFF',
  primaryContainer: '#2D2144',
  onPrimaryContainer: '#E9D5FF',

  secondary: '#C084FC',
  onSecondary: '#0F0A1A',
  secondaryContainer: '#231A33',
  onSecondaryContainer: '#E9D5FF',

  tertiary: '#EC4899',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#2D2144',
  onTertiaryContainer: '#FCE7F3',

  // Success/Credit
  success: '#4ADE80',
  onSuccess: '#0F0A1A',
  successContainer: '#1A2E1A',
  onSuccessContainer: '#BBF7D0',

  // Error/Debt
  error: '#F87171',
  onError: '#FFFFFF',
  errorContainer: '#2D1A1A',
  onErrorContainer: '#FECACA',

  // Warning
  warningColor: '#FBBF24',
  onWarning: '#0F0A1A',
  warningContainer: '#2D2514',
  onWarningContainer: '#FEF08A',

  infoColor: '#7C3AED',
  onInfo: '#FFFFFF',
  onInfoContainer: '#F3E8FF',

  // Surface for Paper MD3
  surface: '#1A1425',
  surfaceVariant: '#231A33',
  onSurface: '#F5F0FF',
  onSurfaceVariant: 'rgba(200,185,240,0.70)',

  // Background for Paper MD3
  background: '#0F0A1A',
  onBackground: '#F5F0FF',

  // Borders for Paper MD3
  outline: '#3D2D5C',
  outlineVariant: '#2D2144',

  // Disabled states
  disabled: '#2D2144',
  onDisabled: 'rgba(200,185,240,0.40)',

  // Elevation — Purple tinted
  elevation: {
    level0: 'transparent',
    level1: '#1A1425',
    level2: '#231A33',
    level3: '#2D2144',
    level4: '#3A2B58',
    level5: '#4A3880',
  },

  // Overlay
  overlay: 'rgba(15,10,26,0.7)',
  overlayLight: 'rgba(15,10,26,0.4)',
  overlayMedium: 'rgba(15,10,26,0.6)',
  overlayDark: 'rgba(15,10,26,0.85)',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ═══════════════════════════════════════════════════════════════
// COLORS — LIGHT MODE
// Royal Purple Theme — Social & Fun Finance
// ═══════════════════════════════════════════════════════════════

export const colorsLight = {
  // Backgrounds — Soft purple-tinted whites
  bgBase: '#FAF8FF',
  bgCard: '#FFFFFF',
  bgElevated: '#F5F0FF',
  bgHeaderStart: '#FFFFFF',
  bgHeaderEnd: '#FAF8FF',

  // Surfaces
  surfacePrimary: '#FFFFFF',
  surfaceSecondary: '#F5F0FF',
  surfaceHover: '#EDE8FA',
  surfacePressed: '#E4DAF5',
  surfaceActive: '#D9CCF0',

  // Text
  textPrimary: '#1E1030',
  textSecondary: 'rgba(30,16,48,0.60)',
  textTertiary: 'rgba(30,16,48,0.40)',
  textInverse: '#FAF8FF',

  // Brand Accents — Royal Purple palette
  accentPrimary: '#7C3AED',
  accentSecondary: '#A855F7',
  accentPurple: '#EC4899',
  accentWarm: '#EA580C',

  // Semantic
  debt: '#DC2626',
  credit: '#16A34A',
  settled: '#6B7280',
  warning: '#D97706',
  info: '#7C3AED',

  // Borders
  borderSubtle: '#E4DAF5',
  borderDefault: '#D1C4E9',
  borderActive: '#7C3AED',

  // Semantic aliases
  primary: '#7C3AED',
  primaryLight: '#A855F7',
  onPrimary: '#FFFFFF',
  primaryContainer: '#F3E8FF',
  onPrimaryContainer: '#5B21B6',

  secondary: '#A855F7',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#F3E8FF',
  onSecondaryContainer: '#7C3AED',

  tertiary: '#EC4899',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FDF2F8',
  onTertiaryContainer: '#BE185D',

  success: '#16A34A',
  onSuccess: '#FFFFFF',
  successContainer: '#F0FDF4',
  onSuccessContainer: '#15803D',

  error: '#DC2626',
  onError: '#FFFFFF',
  errorContainer: '#FEF2F2',
  onErrorContainer: '#B91C1C',

  warningColor: '#D97706',
  onWarning: '#FFFFFF',
  warningContainer: '#FFFBEB',
  onWarningContainer: '#B45309',

  infoColor: '#7C3AED',
  onInfo: '#FFFFFF',
  onInfoContainer: '#EDE9FE',

  surface: '#FFFFFF',
  surfaceVariant: '#F5F0FF',
  onSurface: '#1E1030',
  onSurfaceVariant: 'rgba(30,16,48,0.60)',

  background: '#FAF8FF',
  onBackground: '#1E1030',

  outline: '#D1C4E9',
  outlineVariant: '#E4DAF5',

  disabled: '#E4DAF5',
  onDisabled: 'rgba(30,16,48,0.40)',

  elevation: {
    level0: 'transparent',
    level1: '#FFFFFF',
    level2: '#F5F0FF',
    level3: '#EDE8FA',
    level4: '#E4DAF5',
    level5: '#D9CCF0',
  },

  overlay: 'rgba(30,16,48,0.4)',
  overlayLight: 'rgba(30,16,48,0.05)',
  overlayMedium: 'rgba(30,16,48,0.1)',
  overlayDark: 'rgba(30,16,48,0.2)',

  white: '#FFFFFF',
  black: '#1E1030',
  transparent: 'transparent',
} as const;

// ═══════════════════════════════════════════════════════════════
// TYPOGRAPHY
// ═══════════════════════════════════════════════════════════════

export const typography = {
  fontFamily: {
    primary: 'Inter',
    display: 'Space Grotesk',
    mono: 'JetBrains Mono',
    fallback: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },

  sizes: {
    display: 36,
    h1: 28,
    h2: 22,
    h3: 18,
    bodyLg: 16,
    body: 15,
    bodySm: 13,
    caption: 12,
    overline: 11,
    button: 15,
    tab: 11,
  },

  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeights: {
    display: 44,
    h1: 36,
    h2: 28,
    h3: 24,
    bodyLg: 26,
    body: 24,
    bodySm: 20,
    caption: 16,
    overline: 16,
    button: 20,
    tab: 16,
  },

  letterSpacing: {
    display: -0.02,
    h1: -0.01,
    h2: 0,
    h3: 0,
    bodyLg: 0,
    body: 0,
    bodySm: 0.01,
    caption: 0.02,
    overline: 0.08,
    button: 0.02,
    tab: 0.02,
  },
} as const;

// Financial Typography (special styles for amounts)
export const financialTypography = {
  balanceHero: {
    fontFamily: 'Space Grotesk',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.02,
  },
  balanceMedium: {
    fontFamily: 'Space Grotesk',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.01,
  },
  balanceSmall: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0,
  },
  amountPrefix: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '500',
  },
  currencySymbol: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '500',
    opacity: 0.7,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// SPACING
// ═══════════════════════════════════════════════════════════════

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// ═══════════════════════════════════════════════════════════════
// RADIUS
// ═══════════════════════════════════════════════════════════════

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

// ═══════════════════════════════════════════════════════════════
// SHADOWS
// ═══════════════════════════════════════════════════════════════

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  // Purple glow effects for Royal Purple theme
  glowPurple: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 0,
  },
  glowPink: {
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 0,
  },
  glowBlue: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 0,
  },
  glowRed: {
    shadowColor: '#F87171',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 0,
  },
  glowGreen: {
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 0,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// COMPONENT TOKENS
// ═══════════════════════════════════════════════════════════════

export const componentTokens = {
  card: {
    backgroundColor: colors.surfacePrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    padding: spacing[5],
  },

  cardElevated: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius['2xl'],
    padding: spacing[6],
  },

  buttonPrimary: {
    backgroundColor: colors.accentPrimary,
    color: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    fontSize: typography.sizes.button,
    fontWeight: typography.weights.semibold,
    height: 48,
  },

  buttonGhost: {
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    color: colors.textSecondary,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    fontSize: typography.sizes.button,
    fontWeight: typography.weights.medium,
    height: 48,
  },

  input: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    color: colors.textPrimary,
    placeholderColor: colors.textTertiary,
    paddingVertical: 14,
    paddingHorizontal: spacing[4],
    fontSize: 16,
  },

  avatar: {
    size: {
      sm: 32,
      md: 40,
      lg: 48,
      xl: 64,
      xxl: 96,
    },
    borderRadius: radius.full,
    glowActive: {
      borderWidth: 2,
      borderColor: colors.accentPrimary,
      shadowColor: colors.accentPrimary,
      shadowOpacity: 0.3,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 0 },
    },
  },

  bottomNav: {
    backgroundColor: colors.bgBase,
    height: 64,
    activeColor: colors.accentPrimary,
    inactiveColor: colors.textSecondary,
  },

  settledBanner: {
    backgroundColor: colors.surfacePrimary,
    borderLeftWidth: 4,
    borderLeftColor: colors.settled,
    borderRadius: radius.md,
    padding: spacing[4],
  },

  actionPill: {
    borderRadius: radius.md,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    fontSize: typography.sizes.bodySm,
    fontWeight: typography.weights.semibold,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// DERIVED THEME OBJECT (drop-in replacement for current theme)
// ═══════════════════════════════════════════════════════════════

/** Full theme object matching the shape of current lightTheme/darkTheme */
export const appTheme = {
  primary: colors.accentPrimary,
  onPrimary: colors.onPrimary,
  primaryContainer: colors.primaryContainer,
  onPrimaryContainer: colors.onPrimaryContainer,
  secondary: colors.secondary,
  onSecondary: colors.onSecondary,
  secondaryContainer: colors.secondaryContainer,
  onSecondaryContainer: colors.onSecondaryContainer,
  tertiary: colors.tertiary,
  onTertiary: colors.onTertiary,
  tertiaryContainer: colors.tertiaryContainer,
  onTertiaryContainer: colors.onTertiaryContainer,
  background: colors.background,
  surface: colors.surface,
  surfaceVariant: colors.surfaceVariant,
  onBackground: colors.onBackground,
  onSurface: colors.onSurface,
  onSurfaceVariant: colors.onSurfaceVariant,
  text: colors.textPrimary,
  textSecondary: colors.textSecondary,
  border: colors.borderSubtle,
  outline: colors.outline,
  outlineVariant: colors.outlineVariant,
  error: colors.error,
  onError: colors.onError,
  errorContainer: colors.errorContainer,
  onErrorContainer: colors.onErrorContainer,
  success: colors.success,
  onSuccess: colors.onSuccess,
  successContainer: colors.successContainer,
  onSuccessContainer: colors.onSuccessContainer,
  warning: colors.warningColor,
  onWarning: colors.onWarning,
  warningContainer: colors.warningContainer,
  onWarningContainer: colors.onWarningContainer,
  info: colors.infoColor,
  onInfo: colors.onInfo,
  infoContainer: colors.surfaceSecondary,
  onInfoContainer: colors.onInfoContainer,
  disabled: colors.disabled,
  onDisabled: colors.onDisabled,
  elevation: colors.elevation,

  // Legacy aliases for existing code
  bgBase: colors.bgBase,
  bgCard: colors.bgCard,
  bgElevated: colors.bgElevated,
  accentPrimary: colors.accentPrimary,
  accentSecondary: colors.accentSecondary,
  accentPurple: colors.accentPurple,
  accentWarm: colors.accentWarm,
  credit: colors.credit,
  debt: colors.debt,
  settled: colors.settled,
} as const;

// Light mode variant
export const appThemeLight = {
  ...appTheme,
  primary: colorsLight.accentPrimary,
  onPrimary: colorsLight.onPrimary,
  primaryContainer: colorsLight.primaryContainer,
  onPrimaryContainer: colorsLight.onPrimaryContainer,
  secondary: colorsLight.secondary,
  onSecondary: colorsLight.onSecondary,
  background: colorsLight.background,
  surface: colorsLight.surface,
  surfaceVariant: colorsLight.surfaceVariant,
  onBackground: colorsLight.onBackground,
  onSurface: colorsLight.onSurface,
  onSurfaceVariant: colorsLight.onSurfaceVariant,
  text: colorsLight.textPrimary,
  textSecondary: colorsLight.textSecondary,
  border: colorsLight.borderSubtle,
  outline: colorsLight.outline,
  outlineVariant: colorsLight.outlineVariant,
  error: colorsLight.error,
  onError: colorsLight.onError,
  success: colorsLight.success,
  onSuccess: colorsLight.onSuccess,
  disabled: colorsLight.disabled,
  onDisabled: colorsLight.onDisabled,

  bgBase: colorsLight.bgBase,
  bgCard: colorsLight.bgCard,
  bgElevated: colorsLight.bgElevated,
  accentPrimary: colorsLight.accentPrimary,
  accentSecondary: colorsLight.accentSecondary,
  accentPurple: colorsLight.accentPurple,
  credit: colorsLight.credit,
  debt: colorsLight.debt,
  settled: colorsLight.settled,

  elevation: colorsLight.elevation,
} as const;

// Re-export light colors under the name expected by paperTheme.ts and ThemeContext.tsx
export { colorsLight as lightColors };

// Type export for TypeScript usage
export type AppTheme = typeof appTheme;
export type AppThemeLight = typeof appThemeLight;

// Avatar palette — Royal Purple theme
export const avatarPalette = [
  // Purples (primary)
  '#A855F7', '#9333EA', '#7C3AED', '#8B5CF6', '#C084FC', '#A78BFA',
  // Pinks (accent)
  '#EC4899', '#DB2777', '#F472B6', '#F9A8D4', '#FB7185', '#FDA4AF',
  // Blues
  '#3B82F6', '#2563EB', '#60A5FA', '#93C5FD',
  // Teals/Greens (financial positive)
  '#4ADE80', '#22C55E', '#16A34A', '#86EFAC',
  // Warm colors
  '#F97316', '#FB923C', '#FBBF24', '#FCD34D',
  // Reds (financial negative)
  '#F87171', '#EF4444', '#FCA5A5', '#FECACA',
  // Slate
  '#94A3B8', '#64748B', '#475569', '#CBD5E1',
] as const;

// ═══════════════════════════════════════════════════════════════
// CATEGORY COLORS (for expense categories)
// Royal Purple theme compatible
// ═══════════════════════════════════════════════════════════════

export const categoryColors: Record<string, string> = {
  food: '#FB923C',           // Orange — dining
  transport: '#3B82F6',       // Blue — travel
  utilities: '#6B7280',       // Gray — bills
  entertainment: '#A855F7',   // Purple — fun
  shopping: '#EC4899',        // Pink — retail
  health: '#4ADE80',          // Green — wellness
  housing: '#06B6D4',        // Cyan — home
  education: '#2563EB',       // Blue — learning
  travel: '#06B6D4',         // Cyan — trips
  other: '#94A3B8',           // Gray — misc
} as const;