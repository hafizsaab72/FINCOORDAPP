import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Switch, HelperText } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { getCurrencyIcon, getSymbol } from '../utils/currency';
import { billsService } from '../services/billsService';
import { scheduleBillReminder } from '../utils/notifications';

export default function AddBillModal({ navigation }: any) {
  const { theme } = useAppTheme();
  const addBill   = useStore(state => state.addBill);
  const updateBill = useStore(state => state.updateBill);
  const token     = useStore(state => state.token);
  const currency  = useStore(state => state.currency);

  const [title, setTitle]         = useState('');
  const [amount, setAmount]       = useState('');
  const [category, setCategory]   = useState('');
  const [dueDate, setDueDate]     = useState<Date>(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [touched, setTouched]     = useState(false);
  const [dateOpen, setDateOpen]   = useState(false);

  const titleError   = touched && title.trim().length < 2;
  const amountError  = touched && (!amount || isNaN(Number(amount)) || Number(amount) <= 0);

  const handleSave = async () => {
    setTouched(true);
    if (
      title.trim().length < 2 ||
      !amount ||
      isNaN(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return;
    }

    const parsedDate = dueDate.toISOString();

    const localId = `bill-${Date.now()}`;
    const bill = {
      id: localId,
      title: title.trim(),
      amount: parseFloat(amount),
      currency,
      dueDate: parsedDate,
      isRecurring,
      status: 'pending' as const,
      category: category.trim() || 'General',
    };

    addBill(bill);

    // Schedule reminder (1 day before due at 9 AM)
    scheduleBillReminder(localId, bill.title, parsedDate);

    // Sync to backend in background
    if (token) {
      billsService
        .create({ ...bill, id: undefined as any })
        .then(res => {
          // Swap local id for the server-assigned id
          if (res?.bill?._id || res?.bill?.id) {
            const serverId = res.bill._id ?? res.bill.id;
            updateBill(localId, { ...bill, id: serverId } as any);
          }
        })
        .catch(() => {/* silent fail — local bill is already saved */});
    }

    navigation.goBack();
  };

  const onConfirmDate = React.useCallback(
    (params: { date: Date }) => {
      setDateOpen(false);
      setDueDate(params.date);
    },
    [setDateOpen, setDueDate],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.scrollRoot, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
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
        onBlur={() => setTouched(true)}
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

      {/* Due Date */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setDateOpen(true)}
        style={[styles.dateRow, { borderColor: theme.border, backgroundColor: theme.surface }]}
      >
        <TextInput.Icon icon="calendar" />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text variant="bodySmall" style={{ color: theme.textSecondary }}>Due Date</Text>
          <Text variant="bodyLarge" style={{ color: theme.text }}>
            {dueDate.toLocaleDateString()}
          </Text>
        </View>
        <TextInput.Icon icon="chevron-right" />
      </TouchableOpacity>

      <DatePickerModal
        locale="en"
        mode="single"
        visible={dateOpen}
        onDismiss={() => setDateOpen(false)}
        date={dueDate}
        onConfirm={onConfirmDate}
        validRange={{ startDate: new Date() }}
      />

      <View style={[styles.switchRow, { borderColor: theme.border }]}>
        <View style={styles.switchLabel}>
          <Text variant="bodyLarge" style={{ color: theme.text }}>
            Recurring Bill
          </Text>
          <Text variant="bodySmall" style={{ color: theme.textSecondary }}>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollRoot: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  input: { marginBottom: 4 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
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
