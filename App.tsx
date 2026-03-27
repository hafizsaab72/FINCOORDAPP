import React, { useEffect } from 'react';
import { StatusBar, useColorScheme, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { paperLightTheme, paperDarkTheme } from './src/constants/paperTheme';
import RootNavigator from './src/navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from './src/store/useStore';
import { authService } from './src/services/authService';

function AppContent() {
  const { isDark, theme } = useAppTheme();
  const token = useStore(state => state.token);
  const updateCurrentUser = useStore(state => state.updateCurrentUser);
  const setCurrency = useStore(state => state.setCurrency);
  const signOut = useStore(state => state.signOut);
  const hasHydrated = useStore(state => state._hasHydrated);

  // On every app launch, if a token exists re-fetch the user profile
  // to sync any server-side changes (currency, name, profilePic, etc.)
  useEffect(() => {
    if (!token) return;
    authService.me()
      .then(user => {
        updateCurrentUser(user);
        if (user.currency) setCurrency(user.currency);
      })
      .catch(() => {
        // Token expired or invalid — sign out silently
        signOut();
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (!hasHydrated) {
    return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  }

  return (
    <PaperProvider theme={isDark ? paperDarkTheme : paperLightTheme}>
      <NavigationContainer linking={linking}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <RootNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <SafeAreaProvider>
      <ThemeProvider initialDark={isDarkMode}>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
