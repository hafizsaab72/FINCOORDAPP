/** @format */

import React, { useEffect, useState } from 'react';
import { StatusBar, useColorScheme, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
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

// Force Manrope on all plain React Native Text components as a fallback
(Text as any).defaultProps = { ...(Text as any).defaultProps, style: { fontFamily: 'Manrope' } };

const queryClient = new QueryClient({
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

  // On every app launch, if a token exists re-fetch the user profile
  // to sync any server-side changes (currency, name, profilePic, etc.)
  useEffect(() => {
    if (!token) {
      setAuthChecking(false);
      return;
    }
    authService.me()
      .then(user => {
        updateCurrentUser(user);
        if (user.currency) setCurrency(user.currency);
      })
      .catch(err => {
        // Only sign out on confirmed 401 Unauthorized.
        // Network errors should NOT wipe local data.
        if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
          signOut();
        }
      })
      .finally(() => setAuthChecking(false));

    // Register FCM device token with backend
    registerDeviceToken(token);

    // Fetch exchange rates on launch (with 24h TTL handled internally)
    fetchExchangeRates().catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          backgroundColor: theme.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        elevation={0}>
        <Surface
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: theme.primary,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
          }}
          elevation={1}>
          <PaperText variant="displaySmall" style={{ color: '#FFF', fontFamily: 'Manrope', fontWeight: '800' }}>
            F
          </PaperText>
        </Surface>
        <ActivityIndicator animating color={theme.primary} />
      </Surface>
    );
  }

  return (
    <PaperProvider theme={isDark ? paperDarkTheme : paperLightTheme}>
      <NavigationContainer ref={navigationRef} linking={linking}>
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
        <ThemeProvider initialDark={isDarkMode}>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
