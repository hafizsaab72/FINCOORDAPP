# FinCoord / OnTheTab — App Documentation

> **Last updated:** 2026-05-29
> **App name:** OnTheTab (package: `onthetab`)
> **Frontend:** React Native 0.84.1 (New Architecture) + TypeScript 5.8
> **Backend:** FinCoordAPI (Express + MongoDB Atlas) — `../FinCoordAPI`

---

## 1. What OnTheTab Does

A shared expense management app for groups of friends, roommates, travel companions, and couples. Core questions:

1. **What do I owe?** — Track debts across groups and direct friend-to-friend transactions.
2. **What am I owed?** — See who owes you money and from which group or expense.

Supports **online mode** (JWT auth, synced to backend) and **offline-first guest mode** (AsyncStorage only).

---

## 2. Feature Inventory

### 2.1 Authentication & Identity

| Feature | Description |
|---------|-------------|
| Email + Password | Registration and sign-in with bcrypt-hashed passwords. |
| Phone OTP (Firebase) | Firebase Phone Auth with E.164 formatting and country picker. |
| Guest Mode | Full offline mode with local data. Upgrades to account preserving data. |
| Session Persistence | JWT persists via Zustand + AsyncStorage; `authService.me()` validates on launch. |
| Profile Management | Update name, email, phone, bio, profile pic, currency, password. |
| Account Deletion | GDPR-style full purge via `DELETE /auth/account`. |

### 2.2 Friends & Social Graph

| Feature | Description |
|---------|-------------|
| Search Users | Full-text search by name, phone, or email. |
| Friend Requests | Send, accept, or reject with push notifications. |
| Friend List | View friends with net balance (positive = they owe you). |
| Friend Detail | Profile banner, balance summary, shared groups, direct transactions, settle-up. |
| Remind Friend | Push nudge to friend who owes you. |
| QR Code Exchange | Display personal QR (`fincoord://add-friend?userId=...`) or scan others. |
| Invite Links | Deep links (`fincoord://invite?ref=<userId>`) for sharing. |

### 2.3 Groups & Shared Ledgers

| Feature | Description |
|---------|-------------|
| Create Groups | Name, type (trip/home/couple/other), optional image, date range. |
| Group Types | Each type has distinct color + icon. |
| Add/Remove Members | Invite friends or new users via share links. |
| Group Detail | Expenses organized by month, balance summary, Balances/Totals tabs, Settle Up. |
| Group Settings | Rename, type, debt simplification toggle, leave, delete group. |
| Debt Simplification | Backend min-heap algorithm minimizes settlement transactions. |
| Offline Groups | Guest-mode groups use local IDs and sync after account creation. |

### 2.4 Expenses & Split Logic

| Feature | Description |
|---------|-------------|
| Add Expense | Full form: amount, currency, date, category, payer(s), participants, split method. |
| Split Methods | Equal, Exact, Percentage, Shares, Adjustment — with real-time validation. |
| Multi-Payer | Single or multiple payers with exact amount validation. |
| Self-Exclusion | Sole payer can exclude themselves from the split. |
| Multi-Currency | User-selectable home currency; backend stores minor units. |
| Receipt OCR | Scan receipt photo → Tesseract.js backend extracts amount/merchant/date. Pro-gated. |
| Direct Expenses | Non-group 1:1 transactions outside of groups. |
| Settle Up | Record a settlement payment → creates `isSettlement: true` expense. |
| Edit / Delete | Modify or soft-delete expenses with atomic balance reversal. |

### 2.5 Analytics & Insights

| Feature | Description |
|---------|-------------|
| Monthly Bar Chart | Spending over last 6 months. Pro-gated. |
| Category Donut Chart | Spending breakdown by category. Pro-gated. |
| Top Payers | Per-group analysis of who pays the most. Pro-gated. |
| Summary Tiles | Free users: total spent, active groups, expense count, month comparison. |
| Per-Friend Analytics | Filter analytics from Friend Detail screen. |

### 2.6 Notifications

| Feature | Description |
|---------|-------------|
| Push Notifications | Firebase Cloud Messaging (Android) + APNs (iOS). |
| Foreground Handler | In-app banner when app is open. |
| Background Handler | Tap navigates to relevant screen. |
| Device Token Registration | FCM token registered on every login. |

### 2.7 UI / UX

| Feature | Description |
|---------|-------------|
| Material Design 3 | React Native Paper v5 with green-first theme. |
| Dark Mode | System-synced by default; toggle persisted in AsyncStorage. |
| Design System | `src/theme/tokens.ts` — colors, typography, spacing, radius, shadows, component tokens. |
| Custom Splash | Logo splash while Zustand rehydrates. |
| Pro Gate | Blurred overlay + upgrade prompt locks Pro features. |
| Haptics | `src/utils/haptics.ts` for tactile feedback. |

---

## 3. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React Native 0.84.1 (New Architecture / Fabric) | Cross-platform mobile UI |
| Language | TypeScript 5.8 | Type safety |
| Navigation | React Navigation v7 (native-stack + bottom-tabs) | Stack + Bottom Tab navigators |
| UI Kit | React Native Paper v5 + MD3 | Material Design 3 components |
| State | Zustand v5 + persist middleware + AsyncStorage | Global state with persistence |
| Query | TanStack React Query v5 | Server state management |
| Auth | `@react-native-firebase/auth` | Phone OTP verification |
| Push | `@react-native-firebase/messaging` + `@notifee/react-native` | FCM + local notifications |
| Charts | `react-native-gifted-charts` | Bar and donut charts |
| Bottom Sheet | `@gorhom/bottom-sheet` | Bottom sheet modals |
| Gestures | `react-native-gesture-handler` + `react-native-reanimated` v4 | Gestures and animations |
| Camera | `react-native-vision-camera` v4 | QR code scanning |
| QR Codes | `react-native-qrcode-svg` | QR code generation |
| Files | `react-native-fs` | CSV export |
| Images | `react-native-image-picker` | Receipt OCR, profile pics |
| Contacts | `react-native-contacts` | Contact matching |
| Backend | FinCoordAPI (Express + MongoDB Atlas) | REST API |

---

## 4. Architecture

### 4.1 Navigation Structure

```
RootNavigator (Native Stack)
├── WelcomeScreen / SignIn / SignUp / ForgotPassword / ResetPassword
├── MainTabs (Bottom Tab Navigator — 5 tabs)
│   ├── HomeTab (Stack)
│   │   ├── HomeScreen         ← Dashboard: summary tiles, activity feed
│   │   ├── AnalyticsScreen
│   │   └── SearchScreen
│   ├── FriendsTab (Stack)
│   │   ├── FriendsScreen      ← Friend list + requests
│   │   ├── FriendDetailScreen
│   │   ├── AnalyticsScreen
│   │   ├── InviteScreen
│   │   ├── MyQRCodeScreen
│   │   ├── QRScannerScreen
│   │   └── SearchScreen
│   ├── GroupsTab (Stack)
│   │   ├── GroupsScreen       ← Group list
│   │   ├── GroupDetailScreen
│   │   ├── GroupSettingsScreen
│   │   ├── CustomizeGroupScreen
│   │   ├── QRScannerScreen
│   │   ├── AnalyticsScreen
│   │   └── SearchScreen
│   ├── ActivityTab (Stack)
│   │   ├── ActivityScreen     ← Activity feed with filters (All/Expenses/Settlements)
│   │   ├── AnalyticsScreen
│   │   └── SearchScreen
│   └── AccountTab (Stack)
│       ├── SettingsScreen     ← Account settings
│       ├── ProfileScreen
│       ├── UpgradeScreen
│       ├── MyQRCodeScreen
│       ├── QRScannerScreen
│       ├── AnalyticsScreen
│       └── SearchScreen
├── AddExpenseScreen             ← Full-screen expense form
├── CreateGroupModal             ← Modal presentation
└── SettleUpModal                ← Modal presentation
```

**Cross-tab navigation:** From nested stacks, use `navigation.navigate('TabName', { screen: 'ScreenName', params: {...} })`.

### 4.2 Data Flow

```
React Native Screens
       │
       ▼
Zustand Store ◄──► AsyncStorage (persistence)
       │
       ├── useQuery (React Query) ──► API calls ──► FinCoordAPI
       │
       └── Components read directly from Zustand
```

**Offline-first pattern:**
1. All mutations write to Zustand first (instant UI update)
2. If online + authenticated, sync to backend via `apiFetch()`
3. On failure, data stays local; warning shown
4. On app launch, Zustand rehydrates from AsyncStorage

### 4.3 State Management

**Zustand Store** (`src/store/useStore.ts`) — auth-focused, minimal:

```typescript
interface AppState {
  isGuest: boolean;
  currency: string;                    // User's home currency (default: USD)
  currentUser: CurrentUser | null;
  token: string | null;               // JWT access token
  isPro: boolean;
  exchangeRates: Record<string, number>;
  ratesLastFetched: number;
  _hasHydrated: boolean;               // Rehydration complete flag

  setGuestStatus, setCurrency, setAuth,
  updateCurrentUser, signOut, setIsPro, setExchangeRates
}
```

**Note:** Transactional data (expenses, groups, activities) is NOT in Zustand. It's fetched per-screen via React Query.

**React Query hooks:**
- `useGlobalBalances()` — dashboard `/api/dashboard/balances`
- `useExpenses(groupId?)` — expenses with optional group filter
- `useBalances(groupId)` — group-level member balances

### 4.4 API Layer

`apiFetch(path, method, body)` injects `Authorization: Bearer <token>` automatically.

| Base URL | Notes |
|----------|-------|
| Development | `localhost:3050/api` (iOS) / `10.0.2.2:3050/api` (Android) |
| Production | `https://fincoordapi.onrender.com/api` |

**Service modules:**
- `authService` — register, login, me, profile update, phone login, delete account
- `friendsService` — search, requests, balances, remind
- `groupsService` — CRUD, members, balances, expenses (paginated), settlements, leave
- `expensesService` — create, update, delete expenses
- `dashboardService` — `/dashboard/balances` endpoint
- `activitiesService` — activity feed
- `analyticsService` — analytics data
- `currencyService` — exchange rates
- `notificationService` — FCM device token registration + foreground handler

### 4.5 Backend Routes (FinCoordAPI)

```
/api/auth        — Registration, login, phone auth, profile, account deletion
/api/friends     — Requests (incoming/sent), accept/reject, balances, remind
/api/groups      — CRUD, members, expenses (paginated), balances, settle, simplify
/api/expenses    — CRUD expenses, receipt OCR, soft deletes
/api/dashboard   — Complete financial picture (summary, by-group, by-person, simplified)
/api/users       — Search, invite lookup, contact matching
/api/activities  — Activity feed
/api/analytics   — Spending analytics
/api/export      — CSV/JSON data export
/api/data        — GDPR bulk deletion
/api/currency    — Exchange rates
```

### 4.6 Backend Models (MongoDB)

| Model | Purpose |
|-------|---------|
| `User` | User accounts with auth, profile, currency, FCM token |
| `Expense` | Financial transactions with payments[], splits[], multi-payer, soft-delete |
| `Group` | Shared ledgers with members[], type, simplifyDebts, date range |
| `Balance` | **Materialized** per-user net balance per group (updated incrementally) |
| `FriendRequest` | Friend request records with status (pending/accepted/rejected) |
| `Activity` | Audit trail of actions |

---

## 5. Design System

### 5.1 Color Palette

**Dark mode (default):**
- Background: `#080F0A` (near-black green)
- Surface: `#0F1A12`
- Primary: `#22C55E` (green)
- Text Primary: `#F0FDF4`
- Debt (owe): `#F87171` (red)
- Credit (owed): `#4ADE80` (green)
- Settled: `#10B981`

**Light mode:**
- Background: `#F0FDF4` (near-white green)
- Primary: `#16A34A`
- Text Primary: `#0F1A12`

### 5.2 Token Files

| File | Contents |
|------|----------|
| `src/theme/tokens.ts` | Colors (dark/light), typography, spacing, radius, shadows, component tokens, `avatarPalette` |
| `src/constants/paperTheme.ts` | MD3 Paper themes via `createPaperTheme()` — `paperDarkTheme`, `paperLightTheme` |
| `src/context/ThemeContext.tsx` | `ThemeProvider`, `useAppTheme()` (returns `AppTheme`), `useTheme()` (returns Paper-compatible colors) |

### 5.3 Theme Hooks

```typescript
// For custom components — use AppTheme properties
const { theme } = useAppTheme();
// theme.primary, theme.background, theme.text, theme.border, etc.

// For React Native Paper components — use .colors
const { colors } = useTheme();
// colors.primary, colors.surface, colors.textPrimary, etc.
// Also includes raw token access: colors.debt, colors.credit, colors.accentPurple, etc.
```

---

## 6. Key User Flows

### 6.1 Add a Group Expense

```
Groups → Tap group → GroupDetail → FAB "+" → AddExpenseScreen
  → Enter title, amount, currency
  → Pick category
  → Select payer (single or multi-payer mode)
  → Select participants (toggle active/inactive)
  → Choose split method (Equal / Exact / Percentage / Shares / Adjustment)
  → Configure split values with live validation
  → Pick date
  → Add notes (optional)
  → Tap Save → Local optimistic update → API sync
```

### 6.2 Settle Up with a Friend

```
Friends → Tap friend → FriendDetail → "Settle Up" button
  → SettleUpModal opens with pre-filled amount
  → Confirm → Creates settlement expense → Balances update
```

### 6.3 Guest → Authenticated Upgrade

```
Welcome → "Continue as Guest" → Use app locally
  → Settings → "Sign Up / Sign In"
  → Complete registration → setAuth() preserves local data
  → Data syncs to backend
```

---

## 7. Data Models

### 7.1 Expense (Frontend — `src/types/index.ts`)

```typescript
interface Expense {
  id: string;
  title: string;
  totalAmount: number;            // major units in UI
  currency: string;
  category: string;
  contextType: 'group' | 'non_group';
  groupId: string | null;
  participants: Participant[];    // active/inactive split members
  payerMode: 'single' | 'multiple';
  payers: Payer[];                // who paid and how much
  splitMethod: SplitMethod;        // 'equal' | 'exact' | 'percentage' | 'shares' | 'adjustment'
  splits: Split[];                // per-participant computed amounts
  date: string;                   // ISO date
  notes: string | null;
  attachments: Attachment[] | null;
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule | null;
  isSettlement: boolean;
  settlementFrom?: string;
  settlementTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

interface Participant { userId: string; name: string; isActive: boolean; }
interface Payer { userId: string; amountPaid: number; }
interface Split { userId: string; splitMethod: SplitMethod; value: number; computedAmount: number; }
```

### 7.2 Group (Frontend)

```typescript
interface Group {
  id: string;
  name: string;
  members: string[];              // User IDs
  createdBy?: string;
  createdAt: string;
  type?: 'trip' | 'home' | 'couple' | 'other';
  icon?: string;
  image?: string;
  startDate?: string;
  endDate?: string;
  simplifyDebts?: boolean;
}
```

### 7.3 Dashboard Types

```typescript
interface DashboardBalances {
  summary: {
    totalOwedToMe: number;        // minor units
    totalYouOwe: number;          // minor units
    netBalance: number;
    currency: string;
    expenseCount: number;
    thisMonthTotal: number;       // minor units
    lastMonthTotal: number;       // minor units
  };
  byGroup: DashboardByGroup[];
  byPerson: DashboardByPerson[];
  simplifiedTransactions: SimplifiedTransaction[];
}
```

---

## 8. Project Structure

```
FinCoordApp/
├── src/
│   ├── assets/images/logos/       # Logo PNGs (primary, grayscale)
│   ├── components/                # 26 reusable components
│   │   ├── ActionBar.tsx
│   │   ├── AppAvatar.tsx
│   │   ├── AppCard.tsx
│   │   ├── AppSearchBar.tsx
│   │   ├── AppSnackbar.tsx
│   │   ├── CategoryPicker.tsx
│   │   ├── ClassicTabBar.tsx      # Custom bottom tab bar
│   │   ├── CountryCodePicker.tsx
│   │   ├── CurrencySelector.tsx
│   │   ├── DashboardSummary.tsx
│   │   ├── DatePickerField.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── ExpenseSummaryBar.tsx
│   │   ├── LiquidGlassTabBar.tsx  # Alternative glass tab bar
│   │   ├── LoadingOverlay.tsx
│   │   ├── ParticipantSelector.tsx
│   │   ├── PayerSelector.tsx
│   │   ├── ProGate.tsx
│   │   ├── RemainingIndicator.tsx
│   │   ├── SplitConfigurator.tsx
│   │   ├── StatusChip.tsx
│   │   └── SummaryTile.tsx
│   ├── constants/
│   │   ├── config.ts              # API_URL (localhost:3050 dev / onrender prod)
│   │   ├── groupTypes.ts          # Group type configs (colors, icons)
│   │   ├── images.ts              # Image asset registry
│   │   ├── paperTheme.ts          # MD3 Paper themes
│   │   └── tabBar.ts              # Tab bar constants
│   ├── context/
│   │   └── ThemeContext.tsx       # useAppTheme(), useTheme(), ThemeProvider
│   ├── hooks/
│   │   ├── useAnalytics.ts
│   │   ├── useBalances.ts
│   │   ├── useDashboard.ts        # useGlobalBalances() — dashboard data
│   │   └── useExpenses.ts
│   ├── navigation/
│   │   ├── navigationRef.ts        # Navigation ref for deep linking
│   │   ├── AppNavigator.tsx       # Bottom tabs (5 tabs with nested stacks)
│   │   └── RootNavigator.tsx       # Stack root (auth + MainTabs + modals)
│   ├── screens/                   # 23 screens + 2 modals
│   ├── services/                 # API service modules
│   │   ├── api.ts                 # apiFetch() base
│   │   ├── authService.ts
│   │   ├── expensesService.ts
│   │   ├── friendsService.ts
│   │   ├── groupsService.ts
│   │   ├── activitiesService.ts
│   │   ├── analyticsService.ts
│   │   ├── dashboardService.ts
│   │   ├── currencyService.ts
│   │   └── notificationService.ts
│   ├── store/
│   │   └── useStore.ts            # Zustand store (auth state only)
│   ├── theme/
│   │   └── tokens.ts              # Design system: colors, typography, spacing, shadows
│   ├── types/
│   │   └── index.ts               # All TypeScript interfaces
│   └── utils/
│       ├── balances.ts            # Balance computation, debt simplification, API→local conversion
│       ├── countries.ts           # Country data
│       ├── currency.ts            # Currency symbols, minor/major unit conversion
│       ├── expenseValidation.ts  # Client-side expense validation
│       ├── exportData.ts          # CSV export
│       ├── haptics.ts             # Haptic feedback
│       ├── notifications.ts       # @notifee helpers
│       ├── splitCalculations.ts   # Cent-precision split calculators
│       ├── ui.ts                  # Activity icons, colors, relative time
│       └── validation.ts          # Form validation helpers
├── App.tsx                        # Root: QueryClientProvider → SafeArea → Theme → ErrorBoundary → AppContent
├── index.js                       # Entry point
├── jest.config.js
├── package.json                   # App name: "onthetab"
└── ...
```

---

## 9. Development & Build

### 9.1 Scripts

```bash
npm install && cd ios && pod install && cd ..
npm run ios       # iOS simulator
npm run android   # Android emulator
npm run lint      # ESLint
npm test          # Jest (96 tests covering split calculations, validation, balances)
npm run typecheck # TypeScript
```

### 9.2 Backend

```bash
cd ../FinCoordAPI
npm install
npm run dev       # Express on port 3050
```

### 9.3 Firebase Setup

1. Create project at console.firebase.google.com
2. Enable **Phone** sign-in under Authentication
3. Download `google-services.json` → `android/app/`
4. Download `GoogleService-Info.plist` → `ios/onthetab/`

---

## 10. Known Issues & TODOs

### Recently Fixed (2026-05-26)
- ✅ Transaction rewrite — new `Expense` type with 5 split methods, multi-payer, soft deletes
- ✅ 96 Jest tests for split calculations, validation, and balances
- ✅ Balance materialization model for fast per-group summaries
- ✅ Dashboard endpoint `/api/dashboard/balances` for complete financial picture
- ✅ `useGlobalBalances()` React Query hook for HomeScreen
- ✅ Android splash screen — eliminated triple visual state on launch
- ✅ App logo assets — 4 logo variants in `src/assets/images/logos/`

### Remaining TODOs
- Guest → auth bulk sync (upload local data after sign-up)
- Currency conversion in GroupDetail "Totals" tab
- Recurring expenses UI (backend supports `isRecurring`)
- Attachments UI (backend supports `attachments`)
- Receipt scanning Pro-gate integration
- OTP component with 6 boxes and auto-focus
- Password strength indicator
- `registerTranslation` for react-native-paper-dates
- UTC date-shift fix for ISO string parsing in DatePickerModal

---

*Maintained as part of the OnTheTab codebase. Update when adding major features or changing architecture.*
