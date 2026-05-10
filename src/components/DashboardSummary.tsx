import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { fromMinorUnits, getSymbol } from '../utils/currency';
import type { DashboardSummary } from '../types';

interface DashboardSummaryProps {
  summary: DashboardSummary;
  onPress?: () => void;
}

export default function DashboardSummaryCards({ summary, onPress }: DashboardSummaryProps) {
  const theme = useTheme();
  const sym = getSymbol(summary.currency);

  const netPositive = summary.netBalance >= 0;
  const netColor = netPositive ? theme.colors.primary : '#E8673A';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Surface style={[styles.container, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={styles.row}>
          {/* You owe */}
          <View style={styles.card}>
            <Text variant="labelMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
              You owe
            </Text>
            <Text variant="titleLarge" style={[styles.amount, { color: '#E8673A' }]}>
              {sym}{fromMinorUnits(summary.totalIOwe).toFixed(2)}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* You are owed */}
          <View style={styles.card}>
            <Text variant="labelMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
              You are owed
            </Text>
            <Text variant="titleLarge" style={[styles.amount, { color: theme.colors.primary }]}>
              {sym}{fromMinorUnits(summary.totalOwedToMe).toFixed(2)}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Net balance */}
          <View style={styles.card}>
            <Text variant="labelMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
              Net balance
            </Text>
            <Text variant="titleLarge" style={[styles.amount, { color: netColor }]}>
              {netPositive ? '+' : '-'}{sym}{Math.abs(fromMinorUnits(summary.netBalance)).toFixed(2)}
            </Text>
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
});
