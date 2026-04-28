import React, { useState } from 'react';
import { StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, HelperText, Text } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { groupsService, apiGroupToGroup } from '../services/groupsService';

export default function CreateGroupModal({ navigation }: any) {
  const { theme } = useAppTheme();
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
        navigation.goBack();
      } catch (e: any) {
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
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
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
        <Text variant="bodySmall" style={styles.offlineNote}>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: 20, flexGrow: 1 },
  input: { marginBottom: 4 },
  offlineNote: { color: '#FFAA00', marginBottom: 8, marginTop: 4 },
  button: { marginTop: 12, borderRadius: 10 },
  buttonContent: { paddingVertical: 6 },
});
