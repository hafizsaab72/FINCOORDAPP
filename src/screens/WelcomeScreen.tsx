import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';
import { useAppTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';

export default function WelcomeScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const setGuestStatus = useStore(state => state.setGuestStatus);

  const handleGuest = () => {
    setGuestStatus(true);
    navigation.navigate('MainTabs');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={[styles.logoCircle, { backgroundColor: theme.primary }]}>
          <Icon source="bank-transfer" size={40} color="#FFF" />
        </View>
        <Text variant="displaySmall" style={[styles.title, { color: theme.text }]}>
          FinCoord
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Shared expenses and bill reminders, simplified.
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('SignUp')}
          icon="account-plus"
          contentStyle={styles.btnContent}
          style={styles.btn}
        >
          Create Account
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('SignIn')}
          icon="login"
          contentStyle={styles.btnContent}
          style={styles.btn}
        >
          Sign In
        </Button>
        <Button
          mode="text"
          onPress={handleGuest}
          icon="account-arrow-right"
          textColor="#888"
          contentStyle={styles.btnContent}
        >
          Continue as Guest
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontWeight: 'bold' },
  subtitle: { color: '#666', textAlign: 'center', paddingHorizontal: 24 },
  footer: { gap: 12, marginBottom: 40 },
  btn: { borderRadius: 10 },
  btnContent: { paddingVertical: 6 },
});
