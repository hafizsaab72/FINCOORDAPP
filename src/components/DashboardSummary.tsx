import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { fromMinorUnits, getSymbol } from '../utils/currency';
import type { DashboardSummary } from '../types';

interface DashboardSummaryProps {
  summary: DashboardSummary;
  onPress?: () => void;
}

export default function DashboardSummaryCards({ summary, onPress }: DashboardSummaryProps) {
  const { colors } = useTheme();
  const sym = getSymbol(summary.currency);

  const netPositive = summary.netBalance >= 0;
  const netColor = netPositive ? colors.success : colors.error;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Surface
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.outlineVariant,
          },
        ]}
        elevation={0}
      >
        <View style={styles.row}>
          {/* You owe */}
          <View style={styles.card}>
            <Text variant="labelSmall" style={[styles.label, { color: colors.textSecondary }]}>
              You owe
            </Text>
            <Text variant="titleMedium" style={[styles.amount, { color: colors.error }]} numberOfLines={1} adjustsFontSizeToFit>
              {sym}{fromMinorUnits(summary.totalIOwe).toFixed(2)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

          {/* You are owed */}
          <View style={styles.card}>
            <Text variant="labelSmall" style={[styles.label, { color: colors.textSecondary }]}>
              You are owed
            </Text>
            <Text variant="titleMedium" style={[styles.amount, { color: colors.success }]} numberOfLines={1} adjustsFontSizeToFit>
              {sym}{fromMinorUnits(summary.totalOwedToMe).toFixed(2)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

          {/* Net balance */}
          <View style={styles.card}>
            <Text variant="labelSmall" style={[styles.label, { color: colors.textSecondary }]}>
              Net
            </Text>
            <Text variant="titleMedium" style={[styles.amount, { color: netColor }]} numberOfLines={1} adjustsFontSizeToFit>
              {netPositive ? '+' : ''}{sym}{fromMinorUnits(summary.netBalance).toFixed(2)}
            </Text>
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  card: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
    fontSize: 10,
  },
  amount: {
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 32,
  },
});