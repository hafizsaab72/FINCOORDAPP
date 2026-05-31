# OnTheTab — Shared Expense Management

OnTheTab is a React Native application for shared expense management and friend-based financial coordination. It answers two core questions: **What do I owe?** and **What am I owed?**

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
- Full-text search across expenses.
- Filter by amount range and category; sort by newest, oldest, or highest amount.

### Data Export *(Pro)*
- Export all expenses to CSV via the native share sheet.

### Receipt OCR
- Scan a receipt from AddExpenseScreen; backend runs Tesseract.js OCR to extract amount, merchant, and date.
- Auto-fills the expense form; falls back gracefully if parsing fails.

### Currency
- Multi-currency support with user-selectable home currency.
- Backend stores amounts in minor units (cents); UI displays major units.


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
- Group and non-group expenses with 5 split methods: Equal, Exact, Percentage, Shares, and Adjustment.
- Multi-payer support (single or multiple payers with exact amounts).
- Self-exclusion: payer can exclude themselves from the split.
- Balance summaries per group with debt simplification.



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
├── components/     ParticipantSelector, PayerSelector, SplitConfigurator,
│                   CategoryPicker, CurrencySelector, DatePickerField,
│                   ExpenseSummaryBar, CountryCodePicker, ProGate
├── constants/      paperTheme.ts, config.ts (API base URL)
├── context/        ThemeContext — useAppTheme(), toggleTheme()
├── navigation/     RootNavigator (stack + modals), AppNavigator (bottom tabs)
├── screens/        Home, Groups, GroupDetail, GroupSettings, CustomizeGroup,
│                   Friends, FriendDetail, Invite, Activity, Analytics, Search,
│                   Settings, Profile, Upgrade, SignIn, SignUp, Welcome,
│                   ForgotPassword, ResetPassword, QRScanner, MyQRCode,
│                   AddExpenseScreen, CreateGroupModal, SettleUpModal
├── services/       api, authService, currencyService, notificationService,
│                   friendsService, groupsService, activitiesService, expensesService
├── store/          useStore.ts — Zustand store with balance hooks
├── types/          index.ts — Expense, Activity, Group, Participant, Payer,
│                   Split, SplitMethod, ContextType, PayerMode, CurrentUser
└── utils/          countries, exportData, notifications, splitCalculations,
│                   expenseValidation, balances, currency, validation
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
3. **Android** — Add Android app (package `com.onthetab`) → download `google-services.json` → place at `android/app/google-services.json`.
4. **iOS** — Add iOS app → download `GoogleService-Info.plist` → place at `ios/OnTheTab/GoogleService-Info.plist`.
5. Upgrade Firebase project to **Blaze plan** (required for Phone Auth in production).
6. **Testing without billing** — Add test numbers in Firebase Console → Authentication → Phone → *Phone numbers for testing* (e.g. `+91 9999999999` / OTP `123456`).

---

## Backend

This app connects to **FinCoordAPI** (see companion repo). The API base URL is set in `src/constants/config.ts`:

```ts
const REMOTE_URL = 'http://187.124.96.129/api';
const LOCAL_URL = `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:3050/api`;
export const API_URL = __DEV__ ? LOCAL_URL : REMOTE_URL;
```

`__DEV__` is `true` when running via Metro bundler (development) and `false` in release builds (production).

```bash
cd ../FinCoordAPI && npm run dev
```

---

## Deep Links

| URL | Destination |
|---|---|
| `fincoord://invite?ref=<userId>` | InviteScreen — add friend from invite link |

## Authentication

The app supports email/password, phone OTP (Firebase), and guest mode.

**Forgot Password Flow:**
1. Tap "Forgot Password?" on the Sign In screen
2. Enter your email → the backend generates a secure reset token
3. Copy the token and proceed to the Reset Password screen
4. Enter the token + your new password → password is updated
5. Sign in with the new password

Backend endpoints:
- `POST /api/auth/forgot-password` — generates reset token (1-hour expiry)
- `POST /api/auth/reset-password` — validates token and updates password

---

## Theme Tokens

| Token | Light | Dark |
|---|---|---|
| Primary | `#16A34A` | `#22C55E` |
| Background | `#F0FDF4` | `#080F0A` |
| Surface | `#FFFFFF` | `#0F1A12` |
| Border | `#BBF7D0` | `#1A2E1C` |

---

## Store Shape

```ts
{
  expenses: Expense[];
  groups: Group[];
  activities: Activity[];
  isGuest: boolean;
  currency: string;
  isPro: boolean;
  currentUser: CurrentUser | null;
  token: string | null;
  _hasHydrated: boolean;
}
```

---

**Version:** 2.0.0
