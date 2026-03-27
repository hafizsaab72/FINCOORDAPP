import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText, Icon } from 'react-native-paper';
import { useAppTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';
import { authService } from '../services/authService';

export default function SignInScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const setAuth = useStore(state => state.setAuth);
  const setCurrency = useStore(state => state.setCurrency);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailError = touched && !email.includes('@');
  const passwordError = touched && password.length < 6;

  const handleSignIn = async () => {
    setTouched(true);
    if (!email.includes('@') || password.length < 6) return;

    setLoading(true);
    setError('');
    try {
      const { token, user } = await authService.login(email, password);
      setAuth(user, token);
      if (user.currency) setCurrency(user.currency);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View style={[styles.logoCircle, { backgroundColor: theme.primary }]}>
          <Icon source="bank-transfer" size={32} color="#FFF" />
        </View>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.text }]}>
          Welcome back
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Sign in to your FinCoord account
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          label="Email"
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={t => { setEmail(t); setError(''); }}
          onBlur={() => setTouched(true)}
          left={<TextInput.Icon icon="email-outline" />}
          error={emailError}
          style={styles.input}
        />
        {emailError && (
          <HelperText type="error" visible>Enter a valid email address.</HelperText>
        )}

        <TextInput
          label="Password"
          mode="outlined"
          secureTextEntry={secureText}
          value={password}
          onChangeText={t => { setPassword(t); setError(''); }}
          onBlur={() => setTouched(true)}
          left={<TextInput.Icon icon="lock-outline" />}
          right={
            <TextInput.Icon
              icon={secureText ? 'eye-off-outline' : 'eye-outline'}
              onPress={() => setSecureText(v => !v)}
            />
          }
          error={passwordError}
          style={styles.input}
        />
        {passwordError && (
          <HelperText type="error" visible>Password must be at least 6 characters.</HelperText>
        )}

        {!!error && (
          <HelperText type="error" visible style={styles.serverError}>
            {error}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleSignIn}
          icon="login"
          loading={loading}
          disabled={loading}
          style={styles.btn}
          contentStyle={styles.btnContent}
        >
          Sign In
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium" style={{ color: '#888' }}>
            Don't have an account?{'  '}
          </Text>
          <Button
            mode="text"
            compact
            textColor={theme.primary}
            onPress={() => navigation.navigate('SignUp')}
          >
            Sign Up
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24 },
  header: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontWeight: 'bold' },
  subtitle: { color: '#888' },
  form: { flex: 1, justifyContent: 'flex-start', paddingTop: 8 },
  input: { marginBottom: 4 },
  serverError: { marginBottom: 8 },
  btn: { marginTop: 16, borderRadius: 10 },
  btnContent: { paddingVertical: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
});
