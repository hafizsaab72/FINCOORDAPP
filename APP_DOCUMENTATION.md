# FinCoord App — Comprehensive Documentation

> **Last updated:** 2026-04-28  
> **Version:** 1.0.0  
> **Frontend:** React Native 0.84.1 (New Architecture / Fabric) + TypeScript 5.8  
> **Backend:** FinCoordAPI (Express + MongoDB Atlas)

---

## 1. What FinCoord Does

**FinCoord** is a shared expense management and bill tracking application designed for groups of friends, roommates, travel companions, and couples. It answers three core questions:

1. **What do I owe?** — Track debts across groups and direct friend-to-friend transactions.
2. **What am I owed?** — See who owes you money and from which group or expense.
3. **What is due next?** — Manage bills and recurring payments with reminders.

The app supports both **online mode** (synced to a backend via JWT auth) and **offline-first local mode** (guest mode with AsyncStorage persistence), ensuring users can always log expenses even without connectivity.

---

## 2. Complete Feature Inventory

### 2.1 Authentication & Identity

| Feature | Description |
|---------|-------------|
| **Email + Password** | Standard registration and sign-in with bcrypt-hashed passwords on the backend. |
| **Phone OTP (Firebase)** | Sign-in via Firebase Phone Auth with E.164 formatting. A country picker (flag + dial code) handles international numbers. |
| **Guest Mode** | Try the app without an account. All data is stored locally in AsyncStorage. Guest data can be preserved when upgrading to a real account. |
| **Session Persistence** | JWT token persists via Zustand + AsyncStorage. App rehydrates state on cold start and re-fetches the user profile. |
| **Profile Management** | Update name, email, phone, bio, profile picture, currency, and password from the Profile screen. |
| **Phone → Email Upgrade** | Phone-only users can add an email/password from Profile for cross-platform access. |
| **Account Deletion** | Full account deletion with GDPR-style data purge via `DELETE /auth/account`. |
| **Silent Auth Recovery** | On launch, the app calls `authService.me()` to validate the token. If 401, the user is signed out. Network errors are handled gracefully (no data wipe). |

### 2.2 Friends & Social Graph

| Feature | Description |
|---------|-------------|
| **Search Users** | Full-text search by name, phone, or email across the user base. |
| **Friend Requests** | Send, accept, or reject friend requests. Push notifications sent on both actions. |
| **Friend List** | View all friends with their net balance (positive = they owe you, negative = you owe them). |
| **Friend Detail** | Deep-dive into a friend's profile: geometric banner avatar, balance summary, shared groups, direct transactions, and one-tap settle-up. |
| **Contact Matching** | Match phone contacts against the FinCoord user base to find friends already on the platform. |
| **Remind Friend** | Send a gentle nudge to a friend who owes you money. |
| **Invite Links** | Generate deep links (`fincoord://invite?ref=<userId>`) shared via WhatsApp, SMS, or native share sheet. |
| **QR Code Exchange** | Display a personal QR code and scan others' codes to quickly add friends. |

### 2.3 Groups & Shared Ledgers

| Feature | Description |
|---------|-------------|
| **Create Groups** | Create a group with a name, type (trip, home, couple, other), optional image, and date range. |
| **Group Types** | Each type has a distinct color scheme and icon for visual differentiation. |
| **Add/Remove Members** | Invite existing friends or invite new users via share links. |
| **Group Detail** | View all expenses in a group, organized by month. Balance summary at the top with action pills (Balances, Totals, Settle Up). |
| **Group Settings** | Rename, change type, toggle debt simplification, leave, or delete the group. |
| **Debt Simplification** | When enabled, the backend computes the minimum number of transactions needed to settle all debts using a min-heap algorithm. |
| **Offline Groups** | Groups created in guest mode use local IDs and work fully offline. They sync to the backend after account creation. |

### 2.4 Expenses & Split Logic

| Feature | Description |
|---------|-------------|
| **Add Expense** | Modal form with amount, currency, date picker, payer selection, notes, and participant picker. |
| **Split Methods** | Equal, Percentage, or Custom (exact amounts) splits. |
| **Split Validation** | Pre-save validation ensures percentages sum to 100% and exact amounts sum to the total. |
| **Split Templates** | Save a default split per group (e.g., "Roommates: 40/30/30"). Auto-filled when adding expenses. |
| **Multi-Currency** | 14 currencies supported. Exchange rates fetched from ExchangeRate-API, cached 24h. Shows "≈ X [home currency]" as you type. |
| **Receipt OCR** | Scan a receipt photo; backend runs Tesseract.js OCR to extract amount, merchant, and date. Auto-fills the expense form. Pro-gated feature. |
| **Direct Expenses** | Expenses with `groupId: 'direct'` for one-on-one transactions outside of groups. |
| **Settle Up** | Record a settlement payment between two group members. Creates a special settlement expense. |
| **Edit / Delete** | Modify or remove expenses. API sync attempted if the expense has a MongoDB ObjectId. |

### 2.5 Bills & Reminders

| Feature | Description |
|---------|-------------|
| **Create Bills** | One-time or recurring bills with title, amount, currency, due date, and category. |
| **Status Tracking** | Bills have three states: `pending`, `handled`, `overdue`. |
| **Overdue Auto-Transition** | On app launch, pending bills with past due dates automatically transition to `overdue`. |
| **Recurring Bills** | Backend cron job spawns the next month's bill instance daily at 00:05. |
| **Bill Reminders** | Notifee schedules local notifications for upcoming bills. Reminders are cancelled when a bill is marked handled or deleted. |
| **Snooze** | Postpone a bill reminder by 1 day from the Bill Detail screen. |
| **Bill Categories** | Pre-defined categories (Rent, Utilities, Subscription, etc.) with color coding. |

### 2.6 Analytics & Insights

| Feature | Description |
|---------|-------------|
| **Monthly Bar Chart** | Spending over the last 6 months. Pro-gated. |
| **Category Donut Chart** | Spending breakdown by category. Pro-gated. |
| **Top Payers** | Per-group analysis of who pays the most. Pro-gated. |
| **Summary Tiles** | Free users see summary cards (total spent, pending bills, active groups) without charts. |
| **Analytics per Friend** | Filter analytics to a specific friend from the Friend Detail screen. |

### 2.7 Search & Export

| Feature | Description |
|---------|-------------|
| **Full-Text Search** | Search across expenses and bills by title, notes, or category. |
| **Amount Range Filter** | Filter results by minimum/maximum amount. |
| **Category Filter** | Filter by bill category. |
| **Sort Options** | Newest, oldest, or highest amount. |
| **Tappable Results** | Expense results navigate to the group detail; bill results navigate to bill detail. |
| **CSV Export** | Export all expenses and bills to a real `.csv` file via `react-native-fs`, shared via the native share sheet. Pro-gated. |

### 2.8 Notifications

| Feature | Description |
|---------|-------------|
| **Push Notifications** | Firebase Cloud Messaging (Android) + APNs (iOS). |
| **Foreground Handler** | In-app banner when a notification arrives while the app is open. |
| **Background Handler** | Tap-to-navigate to the relevant screen (Bill Detail, Friends, etc.). |
| **Notification Types** | Friend request received, friend request accepted, bill reminders. |
| **Device Token Registration** | FCM token registered to the backend on every login for targeted push delivery. |

### 2.9 UI / UX

| Feature | Description |
|---------|-------------|
| **Material Design 3** | React Native Paper v5 with custom green-first theme (`#0F7A5B` light / `#19A874` dark). |
| **Dark Mode** | System-synced by default; manual toggle persisted in AsyncStorage. |
| **Theming Tokens** | Consistent `theme.primary`, `theme.background`, `theme.surface`, `theme.text`, `theme.textSecondary`, `theme.border`. |
| **Custom Splash** | Branded loading screen with FinCoord "F" logo while Zustand rehydrates. |
| **Geometric Banners** | Friend Detail and Group Detail screens use abstract geometric art banners. |
| **Pro Gate** | Blurred overlay with upgrade prompt locks Pro features for free users. |

---

## 3. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React Native 0.84.1 (New Architecture / Fabric) | Cross-platform mobile UI |
| Language | TypeScript 5.8 | Type safety |
| Navigation | React Navigation v7 | Stack + Bottom Tab navigators |
| UI Kit | React Native Paper v5 | Material Design 3 components |
| Icons | react-native-vector-icons (MaterialCommunityIcons) | Tab bar and action icons |
| State | Zustand v5 + persist middleware | Global state with AsyncStorage persistence |
| Auth | `@react-native-firebase/auth` | Phone OTP verification |
| Push | `@react-native-firebase/messaging` + `@notifee/react-native` | FCM + local notifications |
| Charts | `react-native-gifted-charts` | Bar and donut charts |
| Dates | `react-native-paper-dates` | MD3 date pickers |
| Files | `react-native-fs` | CSV export file writing |
| Images | `react-native-image-picker` | Receipt OCR photo selection |
| Camera | `react-native-vision-camera` | QR code scanning |
| QR Codes | `react-native-qrcode-svg` | My QR Code generation |
| Contacts | `react-native-contacts` | Contact matching for friend discovery |
| Gestures | `react-native-gesture-handler` + `react-native-reanimated` | Bottom sheet and animation support |
| Backend | FinCoordAPI (Express + MongoDB Atlas) | REST API + cron jobs |

---

## 4. Architecture

### 4.1 Navigation Structure

```
RootNavigator (Native Stack)
├── WelcomeScreen          (if no token / not guest)
├── SignInScreen
├── SignUpScreen
├── MainTabs (Bottom Tab Navigator)
│   ├── HomeTab (Stack)
│   │   ├── HomeScreen         ← Dashboard with overview, bills, reminders
│   │   ├── BillDetailScreen
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
│   │   ├── ActivityScreen     ← Recent activity feed
│   │   ├── AnalyticsScreen
│   │   └── SearchScreen
│   └── AccountTab (Stack)
│       ├── SettingsScreen     ← Account settings
│       ├── ProfileScreen
│       ├── UpgradeScreen
│       ├── MyQRCodeScreen
│       ├── AnalyticsScreen
│       └── SearchScreen
└── Modal Group (presentation: 'modal')
    ├── AddExpenseModal
    ├── AddBillModal
    ├── CreateGroupModal
    └── SettleUpModal
```

**Cross-tab navigation:** Screens inside nested stacks dispatch actions up through the Bottom Tab Navigator. To navigate from one tab's stack to another (e.g., Groups → Activity), use `navigation.navigate('TabName', { screen: 'ScreenName', params: {...} })`. Modals (AddExpenseModal, etc.) live in RootNavigator and are reachable from any nested stack via action bubbling.

### 4.2 Data Flow

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   React Native  │────▶│  Zustand     │────▶│  AsyncStorage   │
│   Screens       │◄────│  Store       │◄────│  (Persistence)  │
└─────────────────┘     └──────────────┘     └─────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────┐     ┌──────────────┐
│  apiFetch()     │────▶│  FinCoordAPI │
│  (JWT Bearer)   │◄────│  (REST)      │
└─────────────────┘     └──────────────┘
```

**Offline-first pattern:**
1. All mutations write to Zustand first (instant UI update)
2. If online and authenticated, sync to backend via `apiFetch()`
3. On failure, data remains in local store; a warning alert is shown
4. On app launch, Zustand rehydrates from AsyncStorage

### 4.3 State Management (Zustand)

```typescript
interface AppState {
  expenses: Expense[];           // All expenses (group + direct)
  bills: Bill[];                 // One-time and recurring bills
  groups: Group[];               // User's groups
  activities: ActivityEntry[];   // Audit trail of actions
  isGuest: boolean;              // Guest mode flag
  currency: string;              // User's home currency (default: USD)
  currentUser: CurrentUser | null;
  token: string | null;          // JWT access token
  isPro: boolean;                // Pro subscription status
  splitTemplates: Record<string, SplitTemplate>;  // Per-group defaults
  exchangeRates: Record<string, number>;          // 24h cached rates
  ratesLastFetched: number;      // Unix timestamp of last rate fetch
  _hasHydrated: boolean;         // Rehydration complete flag
}
```

**Key store actions:**
- `addExpense` / `updateExpense` / `deleteExpense` — Local ledger mutations
- `addBill` / `updateBill` / `deleteBill` / `markBillHandled` — Bill lifecycle
- `setAuth` — Preserves local data when guest upgrades to authenticated user
- `recomputeBillStatuses` — Transitions `pending` → `overdue` on hydration
- `signOut` — Clears auth state; keeps local data for guest mode

### 4.4 API Layer

All API calls go through `apiFetch(path, method, body)`:
- Base URL: `http://187.124.96.129/api` (production) or `localhost:3000/api` (development)
- Automatically injects `Authorization: Bearer <token>` header
- Throws on non-JSON responses or HTTP errors

**Service modules:**
- `authService` — register, login, me, profile update, phone login, delete account
- `friendsService` — search, requests, balances, invite, contact matching
- `groupsService` — CRUD groups, members, balances, expenses, settlements
- `expensesService` — update and delete individual expenses

### 4.5 Backend (FinCoordAPI)

**Express routes:**
```
/api/auth       — Registration, login, phone auth, profile, account deletion
/api/friends    — Requests, accept/reject, balances, remind
/api/groups     — CRUD, members, expenses, balances, settle, simplify debts
/api/expenses   — Individual expense updates/deletes, receipt OCR
/api/bills      — Bill CRUD, recurring bill scheduler
/api/users      — Search, invite lookup, contact matching
/api/currency   — Exchange rates, conversion
/api/export     — CSV/JSON data export
/api/data       — Bulk data deletion (GDPR)
/api/activities — Activity feed
```

**Cron jobs:**
- `billScheduler` — Runs daily at 00:05 to spawn next month's recurring bill instances

---

## 5. Key User Flows

### 5.1 First-Time User

```
WelcomeScreen → SignUp (Email or Phone OTP) → MainTabs (Home)
```

### 5.2 Add a Group Expense

```
Home / Groups → Tap "+" → AddExpenseModal
  → Select group (or create new)
  → Enter amount & currency
  → Pick payer
  → Choose split method (Equal / Percentage / Custom)
  → Validate split sums
  → Pick date
  → Add notes (optional)
  → Tap Save → Local store + API sync
```

### 5.3 Settle Up with a Friend

```
Friends → Tap friend → FriendDetail
  → Tap "Settle Up" → SettleUpModal
  → Confirm amount → Creates settlement expense
```

### 5.4 Create a Recurring Bill

```
Home → Bills segment → Tap "+" → AddBillModal
  → Enter title, amount, category
  → Toggle "Recurring"
  → Pick due date via DatePickerModal
  → Save → Local + API sync
  → Backend cron spawns next month's instance automatically
```

### 5.5 Guest → Authenticated Upgrade

```
Welcome → "Continue as Guest" → Use app locally
  → Settings → "Sign Up / Sign In"
  → Complete registration
  → setAuth() preserves all local expenses, bills, and groups
  → Bulk sync to backend (TODO: full implementation)
```

### 5.6 Deep Link Invite

```
User taps fincoord://invite?ref=abc123
  → InviteScreen loads inviter profile
  → Tap "Add Friend" → sends friend request
  → Push notification delivered to inviter
```

---

## 6. Data Models

### 6.1 Expense

```typescript
interface Expense {
  id: string;                    // Local ID or MongoDB ObjectId
  groupId: string;               // Group ID or 'direct' for 1:1
  payerId: string;               // Who paid
  amount: number;                // Total amount
  currency: string;              // e.g., 'USD', 'EUR'
  notes: string;                 // Description / merchant
  date: string;                  // ISO 8601 date string
  splitMethod: 'equal' | 'percentage' | 'custom';
  splitDetails: Record<string, number>;  // Member ID → share
  participantNames?: Record<string, string>;  // ID → display name
}
```

### 6.2 Bill

```typescript
interface Bill {
  id: string;
  title: string;
  amount: number;
  currency?: string;
  dueDate: string;               // ISO 8601
  isRecurring: boolean;
  status: 'pending' | 'handled' | 'overdue';
  category: string;              // e.g., 'Rent', 'Utilities'
}
```

### 6.3 Group

```typescript
interface Group {
  id: string;
  name: string;
  members: string[];             // User IDs
  createdBy?: string;
  createdAt: string;
  type?: 'trip' | 'home' | 'couple' | 'other';
  image?: string;                // Base64 or URL
  startDate?: string;
  endDate?: string;
  simplifyDebts?: boolean;
}
```

### 6.4 CurrentUser

```typescript
interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;              // ISO 3166-1 alpha-2
  bio?: string;
  profilePic?: string;           // Base64 data URL
  currency?: string;
  isPro?: boolean;
}
```

---

## 7. Development & Build

### 7.1 Scripts

```bash
npm install
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run lint     # ESLint
npm test         # Jest
```

### 7.2 iOS Setup

```bash
cd ios && pod install && cd ..
```

### 7.3 Firebase Setup

1. Create project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Phone** sign-in under Authentication
3. Download `google-services.json` → `android/app/`
4. Download `GoogleService-Info.plist` → `ios/FinCoordApp/`
5. Upgrade to Blaze plan for production Phone Auth

### 7.4 Backend

```bash
cd ../FinCoordAPI
npm install
npm run dev      # Starts Express on port 3000
```

---

## 8. Security & Privacy

- **JWT tokens** expire and are validated on every authenticated request
- **Passwords** are bcrypt-hashed server-side; never stored in plain text
- **Profile pictures** are base64 data URLs stored in MongoDB (no external CDN)
- **Guest data** never leaves the device unless explicitly synced after account creation
- **Account deletion** purges all user data from the backend (`DELETE /auth/account`)

---

## 9. Known Issues & TODOs

### Recently Fixed (2026-04-28)
- ✅ Navigation restructure: each tab now has its own nested stack navigator
- ✅ Cross-tab navigation routing fixed (Groups→Activity, Settings→Friends, Activity→BillDetail, etc.)
- ✅ Header display fixed on all main screens with themed native stack headers
- ✅ UI design matched to reference screenshots across 9 screens
- ✅ React Native Paper components adopted throughout (Button, Card, Chip, SegmentedButtons, TextInput, etc.)
- ✅ SettleUpModal redesigned with paper components and two-step flow
- ✅ AddExpenseModal upgraded with paper TextInput, Chip, SegmentedButtons, IconButton
- ✅ GroupDetailScreen action bar and balance section upgraded to paper Button/Card
- ✅ AnalyticsScreen redesigned with donut chart, metric cards, and top payers list
- ✅ ActivityScreen redesigned with filter chips, analytics banner, and bill/reminder tabs
- ✅ GroupsScreen redesigned with search, summary bar, per-person debt breakdowns
- ✅ Module-scope `theme` crash in SignInScreen styles
- ✅ Stale `setDatePickerInput` reference in AddExpenseModal
- ✅ `netBalance` redeclaration crash in FriendDetailScreen
- ✅ Empty-string name access crashes across 7 screens
- ✅ Email regex validation inconsistency
- ✅ `setInterval` memory leak in OTP resend
- ✅ Stale split maps (percentage/exact) not reset on participant change
- ✅ Missing `participantNames` in API sync payload
- ✅ Local balance fallback when API fails in GroupDetailScreen

### Remaining TODOs
- Guest → auth bulk sync (upload local data to backend after sign-up)
- Currency conversion in GroupDetail "Totals" tab
- iOS CSV export `file://` prefix verification
- Notifee action button for one-tap bill snooze from notification
- OTP component with 6 boxes and auto-focus
- Password strength indicator
- Activity feed entries for "Settled Up" and "Deleted Expense"
- `registerTranslation` for react-native-paper-dates
- UTC date-shift fix for ISO string parsing in DatePickerModal
- Bottom-sheet migration for modals (currently stack presentation)

---

## 10. Project Structure

```
FinCoordApp/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── CountryCodePicker.tsx
│   │   └── ProGate.tsx
│   ├── constants/         # Theme, config, group types
│   │   ├── config.ts      # API_URL
│   │   ├── groupTypes.ts  # Color/icon mappings
│   │   └── paperTheme.ts  # MD3 theme definitions
│   ├── context/
│   │   └── ThemeContext.tsx   # Dark mode provider with persistence
│   ├── navigation/
│   │   ├── RootNavigator.tsx  # Stack navigator (auth + main + modals)
│   │   └── AppNavigator.tsx   # Bottom tabs (Home, Friends, Groups, Activity, Account)
│   ├── screens/           # 26 screen components
│   │   ├── HomeScreen.tsx
│   │   ├── AddExpenseModal.tsx
│   │   ├── AddBillModal.tsx
│   │   ├── GroupDetailScreen.tsx
│   │   ├── FriendDetailScreen.tsx
│   │   ├── AnalyticsScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── ... (see full list above)
│   ├── services/          # API service modules
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── friendsService.ts
│   │   ├── groupsService.ts
│   │   ├── currencyService.ts
│   │   └── notificationService.ts
│   ├── store/
│   │   └── useStore.ts    # Zustand store with persistence
│   ├── types/
│   │   └── index.ts       # TypeScript interfaces
│   └── utils/
│       ├── countries.ts       # Country data for picker
│       ├── currency.ts        # Currency symbols
│       ├── exportData.ts      # CSV export logic
│       └── notifications.ts   # Notifee reminder helpers
├── App.tsx                # Root component with auth rehydration
├── index.js               # Entry point with background handlers
├── babel.config.js
├── metro.config.js
├── tsconfig.json
└── package.json
```

---

*This document is maintained as part of the FinCoordApp codebase. Update it when adding major features or changing architecture.*
