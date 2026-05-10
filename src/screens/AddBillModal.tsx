import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Text, Switch, HelperText, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DatePickerModal } from 'react-native-paper-dates';
import { useStore } from '../store/useStore';
import { Bill } from '../types';
import { useAppTheme } from '../context/ThemeContext';
import { getCurrencyIcon, getSymbol } from '../utils/currency';
import { billsService } from '../services/billsService';
import { scheduleBillReminder } from '../utils/notifications';
import { haptics } from '../utils/haptics';

export default function AddBillModal({ navigation }: any) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
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
      const { id, ...billPayload } = bill;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      void id;
      billsService
        .create(billPayload as Omit<Bill, 'id'>)
        .then(res => {
          // Swap local id for the server-assigned id
          const serverBill = res?.bill as any;
          if (serverBill?._id || serverBill?.id) {
            const serverId = serverBill._id ?? serverBill.id;
            updateBill(localId, { ...bill, id: serverId } as any);
          }
        })
        .catch(() => {/* silent fail — local bill is already saved */});
    }

    haptics.success();
    navigation.goBack();
  };

  const onConfirmDate = React.useCallback(
    (params: any) => {
      setDateOpen(false);
      setDueDate(params.date);
    },
    [setDateOpen, setDueDate],
  );

  const openDatePicker = () => {
    haptics.light();
    setDateOpen(true);
  };

  return (
    <SafeAreaView style={[styles.scrollRoot, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
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
          Add Bill
        </Text>
        <View style={styles.headerSpacer} />
      </View>

    <KeyboardAvoidingView
      style={{ flex: 1 }}
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
        left={<TextInput.Icon icon="receipt-outline" />}
        error={titleError}
        style={styles.input}
        outlineColor={theme.textSecondary}
        activeOutlineColor={theme.primary}
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
        outlineColor={theme.textSecondary}
        activeOutlineColor={theme.primary}
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
        outlineColor={theme.textSecondary}
        activeOutlineColor={theme.primary}
      />

      {/* Due Date */}
      <Pressable onPress={openDatePicker}>
        <View pointerEvents="none">
          <TextInput
            label="Due Date"
            mode="outlined"
            value={dueDate.toLocaleDateString()}
            left={<TextInput.Icon icon="calendar" />}
            right={<TextInput.Icon icon="chevron-right" />}
            outlineColor={theme.textSecondary}
            activeOutlineColor={theme.primary}
            style={styles.input}
          />
        </View>
      </Pressable>

      <DatePickerModal
        locale="en"
        mode="single"
        visible={dateOpen}
        onDismiss={() => setDateOpen(false)}
        date={dueDate}
        onConfirm={onConfirmDate}
        validRange={{ startDate: new Date() }}
      />

      <View style={[styles.switchRow, { borderTopColor: theme.border }]}>
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
        style={[styles.button, { borderRadius: 12 }]}
        contentStyle={styles.buttonContent}
      >
        Save Bill
      </Button>
    </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollRoot: { flex: 1 },
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
  container: { padding: 20, paddingBottom: 40 },
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
