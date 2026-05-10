# FinCoordApp — Theme, Font & Error Boundary Test Report

**Date:** 2026-05-01
**Scope:** Bold theme overhaul, Manrope font integration, Error Boundary addition
**Tester:** Kimi Code CLI

---

## 1. Test Matrix

| # | Test | Command / Method | Expected Result | Actual Result | Status |
|---|------|------------------|-----------------|---------------|--------|
| 1 | TypeScript type check | `npx tsc --noEmit` | Zero errors in changed files | Clean for all changed files | ✅ PASS |
| 2 | ESLint | `npm run lint` | Zero errors | 0 errors, 347 warnings (all pre-existing) | ✅ PASS |
| 3 | Unit Tests (Jest) | `npm test` | All tests pass | 1/1 passed | ✅ PASS |
| 4 | Metro Bundle (Android) | `npx react-native bundle --platform android` | Bundle builds without parse/runtime errors | Bundle written successfully | ✅ PASS |
| 5 | Metro Bundle (iOS) | `npx react-native bundle --platform ios` | Bundle builds without parse/runtime errors | Bundle written successfully | ✅ PASS |
| 6 | iOS CocoaPods | `cd ios && pod install` | Pods install cleanly | 106 pods installed, no errors | ✅ PASS |
| 7 | Android Gradle Build | `cd android && ./gradlew assembleDebug` | APK builds successfully | `BUILD SUCCESSFUL` | ✅ PASS |

---

## 2. Issues Discovered During Testing

### 2.1 TypeScript: `Text.defaultProps` Missing from RN Types
- **File:** `App.tsx`
- **Severity:** 🔴 Error (blocks `tsc`)
- **Root Cause:** React Native 0.84 TypeScript definitions removed `defaultProps` from built-in component types, but the runtime feature still works.
- **Fix:** Cast to `any`:
  ```ts
  (Text as any).defaultProps = { ...(Text as any).defaultProps, style: { fontFamily: 'Manrope' } };
  ```
- **Status:** ✅ Resolved

### 2.2 TypeScript: `fontWeight` Literal Type Widening in Navigation Headers
- **Files:** `src/navigation/AppNavigator.tsx`, `src/navigation/RootNavigator.tsx`
- **Severity:** 🔴 Error (blocks `tsc`)
- **Root Cause:** When `headerTitleStyle` is returned from a function, TypeScript widens `fontWeight: '700'` to `fontWeight: string`, which violates `NativeStackNavigationOptions` strict union type.
- **Fix:** Added `as const` assertions:
  ```ts
  fontWeight: '700' as const,
  ```
- **Status:** ✅ Resolved

### 2.3 Jest: Test Suite Completely Broken (Pre-existing)
- **Files:** `jest.config.js`, `jest.setup.js`, `__mocks__/*.js`
- **Severity:** 🔴 Error (blocks `npm test`)
- **Root Cause:** Minimal `jest.config.js` only contained `preset: 'react-native'`. Multiple modern packages use ESM/TypeScript/native modules that Jest couldn't handle:
  - `@react-navigation/native` v7 — ESM exports
  - `@notifee/react-native`, `@react-native-firebase/*`, `react-native-contacts`, `react-native-haptic-feedback`, `react-native-vision-camera` — native modules null in Node
  - `@react-native-async-storage/async-storage` v3 — tries to open IndexedDB in Node
  - `react-native-paper-dates` → `color` package — ESM import
  - `react-native-gifted-charts` → `gifted-charts-core` — ESM import
- **Fix:**
  1. Expanded `transformIgnorePatterns` in `jest.config.js` to whitelist all relevant packages
  2. Created `jest.setup.js` with mocks for every native-only dependency
  3. Created `__mocks__/react-native-linear-gradient.js`, `__mocks__/react-native-paper-dates.js`, `__mocks__/react-native-gifted-charts.js`
  4. Added `moduleNameMapper` for the three UI libraries
  5. Added `/* eslint-env jest */` to `jest.setup.js`
- **Status:** ✅ Resolved

### 2.4 ESLint: Unused Variable `_localId` (Pre-existing)
- **File:** `src/screens/AddBillModal.tsx`
- **Severity:** 🟡 Warning (treated as error by eslint config)
- **Root Cause:** `const { id: _localId, ...billPayload } = bill` triggered `@typescript-eslint/no-unused-vars` despite underscore prefix.
- **Fix:**
  ```ts
  const { id, ...billPayload } = bill;
  void id; // intentionally unused
  ```
- **Status:** ✅ Resolved

### 2.5 `react-native.config.js` Pointed to Non-existent Directory
- **File:** `react-native.config.js`
- **Severity:** 🟡 Config mismatch
- **Root Cause:** `assets: ['./src/assets/fonts/']` was declared but fonts were manually copied into native project directories.
- **Fix:** Removed the incorrect `assets` entry since fonts are manually linked in both Android (`android/app/src/main/assets/fonts/`) and iOS (`ios/FinCoordApp/` + `Info.plist`).
- **Status:** ✅ Resolved

---

## 3. Verification Commands Used

```bash
# TypeScript
cd /Users/hafizsaab/Documents/Projects/FinCoordApp && npx tsc --noEmit

# Linting
cd /Users/hafizsaab/Documents/Projects/FinCoordApp && npm run lint

# Unit tests
cd /Users/hafizsaab/Documents/Projects/FinCoordApp && npm test

# Metro bundle — Android
cd /Users/hafizsaab/Documents/Projects/FinCoordApp && \
  npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output /tmp/android-bundle.js

# Metro bundle — iOS
cd /Users/hafizsaab/Documents/Projects/FinCoordApp && \
  npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output /tmp/ios-bundle.js

# iOS pods
cd /Users/hafizsaab/Documents/Projects/FinCoordApp/ios && pod install

# Android debug build
cd /Users/hafizsaab/Documents/Projects/FinCoordApp/android && ./gradlew assembleDebug
```

---

## 4. Remaining Pre-existing Issues (Not Introduced by This Change)

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | `Cannot find namespace 'NodeJS'` | `SignInScreen.tsx`, `SignUpScreen.tsx` | 🔴 TypeScript Error |
| 2 | Inline style warnings | Multiple screens/components | 🟡 ESLint Warning |
| 3 | Nested component definitions during render | `ActivityScreen.tsx`, `FriendsScreen.tsx`, `BillDetailScreen.tsx`, etc. | 🟡 ESLint Warning |
| 4 | Deprecated Gradle features | Android build output | 🟡 Build Warning |
| 5 | Bitwise operator warnings | `AddExpenseModal.tsx`, `FriendsScreen.tsx`, `groupTypes.ts` | 🟡 ESLint Warning |

---

## 5. Files Changed During Testing / Fixes

| File | Action | Reason |
|------|--------|--------|
| `App.tsx` | Modified | Fix `Text.defaultProps` TypeScript error |
| `src/navigation/AppNavigator.tsx` | Modified | Fix `fontWeight` literal type widening |
| `src/navigation/RootNavigator.tsx` | Modified | Fix `fontWeight` literal type widening |
| `jest.config.js` | Modified | Fix broken Jest test suite |
| `jest.setup.js` | Created | Mock native modules for Jest |
| `__mocks__/react-native-linear-gradient.js` | Created | Mock LinearGradient for Jest |
| `__mocks__/react-native-paper-dates.js` | Created | Mock paper-dates for Jest |
| `__mocks__/react-native-gifted-charts.js` | Created | Mock gifted-charts for Jest |
| `src/screens/AddBillModal.tsx` | Modified | Fix unused variable lint error |
| `react-native.config.js` | Modified | Remove incorrect asset path |

---

## 6. Sign-off

All tests **PASS**. The app builds cleanly for both Android and iOS, Metro bundles successfully, and the Jest test suite is now functional.
