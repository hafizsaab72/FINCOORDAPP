# OnTheTab Design System

**Date:** 2026-05-26
**Project:** OnTheTab React Native App
**Status:** Green/Dark Theme — v2 (implemented)

The canonical token source is `src/theme/tokens.ts`. This document is a human-readable reference.

---

## Logo Assets

All logo files are transparent PNGs (800×800 canvas, wide horizontal content ~4.7:1 aspect ratio).

| File | Path | Usage |
|------|------|-------|
| `logo-primary.png` | `src/assets/images/logos/logo-primary.png` | Default logo — full color, used on WelcomeScreen |
| `logo-color.png` | `src/assets/images/logos/logo-color.png` | Alternate color variant |
| `logo-grayscale.png` | `src/assets/images/logos/logo-grayscale.png` | Light mode / muted contexts |
| `logo-grayscale-dark.png` | `src/assets/images/logos/logo-grayscale-dark.png` | Dark mode / muted contexts |

**Import pattern:**
```ts
import { Images } from '../constants/images';
<Image source={Images.logos.primary} style={{ width: 240, height: 52 }} resizeMode="contain" />
```

### WelcomeScreen Logo Placement
- Width: 240px (maintains aspect ratio via `resizeMode: 'contain'`)
- Positioned vertically centered above the "Keep tabs, not grudges." subtitle
- Background: dark gradient (`#0A0A0A` → `#0F1C18`)

---

## Color Tokens

### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| bg-base | `#080F0A` | App background (deep green-black) |
| bg-card | `#0F1A12` | Card surfaces |
| bg-elevated | `#162019` | Secondary/elevated surfaces |
| bg-header-start | `#0A1F0E` | Header gradient start |
| bg-header-end | `#080F0A` | Header gradient end |

### Surfaces
| Token | Hex | Usage |
|-------|-----|-------|
| surface-primary | `#0F1A12` | Primary card background |
| surface-secondary | `#162019` | Elevated/secondary surfaces |
| surface-hover | `#1A2E1C` | Hover states |
| surface-pressed | `#1E3A20` | Pressed/active states |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| text-primary | `#F0FDF4` | Primary text, headings |
| text-secondary | `rgba(134,239,172,0.60)` | Secondary text (mint-400 at 60%) |
| text-tertiary | `rgba(240,253,244,0.30)` | Tertiary/muted text |
| text-inverse | `#080F0A` | Text on light backgrounds |

### Accents
| Token | Hex | Usage |
|-------|-----|-------|
| accent-primary | `#22C55E` | Primary accent (green-500) — CTAs, active states |
| accent-secondary | `#155dfc` | Secondary accent (blue) — links, info actions |
| accent-purple | `#8B5CF6` | Purple accents, group avatar variety |

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| debt | `#F87171` | Red-400 — amounts user owes |
| credit | `#4ADE80` | Green-400 — amounts owed to user |
| settled | `#10B981` | Emerald-500 — settled up state |
| warning | `#F59E0B` | Amber — warnings, reminders |
| info | `#3B82F6` | Blue — info states |

### Borders
| Token | Hex | Usage |
|-------|-----|-------|
| border-subtle | `#1A2E1C` | Subtle card borders |
| border-default | `#1E3A20` | Default borders |
| border-active | `#22C55E` | Active/focused borders |

### Light Mode (optional toggle)
| Token | Hex | Usage |
|-------|-----|-------|
| bg-base | `#F0FDF4` | Light app background (green-50) |
| surface-primary | `#FFFFFF` | Light card background |
| text-primary | `#0F1A12` | Light primary text |
| accent-primary | `#16A34A` | Light mode primary (green-600) |

---

## Typography

### Font Family
- Primary: Inter (fallback to system sans-serif)

### Type Scale
| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| display | 36px | 700 | 40px | -0.02em | Large hero numbers |
| h1 | 28px | 700 | 32px | -0.01em | Screen titles |
| h2 | 22px | 600 | 28px | 0 | Section headers |
| h3 | 18px | 600 | 24px | 0 | Card titles |
| body-lg | 16px | 400 | 24px | 0 | Primary body text |
| body | 14px | 400 | 20px | 0 | Default body text |
| body-sm | 13px | 400 | 18px | 0 | Secondary body |
| caption | 12px | 500 | 16px | 0.01em | Labels, captions |
| overline | 11px | 600 | 16px | 0.05em | All-caps labels |
| button | 14px | 600 | 20px | 0.01em | Button text |
| tab | 11px | 600 | 16px | 0 | Tab labels |

---

## Spacing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| space-1 | 4px | Tight gaps |
| space-2 | 8px | Small gaps |
| space-3 | 12px | Standard gap |
| space-4 | 16px | Default padding |
| space-5 | 20px | Medium padding |
| space-6 | 24px | Section padding |
| space-8 | 32px | Large padding |
| space-10 | 40px | XL padding |
| space-12 | 48px | XXL padding |

---

## Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| radius-sm | 6px | Small elements, chips |
| radius-md | 8px | Buttons, inputs |
| radius-lg | 10px | Cards |
| radius-xl | 12px | Large cards, modals |
| radius-2xl | 16px | Bottom sheets |
| radius-full | 9999px | Pills, avatars |

---

## Shadow Tokens

| Token | Value | Usage |
|-------|-------|-------|
| shadow-sm | `0 1px 2px rgba(0,0,0,0.3)` | Subtle elevation |
| shadow-md | `0 4px 6px rgba(0,0,0,0.4)` | Card elevation |
| shadow-lg | `0 10px 15px rgba(0,0,0,0.5)` | Modal elevation |
| shadow-glow | `0 0 24px rgba(34,197,94,0.35)` | Primary glow (CTA) |
| shadow-glow-purple | `0 0 20px rgba(139,92,246,0.3)` | Purple glow (group avatar) |

---

## Component Specs

### Card
- Background: `#0F1A12`
- Border: 1px solid `#1A2E1C`
- Border-radius: 10px (radius-lg)
- Padding: 16px (space-4)

### Button (Primary)
- Background: `#22C55E`
- Text: `#F0FDF4`
- Border-radius: 8px (radius-md)
- Padding: 12px 20px
- Font: button token (14px/600)
- Shadow: shadow-glow on hover/active

### Button (Ghost)
- Background: transparent
- Border: 1px solid `#1E3A20`
- Text: `rgba(134,239,172,0.60)`
- Border-radius: 8px

### Input
- Background: `#162019`
- Border: 1px solid `#1A2E1C`
- Border-radius: 8px
- Text: `#F0FDF4`
- Placeholder: `rgba(240,253,244,0.30)`
- Focus border: `#22C55E`

### Avatar
- Group avatar: green-500 circle with glow shadow
- Size: 48px (large), 40px (medium), 32px (small)

### Bottom Navigation
- Background: `#080F0A`
- Active: `#22C55E`
- Inactive: `rgba(134,239,172,0.60)`
- Height: 64px + safe area
- 5 tabs: Home, Friends, Groups, Activity, Account

---

## Screen Design References

### Screen 1 — Group Detail (Settled)
- Header: gradient `#0A1F0E` → `#080F0A`
- Back arrow + settings gear
- Group avatar: green-500 circle, green glow
- Settled banner: green left accent bar, checkmark, "You are settled up"
- Action pills: "Settle Up" (red), "Charts", "Balances", "Simplify" (ghost)
- Recent Expenses: category icons, expense name, payer info, total, user's share
- Bottom CTA: "Add Expense" green button with glow

### Screen 2 — Add Expense (Group)
- Full-screen form (not modal)
- Top bar: back arrow, "Add an Expense", Save
- Group pill: "With you and: {Group} · {n} people"
- Description: receipt icon + "What was this for?"
- Amount: currency selector + large input, green underline
- Split section: method selector (Equal / Exact / Percentage / Shares / Adjustment)
- Paid By: single or multiple payer mode with amount inputs
- Participants: toggle list with self-exclusion support
- Bottom: Date picker, Category picker, Notes

### Screen 3 — Add Expense (No Group)
- Same as Screen 2 but no group pre-selected
- Participant input: friend selector for non-group expenses

### Screen 4 — Group Detail (With Balances)
- Same header as Screen 1
- Floating balance card overlapping header
- Per-member balance rows: green "you lent", red "you owe"
- Date-grouped expense list

---

## Currency
- Default: USD ($)
- Symbol position: prefix
- Format: $X,XXX.XX
- Backend stores in minor units (cents)

---

## Animation Specs
- Card press: scale 0.98, 100ms
- Button press: opacity 0.8, 100ms
- Tab switch: fade 150ms
- Screen transition: native stack default
