import React from 'react';
import { View, Text } from 'react-native';
import { colors as staticColors } from '../theme/tokens';
import { getSymbol } from '../utils/currency';
import { useTheme } from '../context/ThemeContext';

interface RemainingIndicatorProps {
  totalAmount: number;
  currentSum: number;
  currency: string;
  mode: 'exact' | 'percentage' | 'equal' | 'shares';
  includedCount?: number;
}

export default function RemainingIndicator({
  totalAmount,
  currentSum,
  currency,
  mode,
  includedCount,
}: RemainingIndicatorProps) {
  const { colors } = useTheme();
  const sym = getSymbol(currency);
  const fmt = (v: number) => `${sym}${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (mode === 'equal') {
    const share = includedCount && includedCount > 0 ? totalAmount / includedCount : 0;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: colors.credit, fontSize: 14, fontWeight: '600' }}>
          ✓ {fmt(share)} per person ({includedCount} people)
        </Text>
      </View>
    );
  }

  if (mode === 'percentage') {
    const diff = currentSum - 100;
    const exact = Math.abs(diff) < 0.5;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: exact ? colors.credit : colors.debt, fontSize: 14, fontWeight: '600' }}>
          {exact
            ? `✓ ${currentSum.toFixed(1)}% — split is exact`
            : diff < 0
            ? `${Math.abs(diff).toFixed(1)}% remaining`
            : `${diff.toFixed(1)}% over 100%`}
        </Text>
      </View>
    );
  }

  if (mode === 'shares') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: colors.credit, fontSize: 14, fontWeight: '600' }}>
          ✓ {currentSum.toFixed(0)} total shares
        </Text>
      </View>
    );
  }

  // exact / adjustment
  const remaining = totalAmount - currentSum;
  const exact = Math.abs(remaining) < 0.01;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <Text style={{ color: exact ? colors.credit : colors.debt, fontSize: 14, fontWeight: '600' }}>
        {exact
          ? `✓ Split is exact — ${fmt(totalAmount)} total`
          : remaining > 0
          ? `${fmt(remaining)} remaining`
          : `${fmt(Math.abs(remaining))} over budget`}
      </Text>
    </View>
  );
}
