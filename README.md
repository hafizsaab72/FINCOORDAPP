# FinCoord — Financial Coordination App

FinCoord is a React Native application for shared expense management, bill tracking, and friend-based financial coordination. It bridges a ledger and a reminder engine around three core pillars: **What I owe**, **What I am owed**, and **What is due next**.

---

## Features

- **Authentication** — Sign up, sign in, guest mode. JWT-based sessions persist across launches; app reopens directly to the last state.
- **User Profile** — Edit name, phone, bio, and profile photo (stored as base64 in MongoDB).
- **Multi-Currency** — 14 currencies selectable from Settings, synced to and from the backend.
- **Shared Ledger** — Record group expenses with Equal, Percentage, or Custom split logic.
- **Bill Memory** — Track one-time and recurring bills with status tracking.
- **Reminder Engine** — Notification scheduling (stubbed; ready for `@notifee/react-native`).
- **Friends** — Search users, send/accept/reject friend requests, invite via WhatsApp, SMS, or share sheet.
- **Deep Links** — `fincoord://invite?ref=<userId>` routes to the InviteScreen to add a friend.
- **App Icon** — Custom branded icon applied to both iOS and Android.
- **Green-First UI** — MD3 Paper theme: `#0F7A5B` (Light) / `#19A874` (Dark).
- **Offline-First** — Full data persistence via Zustand + AsyncStorage.
- **Dark Mode** — System-synced, toggleable from Settings.

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React Native 0.84 (New Architecture) + TypeScript |
| Navigation | React Navigation v7 (Stack + Bottom Tabs) |
| UI | React Native Paper v5 (MD3) + Vector Icons |
| State | Zustand v5 (with Persist middleware) |
| Storage | AsyncStorage v3 |
| Image Picker | react-native-image-picker v7 |
| Backend | FinCoordAPI (Express + MongoDB Atlas) |
| Notifications | Stubbed (`src/utils/notifications.ts`) |

---

## Folder Structure

```
/FinCoordApp
├── App.tsx                  # Providers: SafeArea, Theme, Paper, Navigation + deep link config
└── /src
    ├── /constants           # paperTheme.ts (MD3 overrides), config.ts (API base URL)
    ├── /context             # ThemeContext — useAppTheme() hook, toggleTheme()
    ├── /navigation          # RootNavigator (Stack + Modals), AppNavigator (Bottom Tabs)
    ├── /screens             # All screens and modals (see below)
    ├── /services            # api.ts, authService.ts, friendsService.ts
    ├── /store               # useStore.ts — Zustand store with balance hooks
    ├── /types               # index.ts — Expense, Bill, Group, ActivityEntry, CurrentUser
    └── /utils               # currency.ts, validation.ts, notifications.ts
```

### Screens

| Screen | Route | Notes |
|---|---|---|
| WelcomeScreen | `/Welcome` | Create Account / Sign In / Guest |
| SignInScreen | Stack | Email + password login, no header |
| SignUpScreen | Stack | Name, email, password registration, no header |
| HomeScreen | Tab: Home | Balance summary, recent activity, user greeting |
| GroupsScreen | Tab: Groups | Store-backed group list |
| GroupDetailScreen | Stack | Members, expense list, add expense FAB |
| BillsScreen | Tab: Bills | Upcoming & overdue bills |
| BillDetailScreen | Stack | Full bill info, mark handled |
| RemindersScreen | Tab: Reminders | Filtered upcoming bills |
| FriendsScreen | Tab: Friends | Search, add friends, view requests, invite |
| ActivityScreen | Tab: Activity | Store-backed activity feed |
| SettingsScreen | Tab: Settings | Currency, dark mode, profile link, clear/delete |
| ProfileScreen | Stack | Edit name, phone, bio, profile photo |
| InviteScreen | Stack | Deep link landing page — add friend from invite link |
| AddExpenseModal | Modal | Split method selector, group-aware |
| AddBillModal | Modal | Category, due date, recurrence |
| CreateGroupModal | Modal | Name + member invite |

---

## Installation

```bash
npm install
```

**iOS (macOS only):**
```bash
cd ios && pod install && cd ..
```

**Run:**
```bash
npx react-native run-android
npx react-native run-ios
```

---

## Backend

This app connects to **FinCoordAPI** (Express + MongoDB Atlas).

The API base URL is configured in `src/constants/config.ts`:

```ts
// Android emulator → 10.0.2.2 maps to host machine's localhost
// iOS simulator   → localhost works directly
const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_URL = `http://${HOST}:3000/api`;
```

Start the API server before running the app:
```bash
cd ../FinCoordAPI && npm run dev
```

---

## Deep Links

The app handles the `fincoord://` custom URI scheme.

| URL | Screen |
|---|---|
| `fincoord://invite?ref=<userId>` | InviteScreen |

**Android** — Intent filter declared in `AndroidManifest.xml`.
**iOS** — URL scheme declared in `Info.plist` under `CFBundleURLTypes`.

---

## App Icon

Custom branded icon stored at `../FinCoordIcons/` (outside the app directory for reuse).

| Folder | Contents |
|---|---|
| `store/icon-1024.png` | iOS App Store submission |
| `store/icon-512.png` | Google Play Store submission |
| `ios/` | All required iOS sizes (20–180pt) |
| `android/` | mdpi → xxxhdpi PNGs |

Source SVG: `../FinCoordIcons/source/icon.svg` — edit and re-run `rsvg-convert` to regenerate all sizes.

---

## Theme Tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| Primary | `#0F7A5B` | `#19A874` | Buttons, active states |
| Background | `#FFFFFF` | `#121212` | App surface |
| Surface | `#F5FBF8` | `#1A1A1A` | Cards, panels, modals |
| Border | `#C9E6D9` | `#2A2A2A` | Dividers, inputs |

---

## Store Shape

```ts
{
  expenses: Expense[];
  bills: Bill[];
  groups: Group[];
  activities: ActivityEntry[];
  isGuest: boolean;
  currency: string;         // ISO 4217 code e.g. 'INR'
  currentUser: CurrentUser | null;
  token: string | null;
  _hasHydrated: boolean;    // false until AsyncStorage restore completes

  // Actions
  addExpense(e): void;
  addBill(b): void;
  addGroup(g): void;
  markBillHandled(id): void;
  setGuestStatus(v): void;
  setCurrency(code): void;
  setAuth(user, token): void;
  updateCurrentUser(partial): void;
  signOut(): void;
  clearData(): void;
}
```

---

**Version:** 1.2.0
