import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, TextInput, Button, Divider } from 'react-native-paper';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAppTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';
import { authService } from '../services/authService';
import CountryCodePicker from '../components/CountryCodePicker';
import { Country, COUNTRIES, DEFAULT_COUNTRY } from '../utils/countries';

// Phone-only accounts get a placeholder email like phone_91xxx@fincoord.internal
const isPlaceholderEmail = (email?: string) =>
  !email || email.endsWith('@fincoord.internal');

/**
 * Parse a stored phone string into (country, localNumber).
 * Handles E.164 ("+917760556716") and bare digits ("7760556716").
 */
function parseStoredPhone(phone?: string): { country: Country; localNumber: string } {
  if (!phone || phone.trim() === '') return { country: DEFAULT_COUNTRY, localNumber: '' };

  if (phone.startsWith('+')) {
    // E.164 — find best (longest) matching dial code
    const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    for (const c of sorted) {
      if (phone.startsWith(c.dialCode)) {
        return { country: c, localNumber: phone.slice(c.dialCode.length) };
      }
    }
  }

  // Bare digits — keep default country, show as localNumber
  return { country: DEFAULT_COUNTRY, localNumber: phone.replace(/\D/g, '') };
}

export default function ProfileScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const currentUser = useStore(state => state.currentUser);
  const updateCurrentUser = useStore(state => state.updateCurrentUser);

  const phoneOnly = isPlaceholderEmail(currentUser?.email);

  const parsed = parseStoredPhone(currentUser?.phone);
  const [phoneCountry, setPhoneCountry] = useState<Country>(parsed.country);
  const [localNumber, setLocalNumber] = useState(parsed.localNumber);

  const [name, setName] = useState(currentUser?.name ?? '');
  const [bio, setBio] = useState(currentUser?.bio ?? '');
  const [profilePic, setProfilePic] = useState<string | undefined>(currentUser?.profilePic);

  // Email-add fields (only for phone-only accounts)
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securePass, setSecurePass] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  const [saving, setSaving] = useState(false);

  const pickImage = () => {
    launchImageLibrary(
      { mediaType: 'photo', includeBase64: true, maxWidth: 400, maxHeight: 400, quality: 0.7 },
      response => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (!asset?.base64 || !asset.type) return;
        setProfilePic(`data:${asset.type};base64,${asset.base64}`);
      },
    );
  };

  const handleSave = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Validation', 'Name must be at least 2 characters.');
      return;
    }

    const addingEmail = phoneOnly && newEmail.trim().length > 0;
    if (addingEmail) {
      if (!newEmail.includes('@')) {
        Alert.alert('Validation', 'Enter a valid email address.');
        return;
      }
      if (newPassword.length < 6) {
        Alert.alert('Validation', 'Password must be at least 6 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert('Validation', 'Passwords do not match.');
        return;
      }
    }

    // Build E.164 phone from picker selection
    const digits = localNumber.replace(/\D/g, '');
    const fullPhone = digits ? phoneCountry.dialCode + digits : '';

    setSaving(true);
    try {
      const payload: Parameters<typeof authService.updateProfile>[0] = {
        name: name.trim(),
        phone: fullPhone,
        bio: bio.trim(),
        profilePic,
      };
      if (addingEmail) {
        payload.email = newEmail.trim();
        payload.newPassword = newPassword;
      }
      const updated = await authService.updateProfile(payload);
      updateCurrentUser(updated);
      Alert.alert('Saved', 'Profile updated successfully.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarInitial}>
                  {(currentUser?.name?.[0] ?? '?').toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.cameraOverlay, { backgroundColor: theme.primary }]}>
              <Text style={styles.cameraIcon}>✎</Text>
            </View>
          </TouchableOpacity>
          <Text variant="bodySmall" style={{ color: '#888', marginTop: 8 }}>
            Tap to change photo
          </Text>
        </View>

        {/* Email — read-only for email accounts; editable section for phone-only */}
        {phoneOnly ? (
          <View style={[styles.section, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text variant="labelSmall" style={styles.sectionLabel}>ADD EMAIL LOGIN</Text>
            <Text variant="bodySmall" style={styles.sectionHint}>
              Add an email and password so you can also sign in without OTP.
            </Text>
            <TextInput
              label="Email address"
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              value={newEmail}
              onChangeText={setNewEmail}
              left={<TextInput.Icon icon="email-outline" />}
              style={styles.input}
            />
            <TextInput
              label="New Password"
              mode="outlined"
              secureTextEntry={securePass}
              value={newPassword}
              onChangeText={setNewPassword}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={securePass ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setSecurePass(v => !v)}
                />
              }
              style={styles.input}
            />
            <TextInput
              label="Confirm Password"
              mode="outlined"
              secureTextEntry={secureConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              left={<TextInput.Icon icon="lock-check-outline" />}
              right={
                <TextInput.Icon
                  icon={secureConfirm ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setSecureConfirm(v => !v)}
                />
              }
              style={styles.input}
            />
          </View>
        ) : (
          <View style={[styles.emailRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text variant="bodySmall" style={{ color: '#888' }}>EMAIL</Text>
            <Text variant="bodyMedium" style={{ color: theme.text }}>{currentUser?.email}</Text>
          </View>
        )}

        <Divider style={{ marginBottom: 16 }} />

        {/* Name */}
        <TextInput
          label="Full Name"
          mode="outlined"
          value={name}
          onChangeText={setName}
          left={<TextInput.Icon icon="account-outline" />}
          style={styles.input}
        />

        {/* Phone with country picker */}
        <Text variant="labelSmall" style={[styles.fieldLabel, { color: '#888' }]}>PHONE</Text>
        <CountryCodePicker
          selected={phoneCountry}
          onSelect={setPhoneCountry}
          localNumber={localNumber}
          onChangeLocalNumber={setLocalNumber}
          placeholder="Phone number"
        />

        {/* Bio */}
        <TextInput
          label="Bio"
          mode="outlined"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          left={<TextInput.Icon icon="text-account" />}
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          icon="content-save-outline"
          style={styles.btn}
          contentStyle={styles.btnContent}
        >
          Save Profile
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 24, paddingTop: 32 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 40, color: '#FFF', fontWeight: 'bold' },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  cameraIcon: { color: '#FFF', fontSize: 14 },
  emailRow: {
    borderWidth: 1, borderRadius: 10,
    padding: 14, marginBottom: 16, gap: 4,
  },
  section: {
    borderWidth: 1, borderRadius: 10,
    padding: 16, marginBottom: 16, gap: 4,
  },
  sectionLabel: { color: '#888', fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  sectionHint: { color: '#aaa', marginBottom: 12 },
  fieldLabel: { fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  input: { marginBottom: 12 },
  btn: { marginTop: 8, borderRadius: 10 },
  btnContent: { paddingVertical: 6 },
});
