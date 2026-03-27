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
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAppTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';
import { authService } from '../services/authService';

export default function ProfileScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const currentUser = useStore(state => state.currentUser);
  const updateCurrentUser = useStore(state => state.updateCurrentUser);

  const [name, setName] = useState(currentUser?.name ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [bio, setBio] = useState(currentUser?.bio ?? '');
  const [profilePic, setProfilePic] = useState<string | undefined>(currentUser?.profilePic);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pickImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: true,
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.7,
      },
      response => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (!asset?.base64 || !asset.type) return;
        const dataUrl = `data:${asset.type};base64,${asset.base64}`;
        setProfilePic(dataUrl);
      },
    );
  };

  const handleSave = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Validation', 'Name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        profilePic,
      });
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
          {uploading && <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 4 }} />}
        </View>

        {/* Read-only email */}
        <View style={[styles.emailRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Text variant="bodySmall" style={{ color: '#888' }}>EMAIL</Text>
          <Text variant="bodyMedium" style={{ color: theme.text }}>{currentUser?.email}</Text>
        </View>

        {/* Editable fields */}
        <TextInput
          label="Full Name"
          mode="outlined"
          value={name}
          onChangeText={setName}
          left={<TextInput.Icon icon="account-outline" />}
          style={styles.input}
        />
        <TextInput
          label="Phone"
          mode="outlined"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          left={<TextInput.Icon icon="phone-outline" />}
          style={styles.input}
        />
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
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: { color: '#FFF', fontSize: 14 },
  emailRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    gap: 4,
  },
  input: { marginBottom: 12 },
  btn: { marginTop: 8, borderRadius: 10 },
  btnContent: { paddingVertical: 6 },
});
