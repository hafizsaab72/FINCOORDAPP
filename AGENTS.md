# OnTheTab — Agent Guide

OnTheTab is a React Native mobile application for shared expense management and friend-based financial coordination. It is the client for the companion **FinCoordAPI** backend (Express + MongoDB Atlas).

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.84.1 (New Architecture / Fabric) + TypeScript 5.8 |
| Navigation | React Navigation v7 (`@react-navigation/native-stack`, `@react-navigation/bottom-tabs`) |
| UI | React Native Paper v5 (Material Design 3) + `react-native-vector-icons` (MDI icons) |
| State | Zustand v5 + `@react-native-async-storage/async-storage` (offline-first persistence) |
| Auth (client) | `@react-native-firebase/auth` (Phone OTP) + custom JWT backend |
| Push | `@react-native-firebase/messaging` + `@notifee/react-native` |
| Charts | `react-native-gifted-charts` |
| Image / Camera | `react-native-image-picker`, `react-native-vision-camera` |
| QR | `react-native-qrcode-svg` |
| Backend API | FinCoordAPI (Express + MongoDB Atlas) |

**Node requirement:** `>= 22.11.0`

## Project Structure

```
src/
├── components/     Reusable UI: AppCard, AppSearchBar, SummaryTile, StatusChip,
│                   ParticipantSelector, PayerSelector, SplitConfigurator, CategoryPicker,
│                   CurrencySelector, DatePickerField, ExpenseSummaryBar, CountryCodePicker,
│                   ProGate, RemainingIndicator, EmptyState, LoadingOverlay
├── constants/      paperTheme.ts, theme.ts (custom tokens), config.ts (API base URL),
│                   groupTypes.ts
├── context/        ThemeContext — useAppTheme(), toggleTheme()
├── navigation/     RootNavigator (auth stack + modals + screens), AppNavigator (bottom tabs)
├── screens/        All screen and modal components (see list below)
├── services/       api.ts, authService.ts, currencyService.ts, notificationService.ts,
│                   friendsService.ts, groupsService.ts, activitiesService.ts, expensesService.ts
├── store/          useStore.ts — Zustand store with balance hooks
├── types/          index.ts — central type definitions
└── utils/          countries.ts, exportData.ts, notifications.ts, currency.ts, validation.ts,
│                   splitCalculations.ts, expenseValidation.ts, balances.ts
```

**Screens (selection):**
- Auth: `WelcomeScreen`, `SignInScreen`, `SignUpScreen`, `ForgotPasswordScreen`, `ResetPasswordScreen`
- Main: `HomeScreen`, `FriendsScreen`, `GroupsScreen`, `GroupDetailScreen`, `ActivityScreen`, `SettingsScreen`, `ProfileScreen`
- Modals: `CreateGroupModal`, `SettleUpModal`
- Expense: `AddExpenseScreen` (full-screen Splitwise-style form)
- Pro / Tools: `AnalyticsScreen`, `SearchScreen`, `UpgradeScreen`
- QR / Invite: `QRScannerScreen`, `MyQRCodeScreen`, `InviteScreen`

## Build and Run Commands

```bash
# Install dependencies
npm install

# iOS only — install CocoaPods dependencies
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on Android
npm run android          # npx react-native run-android

# Run on iOS
npm run ios              # npx react-native run-ios

# Linting
npm run lint             # eslint .

# Tests
npm test                 # jest
```

### Platform Build Notes

- **Android:** Gradle 8.x, Kotlin 2.1.20, `minSdkVersion = 24`, `compileSdkVersion = 36`, `targetSdkVersion = 36`. Firebase Google Services plugin is applied. A local Maven repo injection exists in `android/build.gradle` for `@react-native-async-storage/async-storage` v3.
- **iOS:** `platform :ios, min_ios_version_supported`. `$RNFirebaseAsStaticFramework = true` is set because Firebase 11+ modules are Swift-based. `use_modular_headers!` is enabled.

## Backend and API Configuration

The API base URL lives in `src/constants/config.ts`:

```ts
const REMOTE_URL = 'http://187.124.96.129/api';
const LOCAL_URL = `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:3050/api`;
export const API_URL = __DEV__ ? LOCAL_URL : REMOTE_URL;
```

`__DEV__` is a React Native global: `true` when the JS bundle is served by Metro (development), `false` in release builds (production).

All HTTP calls go through `src/services/api.ts` (`apiFetch`), which:
- Reads the JWT `token` from Zustand state
- Injects `Authorization: Bearer <token>`
- Throws on non-JSON or non-2xx responses

## State Management

`src/store/useStore.ts` is a single Zustand store persisted to AsyncStorage under key `fin-coord-storage`.

**Persisted fields:** `expenses`, `groups`, `activities`, `isGuest`, `currency`, `currentUser`, `token`, `isPro`.

**Key behaviors:**
- `_hasHydrated` flag blocks rendering until rehydration completes (checked in `App.tsx`).
- `setAuth` clears local data (`expenses`, `groups`, etc.) when switching to a different user.
- `signOut` wipes auth and all local data.
- `useBalances(groupId)` is a derived selector that calculates net balances per member for a group.

## Authentication Flows

1. **Email + Password:** `authService.register` / `authService.login` → store JWT + user in Zustand.
2. **Phone OTP:** Firebase Phone Auth verifies the number → exchange Firebase `idToken` with backend via `authService.phoneLogin` → store JWT + user.
3. **Forgot Password:** `authService.forgotPassword(email)` generates a secure token (SHA-256 hashed, 1-hour expiry) → user enters token + new password via `authService.resetPassword(token, newPassword)`.
5. **Guest Mode:** `setGuestStatus(true)` bypasses auth; data is local-only.
6. **Session persistence:** On app launch (`App.tsx`), if a token exists, `authService.me()` re-fetches the profile. On failure, the user is signed out silently.
7. **Phone → Email upgrade:** Phone-only users can add an email/password from `ProfileScreen`.

## Push Notifications

- **Library:** `@react-native-firebase/messaging` + `@notifee/react-native`.
- **Channel:** `onthetab-default` (created in `notificationService.ts`).
- **Registration:** FCM device token is posted to `/users/device-token` on login.
- **Handlers:**
  - Foreground: `setupForegroundHandler()` (called in `App.tsx` mount).
  - Background / quit: `setupBackgroundHandler()` (called at module level in `index.js` before `AppRegistry.registerComponent`).
- **Triggers:** friend request received, friend request accepted.

## Theming

- Two parallel theme systems:
  1. **Custom tokens** (`src/constants/theme.ts`) — `lightTheme` / `darkTheme` with `primary`, `background`, `surface`, `text`, `border`, `textSecondary`.
  2. **Paper MD3 themes** (`src/constants/paperTheme.ts`) — `paperLightTheme` / `paperDarkTheme` extending `MD3LightTheme` / `MD3DarkTheme`.
- `ThemeContext` toggles dark mode manually or from system `useColorScheme()`.
- Primary colors: `#0F7A5B` (light) / `#19A874` (dark).

## Deep Linking

Prefix: `fincoord://`

| Path | Screen |
|---|---|
| `invite?ref=<userId>` | `InviteScreen` |

Configured in `App.tsx` via `NavigationContainer` `linking` prop.

## Code Style Guidelines

**Prettier config (`.prettierrc.js`):**
- `arrowParens: 'avoid'`
- `singleQuote: true`
- `trailingComma: 'all'`

**ESLint:** Extends `@react-native` preset (`@react-native/eslint-config`).

**Conventions observed in the codebase:**
- Functional components are default exports: `export default function ComponentName() { ... }`.
- Services are plain objects with async methods (e.g., `authService`, `friendsService`).
- Types are centralized in `src/types/index.ts`.
- Relative imports use `../` paths (no path aliases configured).
- Some files use `// ─── Section Name ───────────────────────────────────────────────────────────` comment dividers.
- A few entry files (`index.js`, `__tests__/App.test.tsx`) include a `/** @format */` JSDoc header.

## Testing

- **Framework:** Jest with `react-native` preset.
- **Current coverage:** 96 tests across 4 suites.
  - `__tests__/App.test.tsx` — shallow-render `<App />`
  - `src/utils/__tests__/splitCalculations.test.ts` — 38 tests for all 5 split methods + finance invariants
  - `src/utils/__tests__/expenseValidation.test.ts` — 29 tests for spec validation rules
  - `src/utils/__tests__/balances.test.ts` — 28 tests for balance computation, debt simplification, and who-owes-who

## Security and Privacy Considerations

- **JWT storage:** Tokens are stored in Zustand and persisted to AsyncStorage (unencrypted). This is standard for React Native but not hardened.
- **Firebase config files:** `android/app/google-services.json` and `ios/OnTheTab/GoogleService-Info.plist` are required for Phone Auth and Push but are **gitignored**.
- **Remote server:** The production API points to a hard-coded IP address (`187.124.96.129`) over plain HTTP.
- **Profile pictures:** Stored as base64 data URLs in MongoDB (not in a separate blob store).
- **Guest data:** Guest-mode data never leaves the device; it is local-only.

## Native Dependencies Requiring Extra Setup

| Package | Setup Note |
|---|---|
| `@react-native-firebase/app` | Requires `google-services.json` (Android) and `GoogleService-Info.plist` (iOS). |
| `@react-native-firebase/auth` | Enable Phone sign-in in Firebase Console; Blaze plan required for production OTP. |
| `@notifee/react-native` | Creates notification channel at runtime. |
| `react-native-vision-camera` | May need camera permission plist strings and runtime permissions. |
| `react-native-contacts` | Requires contacts permission. |
| `react-native-image-picker` | Requires photo/camera permissions. |
| `react-native-vector-icons` | Linked via `fonts.gradle` on Android; fonts must be included in iOS build. |

## Assets

The app has no bundled JS image assets. All logos and icons are generated directly into native platform directories:

- **iOS AppIcon:** `ios/OnTheTab/Images.xcassets/AppIcon.appiconset/` (13 sizes, 20×20 to 1024×1024)
- **iOS Splash Logo:** `ios/OnTheTab/Images.xcassets/SplashLogo.imageset/` (wordmark for LaunchScreen)
- **Android Launcher Icons:** `android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher.png` + `ic_launcher_round.png`

The wordmark source is `high-resolution-color-logo-2.png` (mint "Onthetab" text on transparent) composited onto black `#080808`.

## Android Splash Screen

On Android 12+ (API 31+), the OS enforces a **system splash screen** using the adaptive icon. The app extends this splash via `MainActivity.kt`:
- `SplashTheme` (`launch_background.xml`) shows the branded icon on a black background
- `splashScreen.setOnExitAnimationListener` delays dismissal by **1.5 seconds**, giving React Native time to fully render before the splash is removed
- `AppTheme` `windowBackground` is set to `#0A0A0A` to match the welcome screen's dark gradient, preventing any visible flash

**Key files:**
- `android/app/src/main/res/values/styles.xml` — `SplashTheme` + `AppTheme`
- `android/app/src/main/res/drawable/launch_background.xml` — black bg + centered icon
- `android/app/src/main/java/com/onthetab/MainActivity.kt` — `setOnExitAnimationListener` delay
- `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` — adaptive icon definition

## Deployment Notes

- No CI/CD pipelines or Fastlane configuration are present in the repository.
- Releases are currently built manually via `npx react-native run-android` / `run-ios` or via native IDE builds.
- A `.github/java-upgrade/` folder exists with a hook script (`recordToolUse.sh` / `.ps1`), but it is not part of the main build workflow.
