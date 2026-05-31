import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { Payer, Participant } from '../types';
import { getSymbol } from '../utils/currency';

interface PayerSelectorProps {
  payers: Payer[];
  participants: Participant[];
  totalAmount: number;
  currency: string;
  mode: 'single' | 'multiple';
  onChange: (payers: Payer[], mode: 'single' | 'multiple') => void;
}

export default function PayerSelector({
  payers,
  participants,
  totalAmount,
  currency,
  mode,
  onChange,
}: PayerSelectorProps) {
  const theme = useTheme();
  const symbol = getSymbol(currency);

  const activeParticipants = participants.filter(p => p.isActive);

  const setMode = (newMode: 'single' | 'multiple') => {
    if (newMode === 'single') {
      // Default to current user or first active participant
      const currentUserPayer = payers.find(p => p.amountPaid > 0);
      const firstActive = activeParticipants[0];
      const defaultPayer = currentUserPayer ?? (firstActive ? { userId: firstActive.userId, amountPaid: totalAmount } : { userId: '', amountPaid: totalAmount });
      onChange([defaultPayer], 'single');
    } else {
      // Convert single payer to multiple
      const existing = payers[0];
      const newPayers = activeParticipants.map(p => ({
        userId: p.userId,
        amountPaid: existing?.userId === p.userId ? existing.amountPaid : 0,
      }));
      onChange(newPayers, 'multiple');
    }
  };

  const toggleSinglePayer = (userId: string) => {
    onChange([{ userId, amountPaid: totalAmount }], 'single');
  };

  const updateMultiplePayerAmount = (userId: string, amount: string) => {
    const num = parseFloat(amount) || 0;
    const updated = payers.map(p =>
      p.userId === userId ? { ...p, amountPaid: num } : p
    );
    onChange(updated, 'multiple');
  };

  const payerSum = payers.reduce((s, p) => s + p.amountPaid, 0);
  const diff = totalAmount - payerSum;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleSmall" style={{ color: theme.colors.textSecondary }}>
          Who Paid
        </Text>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              mode === 'single' && { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setMode('single')}>
            <Text
              variant="bodySmall"
              style={{
                color: mode === 'single' ? theme.colors.onPrimary : theme.colors.textSecondary,
              }}>
              Single
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              mode === 'multiple' && { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setMode('multiple')}>
            <Text
              variant="bodySmall"
              style={{
                color: mode === 'multiple' ? theme.colors.onPrimary : theme.colors.textSecondary,
              }}>
              Multiple
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {mode === 'single' ? (
        <View style={styles.singleList}>
          {activeParticipants.map(p => {
            const isSelected = payers.length === 1 && payers[0].userId === p.userId;
            return (
              <TouchableOpacity
                key={p.userId}
                style={[
                  styles.payerRow,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primaryContainer
                      : theme.colors.surfaceVariant,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
                  },
                ]}
                onPress={() => toggleSinglePayer(p.userId)}>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: isSelected
                      ? theme.colors.onPrimaryContainer
                      : theme.colors.onSurface,
                  }}>
                  {p.name}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: isSelected
                      ? theme.colors.onPrimaryContainer
                      : theme.colors.onSurfaceVariant,
                  }}>
                  {symbol}{totalAmount.toFixed(2)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.multipleList}>
          {activeParticipants.map(p => {
            const payer = payers.find(py => py.userId === p.userId);
            return (
              <View key={p.userId} style={styles.multipleRow}>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurface, flex: 1 }}>
                  {p.name}
                </Text>
                <TextInput
                  mode="outlined"
                  keyboardType="decimal-pad"
                  value={(payer?.amountPaid ?? 0) > 0 ? (payer!.amountPaid).toString() : ''}
                  onChangeText={text => updateMultiplePayerAmount(p.userId, text)}
                  placeholder={`${symbol}0.00`}
                  style={styles.amountInput}
                  dense
                  outlineColor={theme.colors.outline}
                  activeOutlineColor={theme.colors.primary}
                  textColor={theme.colors.onSurface}
                />
              </View>
            );
          })}
          <View style={styles.diffRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.textSecondary }}>
              Total paid:
            </Text>
            <Text
              variant="bodySmall"
              style={{
                color: Math.abs(diff) < 0.001 ? theme.success : theme.colors.error,
                fontWeight: '700',
              }}>
              {symbol}{payerSum.toFixed(2)} / {symbol}{totalAmount.toFixed(2)}
              {Math.abs(diff) > 0.001 && ` (diff: ${diff > 0 ? '+' : ''}${diff.toFixed(2)})`}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  singleList: {
    gap: 8,
  },
  payerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  multipleList: {
    gap: 8,
  },
  multipleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountInput: {
    width: 120,
    height: 40,
    backgroundColor: 'transparent',
  },
  diffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
});
