import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Text, IconButton, TouchableRipple, useTheme } from 'react-native-paper';
import { getSymbol } from '../utils/currency';
import { Payment } from '../types';
import AppAvatar from './AppAvatar';

interface MultiPayerSelectorProps {
  members: { _id: string; name: string; email?: string; profilePic?: string }[];
  payments: Payment[];
  currency: string;
  onChange: (payments: Payment[]) => void;
}

export default function MultiPayerSelector({
  members,
  payments,
  currency,
  onChange,
}: MultiPayerSelectorProps) {
  const theme = useTheme();
  const symbol = getSymbol(currency);

  const handleToggle = (userId: string) => {
    const existing = payments.find(p => p.userId === userId);
    if (existing) {
      onChange(payments.filter(p => p.userId !== userId));
    } else {
      onChange([...payments, { userId, amount: 0, currency }]);
    }
  };

  const handleAmountChange = (userId: string, text: string) => {
    const amount = text === '' ? 0 : parseFloat(text);
    onChange(
      payments.map(p =>
        p.userId === userId ? { ...p, amount: isNaN(amount) ? 0 : amount } : p,
      ),
    );
  };

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          Paid By
        </Text>
        <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
          {symbol}{totalPaid.toFixed(2)}
        </Text>
      </View>

      {members.map(member => {
        const payment = payments.find(p => p.userId === member._id);
        const isSelected = !!payment;
        return (
          <TouchableRipple
            key={member._id}
            onPress={() => handleToggle(member._id)}
            style={[
              styles.memberRow,
              {
                backgroundColor: isSelected
                  ? theme.colors.primaryContainer
                  : theme.colors.surface,
                borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
              },
            ]}
          >
            <View style={styles.memberInner}>
              <AppAvatar user={{ name: member.name, _id: member._id }} size={36} />
              <View style={styles.memberInfo}>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurface, fontWeight: isSelected ? '600' : '400' }}
                >
                  {member.name}
                </Text>
              </View>
              {isSelected ? (
                <View style={styles.amountInputWrap}>
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginRight: 4 }}>{symbol}</Text>
                  <TextInput
                    style={[
                      styles.amountInput,
                      {
                        color: theme.colors.onSurface,
                        borderBottomColor: theme.colors.primary,
                      },
                    ]}
                    keyboardType="decimal-pad"
                    value={payment.amount > 0 ? String(payment.amount) : ''}
                    onChangeText={text => handleAmountChange(member._id, text)}
                    placeholder="0"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    selectTextOnFocus
                  />
                  <IconButton
                    icon="close-circle"
                    size={18}
                    iconColor={theme.colors.error}
                    onPress={() => handleToggle(member._id)}
                    style={{ margin: 0 }}
                  />
                </View>
              ) : (
                <View style={styles.checkbox}>
                  <View
                    style={[
                      styles.checkboxInner,
                      { borderColor: theme.colors.outline },
                    ]}
                  />
                </View>
              )}
            </View>
          </TouchableRipple>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  memberRow: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  memberInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  memberInfo: { flex: 1 },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  amountInput: {
    width: 80,
    borderBottomWidth: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    paddingVertical: 2,
    fontFamily: 'Manrope',
  },
  checkbox: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
});
