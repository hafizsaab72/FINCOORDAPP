import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText, SegmentedButtons, Icon } from 'react-native-paper';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { useAppTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';
import { authService } from '../services/authService';
import CountryCodePicker from '../components/CountryCodePicker';
import { Country, DEFAULT_COUNTRY } from '../utils/countries';

type Tab = 'email' | 'phone';
type PhoneStep = 'number' | 'otp';

export default function SignInScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const setAuth = useStore(state => state.setAuth);
  const setCurrency = useStore(state => state.setCurrency);

  const [tab, setTab] = useState<Tab>('email');

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);

  // Phone state
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [localNumber, setLocalNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('number');
  const confirmationRef = useRef<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // Full E.164 number
  const fullPhone = country.dialCode + localNumber.replace(/\D/g, '');

  // ── Email sign-in ────────────────────────────────────────────────────────
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailError = touched && !emailRegex.test(email);
  const passwordError = touched && password.length < 6;

  const handleEmailSignIn = async () => {
    setTouched(true);
    if (!emailRegex.test(email) || password.length < 6) return;
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

  // ── Phone: send OTP ───────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setTouched(true);
    const digits = localNumber.replace(/\D/g, '');
    if (digits.length < 5) {
      setError('Enter your local phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const confirmation = await auth().signInWithPhoneNumber(fullPhone);
      confirmationRef.current = confirmation;
      setPhoneStep('otp');
      setResendCooldown(30);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      cooldownRef.current = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Phone: verify OTP ─────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    setTouched(true);
    if (otp.length < 4) {
      setError('Enter the OTP sent to your phone');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const credential = await confirmationRef.current!.confirm(otp);
      const idToken = await credential!.user.getIdToken();
      const { token, user } = await authService.phoneLogin(idToken, undefined, country.iso);
      setAuth(user, token);
      if (user.currency) setCurrency(user.currency);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (err: any) {
      setError(err.code === 'auth/invalid-verification-code' ? 'Incorrect OTP. Try again.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPhone = () => {
    setPhoneStep('number');
    setOtp('');
    setError('');
    confirmationRef.current = null;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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

        <SegmentedButtons
          value={tab}
          onValueChange={v => { setTab(v as Tab); setError(''); setTouched(false); resetPhone(); }}
          buttons={[
            { value: 'email', label: 'Email', icon: 'email-outline' },
            { value: 'phone', label: 'Phone', icon: 'phone-outline' },
          ]}
          style={styles.tabs}
        />

        {/* ── Email Tab ── */}
        {tab === 'email' && (
          <>
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
            {emailError && <HelperText type="error" visible>Enter a valid email address.</HelperText>}

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
            {passwordError && <HelperText type="error" visible>Password must be at least 6 characters.</HelperText>}

            {!!error && <HelperText type="error" visible style={styles.serverError}>{error}</HelperText>}

            <Button
              mode="contained"
              onPress={handleEmailSignIn}
              icon="login"
              loading={loading}
              disabled={loading}
              style={styles.btn}
              contentStyle={styles.btnContent}
            >
              Sign In
            </Button>
          </>
        )}

        {/* ── Phone Tab — Enter number ── */}
        {tab === 'phone' && phoneStep === 'number' && (
          <>
            <CountryCodePicker
              selected={country}
              onSelect={setCountry}
              localNumber={localNumber}
              onChangeLocalNumber={t => { setLocalNumber(t); setError(''); }}
            />
            <Text variant="bodySmall" style={styles.hint}>
              Sending OTP to: {fullPhone || `${country.dialCode}…`}
            </Text>

            {!!error && <HelperText type="error" visible style={styles.serverError}>{error}</HelperText>}

            <Button
              mode="contained"
              onPress={handleSendOtp}
              icon="message-text-outline"
              loading={loading}
              disabled={loading}
              style={styles.btn}
              contentStyle={styles.btnContent}
            >
              Send OTP
            </Button>
          </>
        )}

        {/* ── Phone Tab — Enter OTP ── */}
        {tab === 'phone' && phoneStep === 'otp' && (
          <>
            <Text variant="bodyMedium" style={[styles.otpInfo, { color: theme.text }]}>
              OTP sent to {fullPhone}
            </Text>

            <TextInput
              label="One-time password"
              mode="outlined"
              keyboardType="number-pad"
              value={otp}
              onChangeText={t => { setOtp(t); setError(''); }}
              left={<TextInput.Icon icon="shield-key-outline" />}
              style={styles.input}
              maxLength={6}
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
            />

            {!!error && <HelperText type="error" visible style={styles.serverError}>{error}</HelperText>}

            <Button
              mode="contained"
              onPress={handleVerifyOtp}
              icon="check-circle-outline"
              loading={loading}
              disabled={loading}
              style={styles.btn}
              contentStyle={styles.btnContent}
            >
              Verify & Sign In
            </Button>

            <Button
              mode="text"
              onPress={handleSendOtp}
              disabled={resendCooldown > 0 || loading}
              style={{ marginTop: 4 }}
            >
              {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
            </Button>
            <Button mode="text" onPress={resetPhone} style={{ marginTop: 4 }}>
              Change number
            </Button>
          </>
        )}

        <View style={styles.footer}>
          <Text variant="bodyMedium" style={{ color: theme.textSecondary }}>
            Don't have an account?{'  '}
          </Text>
          <Button mode="text" compact textColor={theme.primary} onPress={() => navigation.navigate('SignUp')}>
            Sign Up
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24 },
  header: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  title: { fontWeight: 'bold' },
  subtitle: { color: '#888' },
  tabs: { marginBottom: 20 },
  input: { marginBottom: 4 },
  hint: { color: '#888', marginBottom: 8, marginLeft: 2 },
  otpInfo: { marginBottom: 12, fontWeight: '500' },
  serverError: { marginBottom: 8 },
  btn: { marginTop: 12, borderRadius: 10 },
  btnContent: { paddingVertical: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
});
