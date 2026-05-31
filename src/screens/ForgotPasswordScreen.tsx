import React, { useState, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, TextInput as RNTextInput } from 'react-native';
import { TextInput, Button, Text, HelperText, Icon, Surface, IconButton } from 'react-native-paper';
import { useAppTheme } from '../context/ThemeContext';
import { Images } from '../constants/images';
import { authService } from '../services/authService';
import { haptics } from '../utils/haptics';

type Step = 'email' | 'otp' | 'password';

export default function ForgotPasswordScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const [step, setStep] = useState<Step>('email');

  // Email step
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  // OTP step
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpTouched, setOtpTouched] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [testOtp, setTestOtp] = useState('');
  const otpInputRefs = useRef<(RNTextInput | null)[]>([]);

  // Password step
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailError = touched && !emailRegex.test(email);

  const handleSendOtp = async () => {
    setTouched(true);
    if (!emailRegex.test(email)) return;
    haptics.medium();
    setLoading(true);
    setError('');
    try {
      const res = await authService.sendOtp(email);
      setTestOtp(res.otp); // Display the test OTP
      setStep('otp');
      startResendTimer();
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setOtpError('');
    try {
      const res = await authService.sendOtp(email);
      setTestOtp(res.otp);
      startResendTimer();
      haptics.success();
    } catch (err: any) {
      setOtpError(err.message || 'Failed to resend OTP');
    }
  };

  const handleVerifyOtp = async () => {
    setOtpTouched(true);
    if (otp.length !== 6) {
      setOtpError('Please enter the 6-digit OTP');
      return;
    }
    haptics.medium();
    setOtpLoading(true);
    setOtpError('');
    try {
      await authService.verifyOtp(email, otp);
      setStep('password');
      haptics.success();
    } catch (err: any) {
      setOtpError(err.message || 'Invalid or expired OTP');
      haptics.error();
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setPasswordError('');
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    haptics.medium();
    setPasswordLoading(true);
    try {
      await authService.resetPasswordWithOtp(email, otp, newPassword);
      haptics.success();
      navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to reset password');
      haptics.error();
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    const newOtp = otp.split('');
    newOtp[index] = cleaned[0] || '';
    setOtp(newOtp.join(''));

    // Auto-advance to next input
    if (cleaned.length > 0 && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // ── Email Step ────────────────────────────────────────────────────────────
  const renderEmailStep = () => (
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
      {!!error && <HelperText type="error" visible style={styles.serverError}>{error}</HelperText>}

      <Button
        mode="contained"
        onPress={handleSendOtp}
        icon="send"
        loading={loading}
        disabled={loading}
        style={styles.btn}
        contentStyle={styles.btnContent}
      >
        Send OTP
      </Button>
    </>
  );

  // ── OTP Step ─────────────────────────────────────────────────────────────
  const renderOtpStep = () => (
    <>
      <Surface style={[styles.otpCard, { backgroundColor: theme.surface }]} elevation={1}>
        <Icon source="shield-check-outline" size={40} color={theme.primary} />
        <Text variant="titleMedium" style={[styles.otpTitle, { color: theme.text }]}>
          Verification Code
        </Text>
        <Text variant="bodySmall" style={[styles.otpSubtitle, { color: theme.textSecondary }]}>
          Enter the 6-digit code sent to {email}
        </Text>

        {/* Test OTP Display */}
        <Surface style={[styles.testOtpBox, { backgroundColor: theme.primary + '15' }]} elevation={0}>
          <Text variant="labelSmall" style={{ color: theme.textSecondary }}>
            TEST OTP (for development):
          </Text>
          <Text variant="titleMedium" style={{ color: theme.primary, fontWeight: '800', letterSpacing: 4 }}>
            {testOtp}
          </Text>
        </Surface>

        {/* OTP Inputs */}
        <View style={styles.otpInputsRow}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <RNTextInput
              key={i}
              ref={el => { otpInputRefs.current[i] = el; }}
              style={[styles.otpInput, {
                backgroundColor: theme.background,
                borderColor: otpTouched && otp.length < 6 && i >= otp.length ? theme.error : theme.border,
                color: theme.text,
              }]}
              keyboardType="number-pad"
              maxLength={1}
              value={otp[i] || ''}
              onChangeText={v => handleOtpChange(v, i)}
              onKeyPress={e => handleOtpKeyPress(e, i)}
              onFocus={() => setOtpTouched(true)}
              textAlign="center"
              placeholder="•"
              placeholderTextColor={theme.textSecondary}
            />
          ))}
        </View>

        {otpError ? (
          <Text variant="bodySmall" style={{ color: theme.error, marginTop: 8 }}>
            {otpError}
          </Text>
        ) : null}

        <Button
          mode="text"
          onPress={handleResendOtp}
          disabled={resendTimer > 0}
          style={{ marginTop: 16 }}
          textColor={theme.primary}
        >
          {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
        </Button>
      </Surface>

      <Button
        mode="contained"
        onPress={handleVerifyOtp}
        icon="check"
        loading={otpLoading}
        disabled={otpLoading || otp.length !== 6}
        style={styles.btn}
        contentStyle={styles.btnContent}
      >
        Verify OTP
      </Button>

      <Button
        mode="text"
        onPress={() => {
          setStep('email');
          setOtp('');
          setTestOtp('');
        }}
        style={{ marginTop: 8 }}
        textColor={theme.textSecondary}
      >
        Use a different email
      </Button>
    </>
  );

  // ── Password Step ─────────────────────────────────────────────────────────
  const renderPasswordStep = () => (
    <>
      <Surface style={[styles.passwordCard, { backgroundColor: theme.surface }]} elevation={1}>
        <Icon source="lock-check-outline" size={40} color={theme.primary} />
        <Text variant="titleMedium" style={[styles.passwordTitle, { color: theme.text }]}>
          Set New Password
        </Text>
        <Text variant="bodySmall" style={[styles.passwordSubtitle, { color: theme.textSecondary }]}>
          Enter your new password below
        </Text>

        <TextInput
          label="New Password"
          mode="outlined"
          secureTextEntry
          value={newPassword}
          onChangeText={t => { setNewPassword(t); setPasswordError(''); }}
          left={<TextInput.Icon icon="lock-outline" />}
          style={[styles.input, { marginTop: 16 }]}
        />

        <TextInput
          label="Confirm Password"
          mode="outlined"
          secureTextEntry
          value={confirmPassword}
          onChangeText={t => { setConfirmPassword(t); setPasswordError(''); }}
          left={<TextInput.Icon icon="lock-check-outline" />}
          error={passwordError.includes('match')}
          style={styles.input}
        />

        {passwordError ? (
          <Text variant="bodySmall" style={{ color: theme.error, marginTop: 4 }}>
            {passwordError}
          </Text>
        ) : null}
      </Surface>

      <Button
        mode="contained"
        onPress={handleResetPassword}
        icon="check"
        loading={passwordLoading}
        disabled={passwordLoading}
        style={styles.btn}
        contentStyle={styles.btnContent}
      >
        Reset Password
      </Button>

      <Button
        mode="text"
        onPress={() => {
          setStep('otp');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordError('');
        }}
        style={{ marginTop: 8 }}
        textColor={theme.textSecondary}
      >
        Back to OTP
      </Button>
    </>
  );

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
            {step === 'email' ? 'Forgot Password' : step === 'otp' ? 'Verify' : 'New Password'}
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.textSecondary }]}>
            {step === 'email'
              ? 'Enter your email to receive a verification code'
              : step === 'otp'
              ? 'We sent a code to your email'
              : 'Create a new password for your account'}
          </Text>
        </View>

        {step === 'email' && renderEmailStep()}
        {step === 'otp' && renderOtpStep()}
        {step === 'password' && renderPasswordStep()}

        <View style={styles.footer}>
          <Text variant="bodyMedium" style={{ color: theme.textSecondary }}>
            Remember your password?{' '}
          </Text>
          <Button mode="text" compact textColor={theme.primary} onPress={() => navigation.navigate('SignIn')}>
            Sign In
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

  // OTP step styles
  otpCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    width: '100%',
  },
  otpTitle: { marginTop: 12, marginBottom: 4, fontWeight: '700' },
  otpSubtitle: { textAlign: 'center', marginBottom: 16 },
  testOtpBox: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  otpInputsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Password step styles
  passwordCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    width: '100%',
  },
  passwordTitle: { marginTop: 12, marginBottom: 4, fontWeight: '700' },
  passwordSubtitle: { textAlign: 'center', marginBottom: 8 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
});