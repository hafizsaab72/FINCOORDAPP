import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, HelperText } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';

export default function CreateGroupModal({ navigation }: any) {
  const { theme } = useAppTheme();
  const addGroup = useStore(state => state.addGroup);
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);

  const hasError = touched && name.trim().length < 2;

  const handleCreate = () => {
    setTouched(true);
    if (name.trim().length < 2) return;

    addGroup({
      id: `group-${Date.now()}`,
      name: name.trim(),
      members: ['user-1'],
      createdAt: new Date().toISOString(),
    });
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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

      <Button
        mode="contained"
        onPress={handleCreate}
        icon="plus"
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Create Group
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: { marginBottom: 4 },
  button: { marginTop: 12, borderRadius: 10 },
  buttonContent: { paddingVertical: 6 },
});
