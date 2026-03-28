import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, HelperText, Chip, ActivityIndicator } from 'react-native-paper';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';
import { SplitSelector } from '../components/SplitSelector';
import { SplitMethod } from '../types';
import { validateExpense } from '../utils/validation';
import { getCurrencyIcon, getSymbol } from '../utils/currency';
import { convertAmount, fetchExchangeRates } from '../services/currencyService';
import { launchCamera } from 'react-native-image-picker';

const EXPENSE_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR', 'CNY'];
const API_BASE = 'http://localhost:3000/api'; // TODO: move to env

export default function AddExpenseModal({ navigation, route }: any) {
  const groupId = route?.params?.groupId || 'default-group';
  const { theme } = useAppTheme();
  const addExpense = useStore(state => state.addExpense);
  const homeCurrency = useStore(state => state.currency);
  const splitTemplates = useStore(state => state.splitTemplates);
  const exchangeRates = useStore(state => state.exchangeRates);
  const token = useStore(state => state.token);

  const template = splitTemplates[groupId];

  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [expenseCurrency, setExpenseCurrency] = useState(homeCurrency);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(template?.method ?? 'equal');
  const [touched, setTouched] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);

  useEffect(() => {
    // Fetch fresh exchange rates on open (respects 24h cache)
    fetchExchangeRates();
  }, []);

  const validation = validateExpense(amount, notes);

  const numericAmount = parseFloat(amount);
  const converted =
    !isNaN(numericAmount) && expenseCurrency !== homeCurrency
      ? convertAmount(numericAmount, expenseCurrency, homeCurrency, exchangeRates)
      : null;

  const handleSave = () => {
    setTouched(true);
    if (!validation.valid) return;

    addExpense({
      id: `exp-${Date.now()}`,
      groupId,
      amount: numericAmount,
      payerId: 'user-1',
      splitMethod,
      splitDetails: template?.method === splitMethod ? template.details : {},
      date: new Date().toISOString(),
      notes: notes.trim(),
    });
    navigation.goBack();
  };

  const handleScanReceipt = async () => {
    const result = await launchCamera({ mediaType: 'photo', includeBase64: true, quality: 0.7 });
    if (result.didCancel || !result.assets?.[0]?.base64) return;

    setScanLoading(true);
    try {
      const res = await fetch(`${API_BASE}/expenses/scan-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ image: result.assets[0].base64 }),
      });
      const data = await res.json();
      if (data.amount) setAmount(String(data.amount));
      if (data.merchant) setNotes(data.merchant);
    } catch {
      Alert.alert('Scan Failed', 'Could not read receipt. Please enter details manually.');
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.scrollRoot, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Scan Receipt */}
      <Button
        mode="outlined"
        icon={scanLoading ? undefined : 'camera-outline'}
        onPress={handleScanReceipt}
        disabled={scanLoading}
        style={styles.scanBtn}
      >
        {scanLoading ? <ActivityIndicator size="small" /> : 'Scan Receipt'}
      </Button>

      {/* Currency selector */}
      <Text variant="labelMedium" style={[styles.label, { color: theme.text }]}>
        Expense Currency
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyRow}>
        {EXPENSE_CURRENCIES.map(c => (
          <Chip
            key={c}
            selected={expenseCurrency === c}
            onPress={() => setExpenseCurrency(c)}
            style={styles.chip}
            compact
          >
            {c}
          </Chip>
        ))}
      </ScrollView>

      <TextInput
        label={`Amount (${getSymbol(expenseCurrency)})`}
        mode="outlined"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        onBlur={() => setTouched(true)}
        left={<TextInput.Icon icon={getCurrencyIcon(expenseCurrency)} />}
        error={touched && !!amount && isNaN(Number(amount))}
        style={styles.input}
      />

      {/* Live conversion preview */}
      {converted !== null && (
        <Text variant="bodySmall" style={[styles.conversionHint, { color: theme.primary }]}>
          ≈ {getSymbol(homeCurrency)}{converted.toFixed(2)} {homeCurrency}
        </Text>
      )}

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

      {template && (
        <Text variant="bodySmall" style={[styles.templateHint, { color: theme.primary }]}>
          Using group default: {template.method} split
        </Text>
      )}

      <Text variant="labelLarge" style={[styles.splitLabel, { color: theme.text }]}>
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
  scrollRoot: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  scanBtn: { marginBottom: 16, borderRadius: 10 },
  label: { marginBottom: 6 },
  currencyRow: { marginBottom: 12 },
  chip: { marginRight: 6 },
  input: { marginBottom: 12 },
  conversionHint: { marginTop: -8, marginBottom: 12, fontStyle: 'italic' },
  templateHint: { marginBottom: 8, fontStyle: 'italic' },
  splitLabel: { marginBottom: 8, marginTop: 4 },
  button: { marginTop: 16, borderRadius: 10 },
  buttonContent: { paddingVertical: 6 },
});
