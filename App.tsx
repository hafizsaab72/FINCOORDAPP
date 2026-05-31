/** @format */

import 'react-native-url-polyfill/auto';
import React, { useEffect, useRef, useState } from 'react';
import { StatusBar, useColorScheme, Text } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { navigationRef } from './src/navigation/navigationRef';
import { Provider as PaperProvider, Surface, Text as PaperText, ActivityIndicator } from 'react-native-paper';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { paperLightTheme, paperDarkTheme } from './src/constants/paperTheme';
import RootNavigator from './src/navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from './src/store/useStore';
import { authService } from './src/services/authService';
import { registerDeviceToken, setupForegroundHandler } from './src/services/notificationService';
import { fetchExchangeRates } from './src/services/currencyService';
import ErrorBoundary from './src/components/ErrorBoundary';

// Force Lato on all plain React Native Text components as a fallback
(Text as any).defaultProps = { ...(Text as any).defaultProps, style: { fontFamily: 'Lato' } };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function AppContent() {
  const { isDark, theme } = useAppTheme();
  const token = useStore(state => state.token);
  const updateCurrentUser = useStore(state => state.updateCurrentUser);
  const setCurrency = useStore(state => state.setCurrency);
  const signOut = useStore(state => state.signOut);
  const hasHydrated = useStore(state => state._hasHydrated);
  const [authChecking, setAuthChecking] = useState(true);
  const lastTokenRef = useRef<string | null>(null);

  // Whenever the auth token changes (launch, sign-in, token refresh), validate
  // the session. Transactional data is fetched per-screen; nothing is cached locally.
  useEffect(() => {
    if (!token) {
      setAuthChecking(false);
      return;
    }

    // Prevent duplicate fetch for the same token within this session.
    if (lastTokenRef.current === token) {
      setAuthChecking(false);
      return;
    }
    lastTokenRef.current = token;

    authService.me()
      .then(user => {
        updateCurrentUser(user);
        if (user.currency) setCurrency(user.currency);
      })
      .catch(err => {
        // Only sign out on confirmed 401 Unauthorized.
        if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
          signOut();
        }
      })
      .finally(() => setAuthChecking(false));

    // Register FCM device token with backend
    registerDeviceToken(token);

    // Fetch exchange rates on launch (with 24h TTL handled internally)
    fetchExchangeRates().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Wire foreground notification handler
  useEffect(() => {
    const cleanup = setupForegroundHandler();
    return cleanup;
  }, []);

  const linking = {
    prefixes: ['fincoord://'],
    config: {
      screens: {
        Invite: {
          path: 'invite',
          parse: { ref: (ref: string) => ref },
        },
      },
    },
  };

  if (!hasHydrated || authChecking) {
    return (
      <Surface
        style={{
          flex: 1,
          backgroundColor: '#000000',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        elevation={0}>
        <ActivityIndicator animating color={theme.primary} />
      </Surface>
    );
  }

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: theme.background,
          card: theme.surface,
          text: theme.text,
          border: theme.border,
          primary: theme.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: theme.background,
          card: theme.surface,
          text: theme.text,
          border: theme.border,
          primary: theme.primary,
        },
      };

  return (
    <PaperProvider theme={isDark ? paperDarkTheme : paperLightTheme}>
      <NavigationContainer ref={navigationRef} linking={linking} theme={navTheme}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.background}
          translucent
        />
        <RootNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
