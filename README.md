# FinCoord — Financial Coordination App

FinCoord is a React Native application for shared expense management, bill tracking, and friend-based financial coordination. It bridges a ledger and a reminder engine around three core pillars: **What I owe**, **What I am owed**, and **What is due next**.

---

## Features

### Authentication
- **Email + Password** — Register and sign in with email/password.
- **Phone OTP** — Sign in via Firebase Phone Auth. Country picker (flag + dial code) handles E.164 formatting automatically.
- **Guest Mode** — Try the app without creating an account.
- **Session Persistence** — JWT tokens persist across launches; app reopens to last state.
- **Phone → Email upgrade** — Phone-only users can add an email and password from the Profile screen.

### FinCoord Pro
- `<ProGate>` component locks Pro features with a blurred upgrade prompt.
- Upgrade screen listing Pro benefits; "Upgrade" enables Pro locally (RevenueCat ready).
- Pro badge in Settings with crown icon.

### Spending Analytics *(Pro)*
- Bar chart: monthly spending over the last 6 months.
- Donut chart: spending breakdown by category.
- Top payers per group.
- Free users see summary cards; charts are Pro-gated.

### Expense Search
- Full-text search across expenses and bills.
- Filter by amount range and category; sort by newest, oldest, or highest amount.

### Data Export *(Pro)*
- Export all expenses and bills to CSV via the native share sheet.

### Receipt OCR
- Scan a receipt from AddExpenseModal; backend runs Tesseract.js OCR to extract amount, merchant, and date.
- Auto-fills the expense form; falls back gracefully if parsing fails.

### Real-Time Currency Conversion
- Live exchange rates from ExchangeRate-API, cached 24 h in Zustand.
- AddExpenseModal shows "≈ X [home currency]" as you type.

### Default Split Templates
- Save a default split method per group. AddExpenseModal pre-fills it automatically.

### Push Notifications
- Firebase Cloud Messaging (Android) + APNs (iOS).
- Foreground and background handlers via `@react-native-firebase/messaging` + `@notifee/react-native`.
- Notifications sent on: friend request received, friend request accepted.
- FCM device token registered to backend on login.

### Friends & Invites
- Search users by name/phone/email.
- Send, accept, and reject friend requests with push notifications.
- Invite via WhatsApp, SMS, or share sheet (`fincoord://invite?ref=<userId>`).

### Shared Ledger
- Group expenses with Equal, Percentage, or Custom split logic.
- Balance summaries per group.

### Bills & Reminders
- Track one-time and recurring bills (pending / handled / overdue).
- Bill detail view with mark-as-handled action.

### Multi-Currency
- 14 currencies selectable from Settings, synced to/from the backend.

### UI & UX
- **Green-First MD3 theme**: `#0F7A5B` (Light) / `#19A874` (Dark). Dark mode system-synced and toggleable.
- Country picker component: flag emoji + dial code + searchable modal sheet; used on auth and profile screens.
- Fully scrollable screens with keyboard-avoidance on iOS and Android.
- Custom app icon (v3): bold white "F" on green gradient. Custom splash screen on both platforms.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.84 (New Architecture / Fabric) + TypeScript |
| Navigation | React Navigation v7 (Stack + Bottom Tabs) |
| UI | React Native Paper v5 (MD3) + Vector Icons |
| State | Zustand v5 + AsyncStorage (offline-first) |
| Auth (client) | `@react-native-firebase/auth` (Phone OTP) |
| Push | `@react-native-firebase/messaging` + `@notifee/react-native` |
| Charts | `react-native-gifted-charts` |
| Image Picker | `react-native-image-picker` |
| Backend | FinCoordAPI (Express + MongoDB Atlas) |

---

## Project Structure

```
src/
├── components/     CountryCodePicker, ProGate
├── constants/      paperTheme.ts, config.ts (API base URL)
├── context/        ThemeContext — useAppTheme(), toggleTheme()
├── navigation/     RootNavigator (stack + modals), AppNavigator (bottom tabs)
├── screens/        Home, Groups, GroupDetail, Bills, BillDetail, Reminders,
│                   Friends, Invite, Activity, Analytics, Search, Settings,
│                   Profile, Upgrade, SignIn, SignUp, Welcome,
│                   AddExpenseModal, AddBillModal, CreateGroupModal
├── services/       api, authService, currencyService, notificationService, friendsService
├── store/          useStore.ts — Zustand store with balance hooks
├── types/          index.ts — Expense, Bill, Group, ActivityEntry, CurrentUser, SplitTemplate
└── utils/          countries, exportData, notifications
```

---

## Getting Started

```bash
npm install
cd ios && pod install && cd ..   # iOS only

npx react-native run-android
npx react-native run-ios
```

### Firebase Setup (Phone Auth + Push Notifications)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Phone** sign-in under Authentication.
3. **Android** — Add Android app (package `com.fincoordapp`) → download `google-services.json` → place at `android/app/google-services.json`.
4. **iOS** — Add iOS app → download `GoogleService-Info.plist` → place at `ios/FinCoordApp/GoogleService-Info.plist`.
5. Upgrade Firebase project to **Blaze plan** (required for Phone Auth in production).
6. **Testing without billing** — Add test numbers in Firebase Console → Authentication → Phone → *Phone numbers for testing* (e.g. `+91 9999999999` / OTP `123456`).

---

## Backend

This app connects to **FinCoordAPI** (see companion repo). The API base URL is set in `src/constants/config.ts`:

```ts
// Android emulator: 10.0.2.2 → host machine localhost
// iOS simulator:    localhost
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_URL = `http://${HOST}:3000/api`;
```

```bash
cd ../FinCoordAPI && npm run dev
```

---

## Deep Links

| URL | Destination |
|---|---|
| `fincoord://invite?ref=<userId>` | InviteScreen — add friend from invite link |

---

## Theme Tokens

| Token | Light | Dark |
|---|---|---|
| Primary | `#0F7A5B` | `#19A874` |
| Background | `#FFFFFF` | `#121212` |
| Surface | `#F5FBF8` | `#1A1A1A` |
| Border | `#C9E6D9` | `#2A2A2A` |

---

## Store Shape

```ts
{
  expenses: Expense[];
  bills: Bill[];
  groups: Group[];
  activities: ActivityEntry[];
  isGuest: boolean;
  currency: string;
  isPro: boolean;
  splitTemplates: Record<string, SplitTemplate>;
  exchangeRates: Record<string, number>;
  currentUser: CurrentUser | null;
  token: string | null;
  _hasHydrated: boolean;
}
```

---

**Version:** 1.4.0
