import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText, Icon } from 'react-native-paper';
import { useAppTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';
import { authService } from '../services/authService';

export default function SignUpScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const setAuth = useStore(state => state.setAuth);
  const setCurrency = useStore(state => state.setCurrency);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameError = touched && name.trim().length < 2;
  const emailError = touched && !email.includes('@');
  const passwordError = touched && password.length < 6;
  const confirmError = touched && confirmPassword !== password;

  const handleSignUp = async () => {
    setTouched(true);
    if (
      name.trim().length < 2 ||
      !email.includes('@') ||
      password.length < 6 ||
      confirmPassword !== password
    ) return;

    setLoading(true);
    setError('');
    try {
      const { token, user } = await authService.register(name, email, password);
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={[styles.logoCircle, { backgroundColor: theme.primary }]}>
            <Icon source="account-plus" size={32} color="#FFF" />
          </View>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.text }]}>
            Create account
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Start tracking shared expenses for free
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Full Name"
            mode="outlined"
            value={name}
            onChangeText={t => { setName(t); setError(''); }}
            onBlur={() => setTouched(true)}
            left={<TextInput.Icon icon="account-outline" />}
            error={nameError}
            style={styles.input}
          />
          {nameError && (
            <HelperText type="error" visible>Name must be at least 2 characters.</HelperText>
          )}

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

          <TextInput
            label="Confirm Password"
            mode="outlined"
            secureTextEntry={secureConfirm}
            value={confirmPassword}
            onChangeText={t => { setConfirmPassword(t); setError(''); }}
            onBlur={() => setTouched(true)}
            left={<TextInput.Icon icon="lock-check-outline" />}
            right={
              <TextInput.Icon
                icon={secureConfirm ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setSecureConfirm(v => !v)}
              />
            }
            error={confirmError}
            style={styles.input}
          />
          {confirmError && (
            <HelperText type="error" visible>Passwords do not match.</HelperText>
          )}

          {!!error && (
            <HelperText type="error" visible style={styles.serverError}>
              {error}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleSignUp}
            icon="account-plus"
            loading={loading}
            disabled={loading}
            style={styles.btn}
            contentStyle={styles.btnContent}
          >
            Create Account
          </Button>

          <View style={styles.footer}>
            <Text variant="bodyMedium" style={{ color: '#888' }}>
              Already have an account?{'  '}
            </Text>
            <Button
              mode="text"
              compact
              textColor={theme.primary}
              onPress={() => navigation.navigate('SignIn')}
            >
              Sign In
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24 },
  header: { alignItems: 'center', gap: 10, marginBottom: 24 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontWeight: 'bold' },
  subtitle: { color: '#888', textAlign: 'center' },
  form: {},
  input: { marginBottom: 4 },
  serverError: { marginBottom: 8 },
  btn: { marginTop: 16, borderRadius: 10 },
  btnContent: { paddingVertical: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
});
