import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { TextInput, Button, Text, HelperText, Icon, Surface } from 'react-native-paper';
import { useAppTheme } from '../context/ThemeContext';
import { Images } from '../constants/images';
import { authService } from '../services/authService';
import { haptics } from '../utils/haptics';

export default function ResetPasswordScreen({ navigation, route }: any) {
  const { theme } = useAppTheme();
  const prefillToken = route.params?.token || '';

  const [token, setToken] = useState(prefillToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [secureConfirmText, setSecureConfirmText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (prefillToken) setToken(prefillToken);
  }, [prefillToken]);

  const tokenError = touched && token.length < 10;
  const passwordError = touched && password.length < 6;
  const confirmError = touched && confirmPassword !== password;

  const handleSubmit = async () => {
    setTouched(true);
    if (token.length < 10 || password.length < 6 || confirmPassword !== password) return;
    haptics.medium();
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
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
          <Image
            source={Images.logos.primary}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text variant="headlineMedium" style={[styles.title, { color: theme.text }]}>
            Reset Password
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Enter your reset token and choose a new password
          </Text>
        </View>

        {!success ? (
          <>
            <TextInput
              label="Reset Token"
              mode="outlined"
              autoCapitalize="none"
              value={token}
              onChangeText={t => { setToken(t); setError(''); }}
              onBlur={() => setTouched(true)}
              left={<TextInput.Icon icon="key-outline" />}
              error={tokenError}
              style={styles.input}
            />
            {tokenError && <HelperText type="error" visible>Enter a valid reset token.</HelperText>}

            <TextInput
              label="New Password"
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
            {passwordError && <HelperText type="error" visible>Password must be at least 6 characters.</HelperText>}

            <TextInput
              label="Confirm Password"
              mode="outlined"
              secureTextEntry={secureConfirmText}
              value={confirmPassword}
              onChangeText={t => { setConfirmPassword(t); setError(''); }}
              onBlur={() => setTouched(true)}
              left={<TextInput.Icon icon="lock-check-outline" />}
              right={
                <TextInput.Icon
                  icon={secureConfirmText ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setSecureConfirmText(v => !v)}
                />
              }
              error={confirmError}
              style={styles.input}
            />
            {confirmError && <HelperText type="error" visible>Passwords do not match.</HelperText>}

            {!!error && <HelperText type="error" visible style={styles.serverError}>{error}</HelperText>}

            <Button
              mode="contained"
              onPress={handleSubmit}
              icon="lock-reset"
              loading={loading}
              disabled={loading}
              style={styles.btn}
              contentStyle={styles.btnContent}
            >
              Reset Password
            </Button>
          </>
        ) : (
          <>
            <Surface style={[styles.successCard, { backgroundColor: theme.surface }]} elevation={1}>
              <Icon source="check-circle-outline" size={48} color={theme.primary} />
              <Text variant="titleMedium" style={[styles.successTitle, { color: theme.text }]}>
                Password reset successful
              </Text>
              <Text variant="bodySmall" style={[styles.successBody, { color: theme.textSecondary }]}>
                Your password has been updated. You can now sign in with your new password.
              </Text>
            </Surface>

            <Button
              mode="contained"
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] })}
              icon="login"
              style={styles.btn}
              contentStyle={styles.btnContent}
            >
              Back to Sign In
            </Button>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24 },
  header: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  logo: {
    width: 160,
    height: 60,
    marginBottom: 8,
    resizeMode: 'contain',
  },
  title: { fontWeight: '700' },
  subtitle: { textAlign: 'center' },
  input: { marginBottom: 4 },
  serverError: { marginBottom: 8 },
  btn: { marginTop: 12, borderRadius: 10 },
  btnContent: { paddingVertical: 6 },
  successCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  successTitle: { marginTop: 12, marginBottom: 6, fontWeight: '700' },
  successBody: { textAlign: 'center' },
});
