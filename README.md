# FinCoord: Financial Coordination App

FinCoord is a React Native application for shared expense management and bill tracking. It bridges a ledger and a reminder engine around three core pillars: **What I owe**, **What I am owed**, and **What is due next**.

---

## Features

- **Shared Ledger** — Record group expenses with Equal, Percentage, or Custom split logic.
- **Bill Memory** — Track one-time and recurring bills with status tracking.
- **Reminder Engine** — Notification scheduling (stubbed; ready for `@notifee/react-native`).
- **Green-First UI** — MD3 Paper theme: `#0F7A5B` (Light) / `#19A874` (Dark).
- **Offline-First** — Full data persistence via Zustand + AsyncStorage.
- **Guest Mode** — Full app utility without account creation.
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
| Notifications | Stubbed (`src/utils/notifications.ts`) |

---

## Folder Structure

```
/FinCoordApp
├── App.tsx                  # Providers: SafeArea, Theme, Paper, Navigation
└── /src
    ├── /components          # Card, SummaryTile, StatusChip, SplitSelector, SearchBar
    ├── /constants           # paperTheme.ts (MD3 light/dark overrides), theme.ts (tokens)
    ├── /context             # ThemeContext — useAppTheme() hook, toggleTheme()
    ├── /navigation          # RootNavigator (Stack + Modals), AppNavigator (Bottom Tabs)
    ├── /screens             # 9 screens + 3 modals (see below)
    ├── /store               # useStore.ts — Zustand store with balance hooks
    ├── /types               # index.ts — Expense, Bill, Group, ActivityEntry, User
    └── /utils               # validation.ts, notifications.ts
```

### Screens

| Screen | Route | Notes |
|---|---|---|
| WelcomeScreen | `/Welcome` | Guest / sign-in entry |
| HomeScreen | Tab: Home | Balance summary, recent activity |
| GroupsScreen | Tab: Groups | Store-backed group list |
| GroupDetailScreen | Stack | Members, expense list, add expense FAB |
| BillsScreen | Tab: Bills | Upcoming & overdue bills |
| BillDetailScreen | Stack | Full bill info, mark handled |
| RemindersScreen | Tab: Reminders | Filtered upcoming bills |
| ActivityScreen | Tab: Activity | Store-backed activity feed |
| SettingsScreen | Tab: Settings | Dark mode toggle, clear data |
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

  // Actions (all mutations auto-append to activities[])
  addExpense(e: Omit<Expense, 'id'>): void;
  addBill(b: Omit<Bill, 'id'>): void;
  addGroup(g: Omit<Group, 'id'>): void;
  markBillHandled(id: string): void;
  setGuestStatus(v: boolean): void;
  clearData(): void;
}
```

---

## Implementation Standards

- **Validation** — All money inputs pass through `src/utils/validation.ts`.
- **Prepend** — New transactions are prepended to state arrays for "Recent Activity" visibility.
- **Persistence** — All state changes sync to AsyncStorage; app is fully offline-capable.
- **Modularity** — UI components are presentational; logic lives in the store or screen-level hooks.
- **Notifications** — Scheduling is stubbed in `src/utils/notifications.ts`. Replace with `@notifee/react-native` for production.

---

**Version:** 1.0.0
**Maintainer:** Engineering Team
