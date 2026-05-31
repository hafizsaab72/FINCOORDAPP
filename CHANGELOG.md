# Changelog

## [Unreleased] — 2026-05-26

### Transaction System Rewrite

This release contains a ground-up rewrite of the expense/transaction layer, removal of the standalone Bills feature, and comprehensive test coverage for all split calculations.

#### Expense Model Overhaul
- **New spec-compliant `Expense` type** — replaces legacy flat model with rich nested structure:
  - `title`, `totalAmount`, `currency`, `category`, `contextType` (`group` | `non_group`)
  - `participants[]` with `isActive` / `isExcluded` support (self-exclusion)
  - `payerMode` (`single` | `multiple`) + `payers[]` with exact amounts
  - `splitMethod` (`equal` | `exact` | `percentage` | `shares` | `adjustment`) + `splits[]`
  - `isRecurring` + `recurrenceRule`, `attachments[]`, `isSettlement`
- **Soft deletes** — `DELETE /api/expenses/:id` now soft-deletes (`isDeleted: true`) and reverses materialized balances atomically within a MongoDB transaction
- **Edit with balance reversal** — `PATCH` fetches old expense, reverses old balances, applies new balances in one transaction

#### Bills Feature Removed
- **Frontend** — deleted `BillsScreen.tsx`, `BillDetailScreen.tsx`, `RemindersScreen.tsx`, `AddBillModal.tsx`
- **Backend** — deleted `src/routes/bills.js`, `src/models/Bill.js`, bill cron from `server.js`
- **Store** — removed all `bill*` actions, `bills` state, `splitTemplates`, `exchangeRates` persistence
- Future "bills" use `isRecurring: true` on Expense

#### New Split Methods (5 total)
| Method | Description |
|--------|-------------|
| `equal` | Divide equally; remainder to first participant (or payer) |
| `exact` | Each participant enters their exact owed amount |
| `percentage` | Percentage inputs; converted to cents with remainder to last |
| `shares` | Weighted proportional split (e.g., 3:2:1) |
| `adjustment` | Base equal + per-person ± delta; adjustments must sum to 0 |

#### New Frontend Components
- `ParticipantSelector` — toggle participants with self-exclusion support
- `PayerSelector` — single/multiple payer mode with exact amount inputs
- `SplitConfigurator` — all 5 split methods with live validation and running totals
- `CategoryPicker` — visual category selection
- `CurrencySelector` — searchable currency dropdown
- `DatePickerField` — MD3 date picker wrapper
- `ExpenseSummaryBar` — live summary of who paid / who owes what

#### New Screen
- **`AddExpenseScreen.tsx`** — full Splitwise-style screen replacing `AddExpenseModal`
  - Group vs Non-Group context tabs
  - All 5 split methods with real-time validation
  - Edit mode (loads existing expense via `expenseId` param)
  - Guest mode support (local-only storage)

#### New Utilities
- **`src/utils/splitCalculations.ts`** — cent-precision split calculators (integer math, no floating-point drift)
- **`src/utils/expenseValidation.ts`** — client-side mirror of all backend spec validation rules
- **`src/utils/balances.ts`** — updated `computeBalances`, added `simplifyDebts()` and `getWhoOwesWho()`

#### Navigation Updates
- `RootNavigator` — replaced `AddExpenseModal` with `AddExpense` screen; removed `AddBillModal`
- `AppNavigator` — removed `BillDetailScreen` tab reference
- Updated `GroupDetailScreen`, `HomeScreen`, `ActivityScreen`, `SettleUpModal`, `SearchScreen`, `AnalyticsScreen`, `FriendDetailScreen`, `FriendsScreen`, `GroupsScreen`, `SettingsScreen` for new types

#### Test Coverage
- **`src/utils/__tests__/splitCalculations.test.ts`** — 38 tests (equal/exact/percentage/shares/adjustment + finance invariants)
- **`src/utils/__tests__/expenseValidation.test.ts`** — 29 tests (global rules G1–G8, payer rules MP1–MP3, split rules SM1–SM7, self-exclusion)
- **`src/utils/__tests__/balances.test.ts`** — 28 tests (computeBalances, simplifyDebts, getWhoOwesWho)
- **Total: 96 tests across 4 suites**, all passing

#### Type System
- Replaced legacy `Expense`, `Bill`, `ActivityEntry`, `SplitTemplate` types with spec-compliant definitions
- New types: `Participant`, `Payer`, `Split`, `SplitMethod`, `ContextType`, `PayerMode`, `Activity`
- Legacy mapping in `apiExpenseToLocal`: `unequal`→`exact`, `itemized`→`adjustment`

---

## [Unreleased] — 2026-05-24

### App Rename: FinCoordApp → OnTheTab

- **package.json** — app name updated to `onthetab`
- **app.json** — `name` and `displayName` updated to `"OnTheTab"`
- **Android package** — `com.fincoordapp` → `com.onthetab` (`android/app/build.gradle`, `MainActivity.kt`, `MainApplication.kt`, directory structure)
- **Android module name** — `MainActivity.kt` `getMainComponentName()` now returns `"OnTheTab"`
- **Android settings.gradle** — `rootProject.name = 'OnTheTab'`
- **iOS target/directory** — `ios/FinCoordApp/` → `ios/OnTheTab/` (all contents moved)
- **iOS module name** — `AppDelegate.swift` factory call uses `"OnTheTab"`
- **Source code strings** — 13+ files updated to replace user-facing "FinCoord" references with "OnTheTab"

### App Icon & Splash Screen

- **iOS AppIcon set** — regenerated all 13 sizes from `high-resolution-color-logo-2.png` (mint "Onthetab" wordmark on black `#080808` background)
- **Android mipmap icons** — regenerated all 5 densities (mdpi through xxxhdpi) for both `ic_launcher.png` and `ic_launcher_round.png`
- **iOS LaunchScreen.storyboard** — replaced "O" lettermark + text labels with `SplashLogo` image view (wordmark centered) + "Keep tabs, not grudges." tagline
- **Android splash** — inherits updated wordmark via `@mipmap/ic_launcher`
- **New asset catalog** — `ios/OnTheTab/Images.xcassets/SplashLogo.imageset/` created

### Theme System Fixes

- **`src/theme/tokens.ts`**
  - Added `lightColors` alias for backward compatibility
  - Added `primary`, `overlay`, `primaryLight`, `surfaceActive` to color tokens
- **`src/constants/paperTheme.ts`**
  - Widened theme type to accept extra token keys
  - Added `onSurfaceDisabled` color
  - Integrated `configureFonts({ config: { fontFamily: 'Inter' } })` for MD3 font map
- **`src/context/ThemeContext.tsx`**
  - `useAppTheme()` now returns `theme` key for backward compat
  - `useTheme()` returns both Paper MD3 colors and raw token aliases
  - Expanded `AppTheme` type with `text`, `onPrimary`, `info`, `outline`, `disabled`
  - Removed `initialDark` prop from `ThemeProvider`

### In-App Branding & UI

- **`src/screens/WelcomeScreen.tsx`**
  - Replaced generic `bank-transfer` icon with bold "O" lettermark logo
  - New tagline: *"Keep tabs, not grudges."*
  - Refined dark-mode gradient and button styling
- **Auth screen logos** — all auth screens now use consistent "O" lettermark in brand circle:
  - `SignInScreen.tsx`
  - `SignUpScreen.tsx`
  - `ForgotPasswordScreen.tsx`
  - `ResetPasswordScreen.tsx`
- **`src/screens/SettingsScreen.tsx`**
  - Removed 7 redundant menu items (Analytics, Bills, Add Bill, Add Expense, Search, Friends, My QR Code)
  - Reorganized into 4 sections: Profile card → Preferences → OnThe Tab Pro → Data & Privacy → Sign Out
- **`src/screens/AddExpenseModal.tsx`**
  - Wrapped form in `ScrollView` with `keyboardShouldPersistTaps="handled"`
  - Removed `flex: 1` from description field
  - Moved toolbar outside ScrollView for fixed positioning
  - Fixed "No group" text color
  - Added bottom padding for safe area

### Bug Fixes

- **Missing `react-native-url-polyfill`** — installed package and fixed import in `App.tsx`
- **Missing `AuthNavigator` reference** — restored `App.tsx` to use `RootNavigator` (which already contains the auth flow)
- **Theme crash (`Cannot read property 'primary' of undefined`)** — fixed by expanding token exports and Paper theme type
- **Duplicate `useTheme` import in `HomeScreen.tsx`** — removed duplicate import
- **Android emulator crash (`NativeEventEmitter` null argument)** — fixed stale `MainActivity.kt` module name `"FinCoordApp"` → `"OnTheTab"`

### Icon Fixes

- `receipt-text-outline` → `receipt`
- `receipt-text-plus-outline` → `cash-plus`

### Native Config Updates

- **iOS `Info.plist`** — permission descriptions (`NSCameraUsageDescription`, `NSPhotoLibraryAddUsageDescription`, `NSPhotoLibraryUsageDescription`) now say "OnTheTab"
- **`src/services/notificationService.ts`** — notification channel ID: `fincoord-default` → `onthetab-default`
- **`src/utils/exportData.ts`** — export filename prefix: `fincoord_export_` → `onthetab_export_`

### Loading Screen

- **`App.tsx`** — loading screen lettermark changed from `"F"` (old FinCoord branding) to `"O"`
