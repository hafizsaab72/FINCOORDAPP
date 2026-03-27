import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { SplitSelector } from '../components/SplitSelector';
import { SplitMethod } from '../types';
import { validateExpense } from '../utils/validation';

export default function AddExpenseModal({ navigation, route }: any) {
  const groupId = route?.params?.groupId || 'default-group';
  const { theme } = useAppTheme();
  const addExpense = useStore(state => state.addExpense);

  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [touched, setTouched] = useState(false);

  const validation = validateExpense(amount, notes);

  const handleSave = () => {
    setTouched(true);
    if (!validation.valid) return;

    addExpense({
      id: `exp-${Date.now()}`,
      groupId,
      amount: parseFloat(amount),
      payerId: 'user-1',
      splitMethod,
      splitDetails: {},
      date: new Date().toISOString(),
      notes: notes.trim(),
    });
    navigation.goBack();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <TextInput
        label="Amount"
        mode="outlined"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        onBlur={() => setTouched(true)}
        left={<TextInput.Icon icon="currency-usd" />}
        error={touched && !!amount && isNaN(Number(amount))}
        style={styles.input}
      />

      <TextInput
        label="What was this for?"
        mode="outlined"
        value={notes}
        onChangeText={setNotes}
        onBlur={() => setTouched(true)}
        left={<TextInput.Icon icon="text-short" />}
        style={styles.input}
      />

      {touched && !validation.valid && (
        <HelperText type="error" visible>
          {validation.error}
        </HelperText>
      )}

      <Text
        variant="labelLarge"
        style={[styles.splitLabel, { color: theme.text }]}
      >
        Split Method
      </Text>
      <SplitSelector selected={splitMethod} onSelect={setSplitMethod} />

      <Button
        mode="contained"
        onPress={handleSave}
        icon="check"
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Save Expense
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: { marginBottom: 12 },
  splitLabel: { marginBottom: 8, marginTop: 4 },
  button: { marginTop: 16, borderRadius: 10 },
  buttonContent: { paddingVertical: 6 },
});
