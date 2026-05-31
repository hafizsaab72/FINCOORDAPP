import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { Expense } from '../types';
import { validateExpense } from '../utils/expenseValidation';
import { getSymbol } from '../utils/currency';


interface ExpenseSummaryBarProps {
  expense: Partial<Expense>;
  onSave: () => void;
  isSaving?: boolean;
}

export default function ExpenseSummaryBar({ expense, onSave, isSaving }: ExpenseSummaryBarProps) {
  const theme = useTheme();
  const validation = validateExpense(expense);
  const payerNames = expense.payers
    ?.filter(p => p.amountPaid > 0)
    .map(p => {
      const participant = expense.participants?.find(pt => pt.userId === p.userId);
      return participant?.name || 'Someone';
    }) || [];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
      ]}>
      <View style={styles.info}>
        <Text variant="bodySmall" style={{ color: theme.colors.textSecondary }}>
          {expense.splitMethod === 'equal'
            ? 'Split equally'
            : expense.splitMethod === 'exact'
            ? 'Exact amounts'
            : expense.splitMethod === 'percentage'
            ? 'By percentage'
            : expense.splitMethod === 'shares'
            ? 'By shares'
            : expense.splitMethod === 'adjustment'
            ? 'With adjustments'
            : 'Split'}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.textSecondary }} numberOfLines={1}>
          Paid by: {payerNames.join(', ') || '—'}
        </Text>
      </View>

      <View style={styles.saveWrap}>
        {!validation.isValid && validation.errors.length > 0 && (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.error, marginBottom: 4, textAlign: 'right' }}
            numberOfLines={1}>
            {validation.errors[0]}
          </Text>
        )}
        <Button
          mode="contained"
          onPress={onSave}
          loading={isSaving}
          disabled={!validation.isValid || isSaving}
          style={{ borderRadius: 12 }}
          buttonColor={theme.colors.primary}
          textColor={theme.colors.onPrimary}>
          Save
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  saveWrap: {
    alignItems: 'flex-end',
    minWidth: 120,
  },
});
