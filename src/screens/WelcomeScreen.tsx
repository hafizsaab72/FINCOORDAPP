import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Icon, Surface } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import { useAppTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';
import { haptics } from '../utils/haptics';

export default function WelcomeScreen({ navigation }: any) {
  const { theme, isDark } = useAppTheme();
  const setGuestStatus = useStore(state => state.setGuestStatus);
  const signOut = useStore(state => state.signOut);

  const handleGuest = () => {
    haptics.light();
    signOut();
    setGuestStatus(true);
    navigation.navigate('MainTabs');
  };

  const gradientColors = isDark
    ? ['#1E1B4B', '#0B0F19', '#0B0F19']
    : ['#4F46E5', '#6366F1', '#F8FAFC'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      <View style={styles.content}>
        <Surface
          style={[styles.logoCircle, { backgroundColor: '#FFFFFF' }]}
          elevation={2}
        >
          <Icon source="bank-transfer" size={40} color={theme.primary} />
        </Surface>
        <Text
          variant="displaySmall"
          style={[styles.title, { color: isDark ? theme.text : '#FFFFFF' }]}
        >
          FinCoord
        </Text>
        <Text
          variant="bodyLarge"
          style={[styles.subtitle, { color: isDark ? theme.textSecondary : 'rgba(255,255,255,0.85)' }]}
        >
          Shared expenses and bill reminders, simplified.
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => {
            haptics.medium();
            navigation.navigate('SignUp');
          }}
          icon="account-plus"
          contentStyle={styles.btnContent}
          style={[styles.btn, { backgroundColor: theme.primary }]}
          labelStyle={{ fontFamily: 'Manrope', fontWeight: '700' }}
        >
          Create Account
        </Button>
        <Button
          mode="outlined"
          onPress={() => {
            haptics.medium();
            navigation.navigate('SignIn');
          }}
          icon="login"
          contentStyle={styles.btnContent}
          style={[styles.btn, { borderColor: isDark ? theme.border : '#FFFFFF' }]}
          textColor={isDark ? theme.text : '#FFFFFF'}
          labelStyle={{ fontFamily: 'Manrope', fontWeight: '700' }}
        >
          Sign In
        </Button>
        <Button
          mode="text"
          onPress={handleGuest}
          icon="account-arrow-right"
          textColor={isDark ? theme.textSecondary : 'rgba(255,255,255,0.8)'}
          contentStyle={styles.btnContent}
          labelStyle={{ fontFamily: 'Manrope', fontWeight: '600' }}
        >
          Continue as Guest
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontFamily: 'Manrope', fontWeight: '800' },
  subtitle: { textAlign: 'center', paddingHorizontal: 24, fontFamily: 'Manrope', fontWeight: '500' },
  footer: { gap: 12, marginBottom: 40 },
  btn: { borderRadius: 12 },
  btnContent: { paddingVertical: 8 },
});
