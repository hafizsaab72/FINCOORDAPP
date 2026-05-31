# FinCoordApp — UI/UX Redesign Specification
## Version 1.0 | May 2026 | Status: Approved

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Design Philosophy](#2-design-philosophy)
3. [Color System](#3-color-system)
4. [Typography](#4-typography)
5. [Spacing & Layout](#5-spacing--layout)
6. [Components](#6-components)
7. [Screen-by-Screen Specifications](#7-screen-by-screen-specifications)
8. [Icons & Visual Language](#8-icons--visual-language)
9. [Dark Mode](#9-dark-mode)
10. [Light Mode](#10-light-mode)
11. [Animation & Interaction](#11-animation--interaction)
12. [Implementation Phases](#12-implementation-phases)

---

## 1. Executive Summary

### Current State
The app uses a **green-first** theme (`#22C55E`) on dark backgrounds. Functional but reads as a wellness/nature app rather than a premium finance app. The green-tinted backgrounds create visual noise, and the design lacks the depth and sophistication expected of modern fintech applications.

### Target State
**Midnight Slate + Electric Blue** — A premium dark-first finance app aesthetic inspired by Revolut, Linear, and Copilot. Clean slate backgrounds, electric blue accents, and sophisticated typography that makes financial data feel trustworthy and clear.

### Why This Direction
- **Trust:** Blue is the universal color of trust, stability, and professionalism in finance
- **Clarity:** Neutral slate backgrounds eliminate color noise, letting financial data stand out
- **Differentiation:** Distinct from typical green/red finance apps (Robinhood) and overly minimal designs
- **Premium feel:** Matches the design language of top-tier fintech apps (Revolut, Linear)

---

## 2. Design Philosophy

### Core Principles

1. **Financial data is the hero** — UI elements exist to present money information clearly, not compete with it
2. **Trust through clarity** — Every design decision should increase user confidence in their financial data
3. **Depth without noise** — Use layered surfaces and subtle borders, not flat backgrounds or excessive shadows
4. **Generous whitespace** — Let the content breathe; finance data needs space to be parsed quickly
5. **Instant semantic recognition** — Green = money received, Red = money owed, Gray = settled. No ambiguity.

### Reference Apps
- **Revolut** — Dark glass surfaces, electric blue accents, minimal chrome
- **Linear** — Dark charcoal, subtle purple accents, crisp typography, micro-interactions
- **Copilot** — Warm amber accents, neumorphic elements, premium feel
- **YNAB** — High contrast, generous whitespace, clear data visualization

---

## 3. Color System

### 3.1 Dark Mode Palette

```typescript
// ═══════════════════════════════════════════════════════════════
// DARK MODE — Midnight Slate + Electric Blue
// ═══════════════════════════════════════════════════════════════

export const colorsDark = {
  // Backgrounds (neutral slate — NO green/blue cast)
  bgBase: '#0B0F14',      // App background — deepest slate
  bgCard: '#141B24',      // Card surfaces — elevated slate
  bgElevated: '#1C2633',  // Modals, bottom sheets — highest elevation
  bgHeaderStart: '#0D1117',
  bgHeaderEnd: '#0B0F14',

  // Surfaces
  surfacePrimary: '#141B24',
  surfaceSecondary: '#1C2633',
  surfaceHover: '#243040',
  surfacePressed: '#2D3B4F',
  surfaceActive: '#2D3B4F',

  // Text
  textPrimary: '#F1F5F9',           // Crisp white with blue tint
  textSecondary: 'rgba(148,163,184,0.70)',  // Muted slate
  textTertiary: 'rgba(148,163,184,0.40)',   // Disabled/hint text
  textInverse: '#0B0F14',           // Text on light backgrounds

  // Brand Accents
  accentPrimary: '#3B82F6',   // Electric Blue — primary actions, trust
  accentSecondary: '#06B6D4', // Cyan — secondary actions, links
  accentPurple: '#8B5CF6',   // Purple — Pro features, premium

  // Semantic — Financial States (unchanged — these are universal)
  debt: '#EF4444',    // Red — money owed TO others
  credit: '#22C55E',   // Green — money owed TO YOU
  settled: '#6B7280',  // Gray — settled/paid
  warning: '#F59E0B', // Amber — overdue, attention needed
  info: '#3B82F6',    // Blue — informational

  // Borders
  borderSubtle: '#1E2D3D',  // Card borders, dividers
  borderDefault: '#2D3F52', // Active borders, inputs
  borderActive: '#3B82F6',  // Focus states

  // Semantic aliases for Paper theme compatibility
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  onPrimary: '#FFFFFF',
  primaryContainer: '#1C2633',
  onPrimaryContainer: '#93C5FD',
  secondary: '#06B6D4',
  onSecondary: '#FFFFFF',
  tertiary: '#8B5CF6',
  onTertiary: '#FFFFFF',

  // Success/Credit
  success: '#22C55E',
  onSuccess: '#FFFFFF',
  successContainer: '#1C2633',
  onSuccessContainer: '#86EFAC',

  // Error/Debt
  error: '#EF4444',
  onError: '#FFFFFF',
  errorContainer: '#1C2633',
  onErrorContainer: '#FCA5A5',

  // Warning
  warningColor: '#F59E0B',
  onWarning: '#FFFFFF',

  // Overlay
  overlay: 'rgba(0,0,0,0.6)',
  overlayLight: 'rgba(0,0,0,0.3)',
  overlayMedium: 'rgba(0,0,0,0.5)',
  overlayDark: 'rgba(0,0,0,0.7)',

  // Utility
  white: '#F1F5F9',
  black: '#000000',
  transparent: 'transparent',
} as const;
```

### 3.2 Light Mode Palette

```typescript
// ═══════════════════════════════════════════════════════════════
// LIGHT MODE — Clean Slate + Rich Blue
// ═══════════════════════════════════════════════════════════════

export const colorsLight = {
  // Backgrounds
  bgBase: '#F8FAFC',      // Cool off-white
  bgCard: '#FFFFFF',       // Pure white cards
  bgElevated: '#F1F5F9',  // Subtle gray for elevation
  bgHeaderStart: '#FFFFFF',
  bgHeaderEnd: '#F8FAFC',

  // Surfaces
  surfacePrimary: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  surfaceHover: '#F1F5F9',
  surfacePressed: '#E2E8F0',
  surfaceActive: '#E2E8F0',

  // Text
  textPrimary: '#0F172A',           // Near-black slate
  textSecondary: 'rgba(15,23,42,0.60)',
  textTertiary: 'rgba(15,23,42,0.40)',
  textInverse: '#F8FAFC',

  // Brand Accents
  accentPrimary: '#2563EB',   // Rich blue — readable on white
  accentSecondary: '#0891B2', // Cyan — secondary
  accentPurple: '#7C3AED',    // Purple — Pro features

  // Semantic
  debt: '#DC2626',    // Darker red for contrast on white
  credit: '#16A34A',  // Darker green for contrast
  settled: '#6B7280',
  warning: '#D97706', // Darker amber
  info: '#2563EB',

  // Borders
  borderSubtle: '#E2E8F0',
  borderDefault: '#CBD5E1',
  borderActive: '#2563EB',

  // Semantic aliases
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  onPrimary: '#FFFFFF',
  primaryContainer: '#EFF6FF',
  onPrimaryContainer: '#1D4ED8',
  secondary: '#0891B2',
  onSecondary: '#FFFFFF',
  tertiary: '#7C3AED',
  onTertiary: '#FFFFFF',

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

  overlay: 'rgba(0,0,0,0.4)',
  overlayLight: 'rgba(0,0,0,0.05)',
  overlayMedium: 'rgba(0,0,0,0.1)',
  overlayDark: 'rgba(0,0,0,0.2)',

  white: '#FFFFFF',
  black: '#0F172A',
  transparent: 'transparent',
} as const;
```

### 3.3 Semantic Color Usage

| Context | Color | Usage |
|---------|-------|-------|
| Money owed TO you | `#22C55E` (credit) | Positive balance, amounts you receive |
| Money you OWE | `#EF4444` (debt) | Negative balance, amounts you pay |
| Settled/Paid | `#6B7280` (settled) | Zero balance, completed transactions |
| Overdue/Attention | `#F59E0B` (warning) | Due dates passed, pending reminders |
| Primary actions | `#3B82F6` (accentPrimary) | CTAs, navigation, active states |
| Pro features | `#8B5CF6` (accentPurple) | Upgrade prompts, premium features |
| Secondary actions | `#06B6D4` (accentSecondary) | Links, secondary buttons |

---

## 4. Typography

### 4.1 Font Stack

```typescript
export const typography = {
  fontFamily: {
    primary: 'Inter',           // Body text, UI labels, descriptions
    display: 'Space Grotesk',    // Headings, large numbers, amounts
    mono: 'JetBrains Mono',      // Currency amounts (tabular figures)
    fallback: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },

  sizes: {
    display: 36,    // Hero balances, main amounts
    h1: 28,        // Screen titles
    h2: 22,        // Section headers
    h3: 18,        // Card titles, group names
    bodyLg: 16,    // Primary body text
    body: 15,      // Default body (increased from 14)
    bodySm: 13,    // Secondary text, captions
    caption: 12,   // Labels, timestamps
    overline: 11,  // Section labels, badges
    button: 15,    // Button text (increased from 14)
    tab: 11,       // Tab bar labels
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
    overline: 0.08,   // Wider tracking for labels
    button: 0.02,
    tab: 0.02,
  },
} as const;
```

### 4.2 Amount Display (Financial Typography)

Currency amounts receive special typographic treatment:

```typescript
// Large hero balances (HomeScreen, FriendDetail)
balanceHero: {
  fontFamily: 'Space Grotesk',
  fontSize: 36,
  fontWeight: '700',
  letterSpacing: -0.02,
  fontVariant: ['tabular-nums'],
}

// Medium balances (summary tiles, cards)
balanceMedium: {
  fontFamily: 'Space Grotesk',
  fontSize: 24,
  fontWeight: '600',
  letterSpacing: -0.01,
  fontVariant: ['tabular-nums'],
}

// Small balances (list items, breakdown)
balanceSmall: {
  fontFamily: 'Space Grotesk',
  fontSize: 16,
  fontWeight: '600',
  letterSpacing: 0,
  fontVariant: ['tabular-nums'],
}

// Positive/Negative prefixes
amountPrefix: {
  fontFamily: 'Inter',
  fontSize: 16,
  fontWeight: '500',
  // + or - character, same color as amount
}

// Currency symbol
currencySymbol: {
  fontFamily: 'Inter',
  fontSize: 18,
  fontWeight: '500',
  opacity: 0.7,  // Subtle — the number is the data
}
```

### 4.3 Font Loading Instructions

Add to `react-native.config.js`:

```javascript
module.exports = {
  assets: ['./node_modules/@font-inter/inter.css',
           './node_modules/@font-space-grotesk/space-grotesk.css',
           './node_modules/@font-jetbrainsmono/jetbrains-mono.css'],
};
```

Fonts to install:
- Inter: `npm install @expo-google-fonts/inter` or download from fonts.google.com
- Space Grotesk: `npm install @expo-google-fonts/space-grotesk`
- JetBrains Mono: `npm install @expo-google-fonts/jetbrains-mono`

---

## 5. Spacing & Layout

### 5.1 Spacing Scale

```typescript
export const spacing = {
  1: 4,   // Tight internal spacing
  2: 8,   // Icon-to-text gaps, tight lists
  3: 12,  // Input padding, compact rows
  4: 16,  // Standard padding (increased from 16)
  5: 20,  // Card padding (NEW)
  6: 24,  // Section gaps (increased from 24)
  7: 28,  // Large section gaps (NEW)
  8: 32,  // Screen margins, major sections
  10: 40, // Hero spacing
  12: 48, // Maximum gaps
  16: 64, // Bottom safe area padding
} as const;
```

### 5.2 Border Radius

```typescript
export const radius = {
  sm: 6,      // Small inputs, chips
  md: 10,     // Buttons, inputs (increased from 8)
  lg: 14,     // Cards, list items (increased from 10)
  xl: 16,     // Summary cards (increased from 12)
  '2xl': 20,  // Modals (increased from 16)
  '3xl': 24,  // Bottom sheets
  full: 9999, // Pills, avatars
} as const;
```

### 5.3 Screen Layout Standards

```typescript
// Screen container
screenContainer: {
  paddingHorizontal: 20,  // More breathing room than 16
  paddingBottom: 140,     // FAB clearance
}

// Card (standard)
card: {
  padding: 20,            // Increased from 16
  borderRadius: 14,       // Increased from 12
  marginBottom: 16,
  borderWidth: 1,
  borderColor: borderSubtle,
}

// Card (elevated/summary)
cardElevated: {
  padding: 20,
  borderRadius: 16,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: borderDefault,
}

// Section spacing
sectionGap: 24,           // Between major sections
subsectionGap: 16,         // Within sections

// List item
listItem: {
  paddingVertical: 14,     // Increased from default
  paddingHorizontal: 16,
  borderRadius: 12,
  gap: 12,                 // Between elements
}

// Modal
modal: {
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  padding: 24,
}
```

### 5.4 Safe Area & Tab Bar Offsets

```typescript
export const layout = {
  screenPaddingHorizontal: 20,
  screenPaddingBottom: 140,    // 64 (tab bar) + 56 (FAB clearance) + 20 (buffer)

  tabBarHeight: 64,
  tabBarFloatOffset: 80,       // For FAB positioning below floating tab bar

  headerHeight: 56,
  headerBlurHeight: 120,        // For hero sections with blur

  fabSize: 56,
  fabRadius: 16,
  fabBottomOffset: 16,
  fabRightOffset: 16,
};
```

---

## 6. Components

### 6.1 Cards

#### Standard Card
```typescript
const CardStyles = {
  backgroundColor: surfacePrimary,
  borderWidth: 1,
  borderColor: borderSubtle,
  borderRadius: radius.lg, // 14px
  padding: spacing[5],    // 20px
  marginBottom: spacing[4], // 16px
};
```

#### Elevated Card (Modals, Bottom Sheets)
```typescript
const ElevatedCardStyles = {
  backgroundColor: bgElevated,
  borderWidth: 1,
  borderColor: borderDefault,
  borderRadius: radius['2xl'], // 20px
  padding: spacing[6],        // 24px
  // Platform shadow
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 24,
    },
    android: {
      elevation: 8,
    },
  }),
};
```

#### Hero Card (Dashboard Summary)
```typescript
const HeroCardStyles = {
  backgroundColor: bgCard,
  borderWidth: 1,
  borderColor: 'rgba(59,130,246,0.15)', // Subtle blue border
  borderRadius: radius.xl, // 16px
  padding: 24,
  // Gradient overlay (optional)
  backgroundGradient: [
    'rgba(59,130,246,0.06)',
    'transparent',
  ],
};
```

### 6.2 Buttons

#### Primary Button
```typescript
const PrimaryButtonStyles = {
  backgroundColor: accentPrimary,    // #3B82F6
  color: white,
  borderRadius: radius.md,           // 10px
  paddingVertical: spacing[3],        // 12px
  paddingHorizontal: spacing[5],     // 20px
  fontFamily: 'Inter',
  fontSize: typography.sizes.button,  // 15px
  fontWeight: typography.weights.semibold,
  letterSpacing: 0.02,
  height: 48,                         // Standard touch target
  // Glow effect (optional)
  boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
};
```

#### Secondary/Ghost Button
```typescript
const GhostButtonStyles = {
  backgroundColor: transparent,
  borderWidth: 1,
  borderColor: borderDefault,
  borderRadius: radius.md,
  paddingVertical: spacing[3],
  paddingHorizontal: spacing[5],
  color: textSecondary,
  fontSize: typography.sizes.button,
  fontWeight: typography.weights.medium,
  height: 48,
};
```

#### FAB (Floating Action Button)
```typescript
const PrimaryFABStyles = {
  backgroundColor: accentPrimary,    // Electric blue
  borderRadius: radius.xl,           // 16px (pill shape)
  width: undefined,                    // Auto-width with label
  height: 56,                          // Taller than standard FAB
  paddingHorizontal: 24,
  iconSize: 24,
  iconColor: white,
  label: {
    color: white,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
};

const SecondaryFABStyles = {
  backgroundColor: transparent,
  borderWidth: 1,
  borderColor: borderDefault,
  borderRadius: radius.xl,
  width: 56,                          // Square for icon-only
  height: 56,
  iconColor: textSecondary,           // #64748B
};
```

### 6.3 Inputs

```typescript
const InputStyles = {
  backgroundColor: bgElevated,
  borderWidth: 1,
  borderColor: borderSubtle,
  borderRadius: radius.md,            // 10px
  paddingVertical: 14,                // Comfortable touch target
  paddingHorizontal: 16,
  color: textPrimary,
  fontSize: 16,
  fontFamily: 'Inter',
  placeholderColor: textTertiary,

  // Focus state
  focused: {
    borderColor: accentPrimary,
    borderWidth: 2,
  },

  // Error state
  error: {
    borderColor: error,
  },
};
```

### 6.4 Tab Bar (LiquidGlassTabBar Update)

```typescript
const TabBarStyles = {
  // Glass container
  pillBg: 'rgba(20, 27, 36, 0.82)',   // Slate-tinted glass (not green)
  pillBorder: 'rgba(255, 255, 255, 0.12)',
  pillRadius: 9999,

  // Active tab bubble
  bubbleBg: 'rgba(59, 130, 246, 0.15)',
  bubbleBorder: 'rgba(59, 130, 246, 0.25)',

  // Icon colors
  activeIcon: accentPrimary,          // #3B82F6
  inactiveIcon: textTertiary,         // #64748B

  // Label colors
  activeLabel: accentPrimary,
  inactiveLabel: textSecondary,

  // Gradient sheen (iOS)
  gradientColors: [
    'rgba(255,255,255,0.06)',
    'rgba(255,255,255,0.01)',
    'rgba(0,0,0,0.04)',
  ],
};
```

### 6.5 Avatars

```typescript
const AvatarStyles = {
  size: {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    xxl: 96,         // Profile screens
  },
  borderRadius: 'full',

  // Active/selected state (glow)
  glowActive: {
    borderWidth: 2,
    borderColor: accentPrimary,
    boxShadow: `0 0 0 2px ${accentPrimary}40, 0 0 16px rgba(59,130,246,0.3)`,
  },

  // Default placeholder
  placeholderBg: bgElevated,
  placeholderText: textSecondary,
};
```

### 6.6 Chips & Badges

```typescript
const ChipStyles = {
  // Filter chip (inactive)
  chip: {
    backgroundColor: transparent,
    borderWidth: 1,
    borderColor: borderDefault,
    borderRadius: radius.full,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    height: 36,
    fontSize: 13,
    fontWeight: '500',
  },

  // Filter chip (active/selected)
  chipActive: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderColor: accentPrimary,
    color: accentPrimary,
  },

  // Status badge
  badge: {
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 11,
    fontWeight: '600',
  },
};
```

### 6.7 List Items

```typescript
const ListItemStyles = {
  container: {
    backgroundColor: surfacePrimary,
    borderRadius: radius.lg,         // 14px
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: spacing[2],        // 8px gap between items
  },

  // Icon container (left)
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${iconColor}18`, // 18% opacity
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: borderSubtle,
    marginLeft: 16,
  },
};
```

---

## 7. Screen-by-Screen Specifications

### 7.1 HomeScreen (Dashboard)

#### Hero Section
```
┌─────────────────────────────────────────────────────────────┐
│  Good morning, [Name] 👋                                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  OVERALL BALANCE                                    │     │
│  │  +₹2,450.00  ← Space Grotesk, 36px, green          │     │
│  │  You are owed                                        │     │
│  │                                                       │     │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐           │     │
│  │  │ You owe   │ │ Owed to   │ │ Net       │           │     │
│  │  │ ₹850      │ │ ₹3,300    │ │ +₹2,450   │           │     │
│  │  └───────────┘ └───────────┘ └───────────┘           │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  This Month         📊                              │     │
│  │  ₹4,320              View analytics →               │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  Recent Activity                                            │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  🧾 Dinner at restaurant    +₹850    2h ago          │     │
│  │  ─────────────────────────────────────────────────  │     │
│  │  💰 Settled with Rahul    ₹1,200    5h ago         │     │
│  │  ─────────────────────────────────────────────────  │     │
│  │  👥 Added to Trip Group    —       1d ago          │     │
│  └─────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

**Design specs:**
- Hero card: `bgCard` background, `rgba(59,130,246,0.15)` border, `borderRadius: 16px`
- Balance amount: `Space Grotesk`, 36px, `font-weight: 700`, tabular-nums
- Summary tiles: 3-column grid with colored top border (red/green/blue)
- Analytics card: Surface with blue icon tint
- Activity list: List items with icon boxes

### 7.2 GroupsScreen

```
┌─────────────────────────────────────────────────────────────┐
│  Groups                                      🔍  ➕         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  3 Active · 2 Settled          Total: +₹2,450     │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ACTIVE BALANCES                                            │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ ▌ Trip to Goa                    ▸ +₹1,200        │     │
│  │   4 members · You lent ₹850                          │     │
│  └─────────────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ ▌ Apartment Rent                  ▸ -₹425         │     │
│  │   2 members · You owe ₹425                           │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  [+ Add Group]                                              │
└─────────────────────────────────────────────────────────────┘
```

**Design specs:**
- Summary bar: Hero card style with net balance
- Group rows: Cards with 4px left colored border (group color)
- Balance labels: Green for positive, red for negative
- Section labels: Uppercase, `letterSpacing: 0.08`, `font-size: 11`, muted color
- Empty state: Centered illustration + text + CTA button

### 7.3 FriendsScreen

```
┌─────────────────────────────────────────────────────────────┐
│  Friends                          🔍   🔔   📷              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  You're owed                    You owe             │   │
│  │  ₹3,300                         ₹850                │   │
│  │  +₹2,450 net                    across 5 friends    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  😊 Rahul Sharma                                     │   │
│  │     +₹850  ·  Owes you in Trip to Goa              │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  😊 Priya Patel                                      │   │
│  │     -₹425  ·  You owe in Apartment Rent             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│                                     [+ Add] [📷]            │
└─────────────────────────────────────────────────────────────┘
```

**Design specs:**
- Summary card: 3-column layout, colored by sentiment
- Friend rows: Clean cards, avatar left, balance right
- Breakdown lines: Max 2 visible, "Plus N more" link
- FABs: Blue pill FAB + outlined circular FAB

### 7.4 ActivityScreen

```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐   │
│  │  This Month    │  Expenses    │  Net                │   │
│  │  ₹4,320        │  12          │  +₹2,450           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  [ All ] [ Expenses ] [ Bills ] [ Settlements ]            │
│                                                              │
│  ─── Today ───                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🧾  Dinner at Restaurant                             │   │
│  │      You paid · Split with 3      +₹850      2:30PM │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💰  Settled with Rahul                              │   │
│  │      Cash exchange               ₹1,200      11:00AM│   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Design specs:**
- Analytics banner: Dark glass with blue accents
- Filter chips: Horizontal scroll, blue tint when active
- Activity rows: Icon box with 18% opacity background
- Date separators: Section headers with horizontal lines

### 7.5 GroupDetailScreen

```
┌─────────────────────────────────────────────────────────────┐
│  ←  Trip to Goa                         ⚙️  ⋮              │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Total Expenses     Your Balance      Members       │   │
│  │  ₹12,450           +₹850            4             │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│  │  ▌ Rahul Sharma          ▸  owes you ₹425        │   │
│  │  ▌ Priya Patel           ▸  you owe ₹275        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  [+ Add Expense]  [ Settle Up ]                              │
│                                                              │
│  ─── May 2026 ───                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🧾  Dinner at Restaurant                             │   │
│  │      You paid ₹850 · Split equally    +₹425    2d   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🛒  Groceries                                        │   │
│  │      Priya paid ₹600 · Custom split    -₹200   5d   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ─── April 2026 ───                                          │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

**Design specs:**
- Header: Group name, color indicator, settings icon
- Balance card: Dark glass, 3-column stats
- Member balances: List with colored indicators
- Expense rows: Date grouped, icon + description + amount

### 7.6 FriendDetailScreen

```
┌─────────────────────────────────────────────────────────────┐
│  ←        Geometric Banner (slate tint)          ⚙️         │
│                                                              │
│              ┌─────────┐                                     │
│              │   RS    │  ← 96px avatar, border ring        │
│              └─────────┘                                     │
│                                                              │
│               Rahul Sharma                                   │
│               +₹850.00                                       │
│               owes you                                       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Owes you ₹850 in Trip to Goa                       │   │
│  │  You owe ₹425 in Apartment Rent                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  [ Settle Up ]  [ Remind ]  [ Charts ]                       │
│                                                              │
│  DIRECT TRANSACTIONS                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🧾 Dinner · You paid · 2 days ago       +₹425       │   │
│  │ 🛒 Groceries · They paid · 5 days ago   -₹200     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│                                     [+ Add] [📷]             │
└─────────────────────────────────────────────────────────────┘
```

**Design specs:**
- Geometric banner: Slate-tinted shapes (no green)
- Avatar: 96px, white border ring, centered overlapping banner
- Balance: Large Space Grotesk number, colored by sentiment
- Action buttons: Primary (Settle), Ghost (Remind), Ghost (Charts)
- Transaction list: Compact rows with net effect per transaction

---

## 8. Icons & Visual Language

### 8.1 Icon System

```typescript
const iconSystem = {
  // Primary navigation icons (filled, bold)
  navigation: {
    library: 'Ionicons', // or custom SVG set
    size: 24,
    weight: 'filled',
    color: accentPrimary, // When active
    inactiveColor: textSecondary,
  },

  // Action icons (outlined, 1.5px stroke)
  action: {
    library: 'MaterialCommunityIcons',
    size: 24,
    weight: 'outline',
    color: textSecondary,
  },

  // Status icons (duotone — brand color + white)
  status: {
    size: 20,
    style: 'duotone', // Two-color treatment
    colors: {
      positive: 'credit + white',
      negative: 'debt + white',
      neutral: 'textSecondary + white',
    },
  },

  // Category icons (for expenses)
  category: {
    size: 24,
    style: 'filled',
    background: `${color}18`, // 18% opacity color background
  },
};
```

### 8.2 Icon Color Mapping

| Icon Type | Active | Inactive |
|-----------|--------|----------|
| Navigation (tabs) | `#3B82F6` | `#64748B` |
| Action (buttons) | `#3B82F6` | `#94A3B8` |
| Status positive | `#22C55E` | — |
| Status negative | `#EF4444` | — |
| Status neutral | `#6B7280` | — |
| Category icons | Category color | `#64748B` |

### 8.3 Category Icon Colors

```typescript
const categoryColors: Record<string, string> = {
  food: '#F59E0B',      // Amber — dining
  transport: '#3B82F6',  // Blue — travel
  utilities: '#6B7280',  // Gray — bills
  entertainment: '#8B5CF6', // Purple — fun
  shopping: '#EC4899',   // Pink — retail
  health: '#22C55E',     // Green — wellness
  housing: '#06B6D4',   // Cyan — home
  other: '#64748B',      // Gray — misc
};
```

### 8.4 Illustration Style (Empty States)

For empty states and onboarding:
- **Style:** Abstract geometric shapes with brand gradient fills
- **Colors:** Max 3 colors from brand palette
- **Character style:** Rounded, friendly (if applicable)
- **No harsh outlines** — soft, approachable feel
- **Recommended:** 200x200px max, SVG format

---

## 9. Dark Mode

Dark mode is the **primary** experience. The dark palette (Section 3.1) is the full specification.

### 9.1 Implementation Requirements

1. **No green-tinted backgrounds** — Slate base with blue accent only
2. **Depth through layers** — `bgBase` < `bgCard` < `bgElevated` creates natural depth
3. **Subtle borders** — 1px borders define surfaces without heavy shadows
4. **Glow effects** — Use sparingly on active states (selected tabs, avatars)
5. **Text hierarchy** — Three levels: `#F1F5F9` / `rgba(148,163,184,0.70)` / `rgba(148,163,184,0.40)`

### 9.2 Glass Effect Specifications

```typescript
const glassEffect = {
  // Standard glass (tab bar, cards)
  standard: {
    backgroundColor: 'rgba(20, 27, 36, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(20px)', // iOS only
  },

  // Heavy glass (modals, bottom sheets)
  heavy: {
    backgroundColor: 'rgba(28, 38, 51, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(40px)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 32,
  },

  // Gradient sheen (for glass surfaces)
  sheen: {
    colors: [
      'rgba(255,255,255,0.06)',
      'rgba(255,255,255,0.01)',
      'rgba(0,0,0,0.02)',
    ],
    locations: [0, 0.5, 1],
  },
};
```

---

## 10. Light Mode

Light mode is the **secondary** experience but should be fully supported.

### 10.1 Key Differences from Dark Mode

| Element | Dark Mode | Light Mode |
|---------|-----------|------------|
| Background | `#0B0F14` (slate) | `#F8FAFC` (cool white) |
| Cards | `#141B24` | `#FFFFFF` |
| Text | `#F1F5F9` | `#0F172A` |
| Primary accent | `#3B82F6` | `#2563EB` |
| Borders | `#1E2D3D` | `#E2E8F0` |
| Shadows | Subtle dark | Subtle light |
| Card elevation | Border-based | Shadow-based |

### 10.2 Light Mode Card Shadows

```typescript
const lightModeShadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },

  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  fab: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
};
```

---

## 11. Animation & Interaction

### 11.1 Micro-interactions

```typescript
const microInteractions = {
  // Button press
  buttonPress: {
    scale: 0.97,
    duration: 100,
    easing: 'ease-out',
  },

  // Card tap
  cardPress: {
    scale: 0.99,
    opacity: 0.9,
    duration: 150,
  },

  // Tab switch (already implemented in LiquidGlassTabBar)
  tabSwitch: {
    spring: {
      damping: 15,
      stiffness: 120,
      mass: 0.8,
    },
  },

  // FAB appear
  fabAppear: {
    scale: [0, 1],
    duration: 300,
    easing: 'spring',
  },
};
```

### 11.2 Transition Guidelines

- **Screen transitions:** Default React Navigation (slide from right)
- **Modal presentations:** Slide from bottom, 300ms
- **List item loading:** Skeleton shimmer (optional)
- **Balance changes:** Number morphing animation (optional polish)

### 11.3 Haptic Feedback

Maintain current haptic implementation:
- Tab bar switches: `impactLight`
- Button presses: `impactLight`
- Success actions: `notificationSuccess`
- Error states: `notificationError`

---

## 12. Implementation Phases

### Phase 1: Color System Foundation ⭐
**Files:** `src/theme/tokens.ts`
**Effort:** 1-2 days
**Changes:**
- Replace all dark mode colors (slate base, no green tint)
- Update light mode palette
- Add new semantic color tokens
- Update Paper theme compatibility layer

### Phase 2: Typography Upgrade
**Files:** `src/theme/tokens.ts`, `App.tsx` (font loading)
**Effort:** 1 day
**Changes:**
- Add Inter, Space Grotesk, JetBrains Mono fonts
- Update typography scale in tokens
- Apply financial typography styles
- Update all amount displays

### Phase 3: Component Refinement
**Files:** All component files
**Effort:** 2-3 days
**Changes:**
- Update card styles (radius, borders, shadows)
- Update button styles (radius, padding, shadows)
- Refine FAB designs (pill shape, glow)
- Update input styles
- Polish tab bar colors

### Phase 4: Screen-by-Screen Polish
**Files:** All screen files
**Effort:** 2-3 days
**Changes:**
- Redesign HomeScreen hero section
- Update GroupsScreen cards
- Redesign FriendsScreen summary
- Polish ActivityScreen analytics
- Update GroupDetail/FriendDetail headers

### Phase 5: Icon & Visual Polish
**Files:** Navigation, icons, empty states
**Effort:** 1 day
**Changes:**
- Verify icon color mapping
- Create/update empty state illustrations
- Polish category icon colors
- Add any missing visual assets

---

## Appendix A: Migration Checklist

- [ ] Update `tokens.ts` with new color system
- [ ] Add new fonts to `react-native.config.js`
- [ ] Update `ThemeContext.tsx` for new palette
- [ ] Update `paperTheme.ts` for new colors
- [ ] Refactor all screens for new spacing
- [ ] Update card border-radius values
- [ ] Update button styles
- [ ] Update FAB designs
- [ ] Verify dark mode throughout
- [ ] Verify light mode throughout
- [ ] Test accessibility (contrast ratios)
- [ ] Update any hardcoded color references

---

## Appendix B: Reference Colors Summary

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| `accentPrimary` | `#3B82F6` | `#2563EB` | Primary actions |
| `bgBase` | `#0B0F14` | `#F8FAFC` | App background |
| `bgCard` | `#141B24` | `#FFFFFF` | Card surfaces |
| `textPrimary` | `#F1F5F9` | `#0F172A` | Main text |
| `textSecondary` | `#94A3B8` | `#64748B` | Secondary text |
| `debt` | `#EF4444` | `#DC2626` | Money owed |
| `credit` | `#22C55E` | `#16A34A` | Money received |
| `borderSubtle` | `#1E2D3D` | `#E2E8F0` | Dividers |
| `accentPurple` | `#8B5CF6` | `#7C3AED` | Pro features |

---

*Document Version: 1.0*
*Last Updated: May 2026*
*Status: Approved for Implementation*
