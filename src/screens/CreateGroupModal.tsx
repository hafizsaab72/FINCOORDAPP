import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, HelperText, Text, useTheme, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { groupsService, apiGroupToGroup } from '../services/groupsService';
import { haptics } from '../utils/haptics';

export default function CreateGroupModal({ navigation }: any) {
  const { theme } = useAppTheme();
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const addGroup = useStore(state => state.addGroup);
  const currentUser = useStore(state => state.currentUser);
  const isGuest = useStore(state => state.isGuest);

  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasError = touched && name.trim().length < 2;

  const handleCreate = async () => {
    setTouched(true);
    if (name.trim().length < 2) return;

    if (currentUser) {
      // Logged-in: save to API
      setLoading(true);
      try {
        const data = await groupsService.create(name.trim());
        addGroup(apiGroupToGroup(data.group));
        haptics.success();
        navigation.goBack();
      } catch (e: any) {
        haptics.error();
        Alert.alert('Error', e.message || 'Could not create group. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      // Guest / offline: save locally
      addGroup({
        id: `group-${Date.now()}`,
        name: name.trim(),
        members: ['user-1'],
        createdAt: new Date().toISOString(),
      });
      haptics.success();
      navigation.goBack();
    }
  };

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
          Create Group
        </Text>
        <View style={styles.headerSpacer} />
      </View>

    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.inner}>
      <TextInput
        label="Group Name"
        mode="outlined"
        value={name}
        onChangeText={setName}
        onBlur={() => setTouched(true)}
        placeholder="e.g. Apartment 4B, Bali Trip"
        left={<TextInput.Icon icon="account-group" />}
        error={hasError}
        style={styles.input}
      />
      <HelperText type="error" visible={hasError}>
        Group name must be at least 2 characters.
      </HelperText>

      {(isGuest || !currentUser) && (
        <Text variant="bodySmall" style={[styles.offlineNote, { color: paperTheme.colors.tertiary }]}>
          You're in guest mode — this group will be saved locally only.
        </Text>
      )}

      <Button
        mode="contained"
        onPress={handleCreate}
        icon="plus"
        loading={loading}
        disabled={loading}
        style={styles.button}
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
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C5C5C7',
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600' },
  headerSpacer: { width: 48 },
  inner: { padding: 20, flexGrow: 1 },
  input: { marginBottom: 4 },
  offlineNote: { marginBottom: 8, marginTop: 4 },
  button: { marginTop: 12, borderRadius: 10 },
  buttonContent: { paddingVertical: 6 },
});
