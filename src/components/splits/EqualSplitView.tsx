import React, { useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { Split, Participant } from '../../types';
import { getSymbol } from '../../utils/currency';

interface EqualSplitViewProps {
  splits: Split[];
  participants: Participant[];
  totalAmount: number;
  currency: string;
  onChangeSplits?: (splits: Split[]) => void;
}

export default function EqualSplitView({
  splits,
  participants,
  totalAmount,
  currency,
  onChangeSplits,
}: EqualSplitViewProps) {
  const theme = useTheme();
  const symbol = getSymbol(currency);
  const activeParticipants = participants.filter(p => p.isActive);

  // Compute equal shares rounded to 2dp; last person absorbs the rounding remainder
  // so the total always sums exactly to totalAmount (avoids 166.67+166.67+166.67=500.01).
  const computedSplits = useMemo(() => {
    const n = activeParticipants.length;
    if (n === 0) return splits;

    // If splits is empty (friends/non-group flow), generate splits from activeParticipants.
    if (splits.length === 0) {
      const share = Math.floor((totalAmount / n) * 100) / 100;
      const remainder = Math.round((totalAmount - share * n) * 100) / 100;
      let remainderUsed = false;
      return activeParticipants.map(p => {
        const amount = remainderUsed ? share : Math.round((share + remainder) * 100) / 100;
        remainderUsed = true;
        return { userId: p.userId, splitMethod: 'equal' as const, value: 1, computedAmount: amount, isActive: true };
      });
    }

    // splits is populated (group flow) — update computedAmount on existing split entries.
    const share = Math.floor((totalAmount / n) * 100) / 100;
    const remainder = Math.round((totalAmount - share * n) * 100) / 100;
    let remainderUsed = false;
    return splits.map(s => {
      const isActive = activeParticipants.some(p => p.userId === s.userId);
      if (!isActive) return { ...s, computedAmount: s.computedAmount };
      const amount = remainderUsed ? share : Math.round((share + remainder) * 100) / 100;
      remainderUsed = true;
      return { ...s, computedAmount: amount };
    });
  }, [splits, activeParticipants, totalAmount]);

  // Sync computed amounts back to parent.
  // - Always fire on mount (no prevKeyRef check) so splits are seeded before validation runs.
  // - On updates, use JSON key comparison to avoid redundant syncs.
  const isFirstRender = useRef(true);
  const prevKeyRef = useRef<string>('');
  const key = JSON.stringify(
    computedSplits.map(s => ({ userId: s.userId, computedAmount: s.computedAmount }))
  );

  useEffect(() => {
    if (!onChangeSplits) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      onChangeSplits(computedSplits);
    } else if (key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      onChangeSplits(computedSplits);
    }
  }, [key, computedSplits, onChangeSplits]);

  return (
    <View style={styles.container}>
      {activeParticipants.map((p, idx) => {
        const split = computedSplits.find(s => s.userId === p.userId);
        const amount = split?.computedAmount ?? 0;
        const isLast = idx === activeParticipants.length - 1;
        return (
          <View key={p.userId} style={styles.row}>
            <Text
              variant="bodyMedium"
              style={[styles.name, { color: theme.colors.onSurface }]}>
              {p.name}
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.amount,
                { color: theme.colors.primary, fontWeight: '700' }
              ]}>
              {symbol}{amount.toFixed(2)}{isLast ? ' ✓' : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.05)',
  },
  name: {
    flex: 1,
  },
  amount: {
    minWidth: 80,
    textAlign: 'right',
  },
});
