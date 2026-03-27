import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, Switch, HelperText } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { getCurrencyIcon, getSymbol } from '../utils/currency';

export default function AddBillModal({ navigation }: any) {
  const { theme } = useAppTheme();
  const addBill = useStore(state => state.addBill);
  const currency = useStore(state => state.currency);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [touched, setTouched] = useState(false);

  const titleError = touched && title.trim().length < 2;
  const amountError = touched && (!amount || isNaN(Number(amount)) || Number(amount) <= 0);

  const handleSave = () => {
    setTouched(true);
    if (title.trim().length < 2 || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return;
    }

    const parsedDate = dueDate
      ? new Date(dueDate).toISOString()
      : new Date().toISOString();

    addBill({
      id: `bill-${Date.now()}`,
      title: title.trim(),
      amount: parseFloat(amount),
      dueDate: parsedDate,
      isRecurring,
      status: 'pending',
      category: category.trim() || 'General',
    });
    navigation.goBack();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <TextInput
        label="Bill Title"
        mode="outlined"
        value={title}
        onChangeText={setTitle}
        onBlur={() => setTouched(true)}
        left={<TextInput.Icon icon="receipt-text" />}
        error={titleError}
        style={styles.input}
      />
      {titleError && (
        <HelperText type="error" visible>
          Title must be at least 2 characters.
        </HelperText>
      )}

      <TextInput
        label={`Amount (${getSymbol(currency)})`}
        mode="outlined"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        left={<TextInput.Icon icon={getCurrencyIcon(currency)} />}
        error={amountError}
        style={styles.input}
      />
      {amountError && (
        <HelperText type="error" visible>
          Enter a valid amount greater than 0.
        </HelperText>
      )}

      <TextInput
        label="Category (optional)"
        mode="outlined"
        value={category}
        onChangeText={setCategory}
        left={<TextInput.Icon icon="tag-outline" />}
        placeholder="e.g. Rent, Utilities, Subscription"
        style={styles.input}
      />

      <TextInput
        label="Due Date (YYYY-MM-DD)"
        mode="outlined"
        value={dueDate}
        onChangeText={setDueDate}
        left={<TextInput.Icon icon="calendar" />}
        placeholder="2025-12-31"
        style={styles.input}
      />

      <View style={[styles.switchRow, { borderColor: theme.border }]}>
        <View style={styles.switchLabel}>
          <Text variant="bodyLarge" style={{ color: theme.text }}>
            Recurring Bill
          </Text>
          <Text variant="bodySmall" style={{ color: '#888' }}>
            Repeats on the same due date each month
          </Text>
        </View>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          color={theme.primary}
        />
      </View>

      <Button
        mode="contained"
        onPress={handleSave}
        icon="check"
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Save Bill
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: { marginBottom: 4 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  switchLabel: { flex: 1, marginRight: 16 },
  button: { marginTop: 12, borderRadius: 10 },
  buttonContent: { paddingVertical: 6 },
});
