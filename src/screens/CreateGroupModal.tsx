import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TextInput, Button, HelperText, Text, IconButton,
  TouchableRipple, Surface, Checkbox, Icon, Divider,
} from 'react-native-paper';
import { launchImageLibrary } from 'react-native-image-picker';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { groupsService, apiGroupToGroup } from '../services/groupsService';
import { friendsService, FriendUser } from '../services/friendsService';
import { GROUP_TYPES, GROUP_ICONS, getGroupIconConfig } from '../constants/groupTypes';
import { haptics } from '../utils/haptics';

export default function CreateGroupModal({ navigation }: any) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(state => state.currentUser);

  // ── Form state ───────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(GROUP_ICONS[0].key);
  const [selectedType, setSelectedType] = useState<string>('other');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // ── Friends / members ────────────────────────────────────────────────────
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [friendsLoading, setFriendsLoading] = useState(false);

  // ── Validation ───────────────────────────────────────────────────────────
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const nameError = touched && name.trim().length < 2;
  const canCreate = name.trim().length >= 2;

  // ── Load friends ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    setFriendsLoading(true);
    friendsService.getFriends()
      .then(data => setFriends(data.friends ?? []))
      .catch(() => setFriends([]))
      .finally(() => setFriendsLoading(false));
  }, [currentUser]);

  // ── Photo picker ─────────────────────────────────────────────────────────
  const handlePickPhoto = async () => {
    haptics.light();
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.5,
      });
      if (result.didCancel || !result.assets?.length) return;
      const asset = result.assets[0];
      if (asset.uri) setImageUri(asset.uri);
      if (asset.base64) setImageBase64(`data:image/jpeg;base64,${asset.base64}`);
    } catch {
      Alert.alert('Error', 'Could not open photo library.');
    }
  };

  const handleClearPhoto = () => {
    setImageUri(null);
    setImageBase64(null);
  };

  // ── Toggle friend selection ──────────────────────────────────────────────
  const toggleFriend = (friendId: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  // ── Create ───────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setTouched(true);
    if (!canCreate) return;

    if (!currentUser) {
      Alert.alert('Sign in required', 'Please sign in to create a group.');
      return;
    }
    setLoading(true);
    try {
      await groupsService.create({
        name: name.trim(),
        type: selectedType,
        icon: selectedIcon,
        image: imageBase64 || undefined,
        memberIds: Array.from(selectedMemberIds),
      });
      haptics.success();
      navigation.goBack();
    } catch (e: any) {
      haptics.error();
      Alert.alert('Error', e.message || 'Could not create group. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render helpers ───────────────────────────────────────────────────────
  const iconConfig = getGroupIconConfig(selectedIcon);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Drag handle */}
      <View style={[styles.dragHandle, { marginTop: insets.top + 8 }]} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <IconButton
          icon="close"
          size={24}
          iconColor={theme.text}
          onPress={() => navigation.goBack()}
        />
        <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.text }]}>
          New Group
        </Text>
        <Button
          mode="text"
          onPress={handleCreate}
          loading={loading}
          disabled={loading || !canCreate}
          textColor={theme.primary}
          style={{ marginRight: 4 }}
          labelStyle={{ fontWeight: '700', fontSize: 15 }}
        >
          Create
        </Button>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.inner}>

          {/* Group Name */}
          <TextInput
            label="Group Name"
            mode="outlined"
            value={name}
            onChangeText={setName}
            onBlur={() => setTouched(true)}
            placeholder="e.g. Apartment 4B, Bali Trip"
            left={<TextInput.Icon icon="account-group" />}
            error={nameError}
            style={styles.input}
          />
          <HelperText type="error" visible={nameError}>
            Group name must be at least 2 characters.
          </HelperText>

          {/* Choose an Icon */}
          <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Choose an Icon
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
            {GROUP_ICONS.map((ic) => {
              const selected = selectedIcon === ic.key;
              return (
                <TouchableRipple
                  key={ic.key}
                  onPress={() => {
                    haptics.selection();
                    setSelectedIcon(ic.key);
                  }}
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: selected ? ic.color + '20' : theme.surface,
                      borderColor: selected ? ic.color : theme.border,
                    },
                  ]}
                  borderless
                >
                  <Icon source={ic.icon} size={24} color={selected ? ic.color : theme.textSecondary} />
                </TouchableRipple>
              );
            })}
          </ScrollView>

          {/* Group Type */}
          <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 20 }]}>
            Group Type
          </Text>
          <View style={styles.typeGrid}>
            {GROUP_TYPES.map((t) => {
              const selected = selectedType === t.key;
              return (
                <Surface
                  key={t.key}
                  style={[styles.typeCard, { borderColor: selected ? theme.primary : theme.border }]}
                  elevation={0}
                >
                  <TouchableRipple
                    onPress={() => {
                      haptics.selection();
                      setSelectedType(t.key);
                    }}
                    style={{ flex: 1 }}
                  >
                    <View style={{
                      flex: 1, alignItems: 'center', justifyContent: 'center',
                      paddingVertical: 14,
                      backgroundColor: selected ? theme.primary + '14' : theme.surface,
                    }}>
                      <Icon source={t.icon} size={24} color={selected ? theme.primary : theme.textSecondary} />
                      <Text
                        variant="labelMedium"
                        style={{
                          color: selected ? theme.primary : theme.text,
                          marginTop: 6, fontWeight: selected ? '700' : '500',
                        }}
                      >
                        {t.label}
                      </Text>
                    </View>
                  </TouchableRipple>
                </Surface>
              );
            })}
          </View>

          {/* Group Photo */}
          <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 20 }]}>
            Group Photo (optional)
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableRipple
              style={[styles.photoPicker, { borderColor: theme.border }]}
              onPress={handlePickPhoto}
            >
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.photoPreview} />
                ) : (
                  <Icon source="camera-plus" size={28} color={theme.textSecondary} />
                )}
              </View>
            </TouchableRipple>
            {imageUri && (
              <IconButton icon="close-circle" size={20} iconColor={theme.textSecondary} onPress={handleClearPhoto} />
            )}
          </View>

          {/* Add Members */}
          <View style={styles.membersSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="titleSmall" style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 0 }]}>
                Who's in this group?
              </Text>
              {selectedMemberIds.size > 0 && (
                <Text variant="bodySmall" style={{ color: theme.primary, fontWeight: '700' }}>
                  {selectedMemberIds.size} selected
                </Text>
              )}
            </View>

            {!currentUser && (
              <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 4 }}>
                Sign in to add friends to a group.
              </Text>
            )}

            {friendsLoading && (
              <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 8 }}>
                Loading friends…
              </Text>
            )}

            {!friendsLoading && friends.length === 0 && currentUser && (
              <Text variant="bodySmall" style={{ color: theme.textSecondary, marginTop: 8 }}>
                No friends yet. Add friends first!
              </Text>
            )}

            {friends.map((friend) => {
              const checked = selectedMemberIds.has(friend._id);
              return (
                <TouchableRipple
                  key={friend._id}
                  onPress={() => {
                    haptics.selection();
                    toggleFriend(friend._id);
                  }}
                  style={[styles.friendRow, { borderBottomColor: theme.border }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.friendAvatar, { backgroundColor: iconConfig.color + '20' }]}>
                      <Text style={{ color: iconConfig.color, fontWeight: '700' }}>
                        {(friend.name?.[0] ?? '?').toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text variant="bodyMedium" style={{ color: theme.text, fontWeight: '600' }}>
                        {friend.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.textSecondary }}>
                        {friend.email}
                      </Text>
                    </View>
                    <Checkbox
                      status={checked ? 'checked' : 'unchecked'}
                      color={theme.primary}
                    />
                  </View>
                </TouchableRipple>
              );
            })}
          </View>

          {/* Create button (bottom, for accessibility) */}
          <Button
            mode="contained"
            onPress={handleCreate}
            icon="plus"
            loading={loading}
            disabled={loading || !canCreate}
            style={[styles.button, { marginTop: 24 }]}
            contentStyle={styles.buttonContent}
          >
            Create Group
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#C5C5C7', alignSelf: 'center', marginBottom: 8,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8, paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600' },
  inner: { padding: 20, paddingBottom: 40 },
  input: { marginBottom: 4 },
  sectionLabel: { fontWeight: '600', marginBottom: 10, marginTop: 4 },

  iconRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
  },

  typeGrid: { flexDirection: 'row', gap: 10 },
  typeCard: {
    flex: 1, borderRadius: 14, borderWidth: 1.5,
    overflow: 'hidden',
  },

  photoPicker: {
    width: 80, height: 80, borderRadius: 16,
    borderWidth: 2, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  photoPreview: { width: 80, height: 80, borderRadius: 16, backgroundColor: '#ccc' },

  membersSection: { marginTop: 24 },
  friendRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  friendAvatar: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },

  button: { borderRadius: 10 },
  buttonContent: { paddingVertical: 6 },
});
