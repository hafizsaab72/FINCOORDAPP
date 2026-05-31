import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { Split, Participant } from '../../types';
import { getSymbol } from '../../utils/currency';

interface ExactSplitViewProps {
  splits: Split[];
  participants: Participant[];
  totalAmount: number;
  currency: string;
  onChangeSplits: (splits: Split[]) => void;
}

export default function ExactSplitView({
  splits,
  participants,
  totalAmount,
  currency,
  onChangeSplits,
}: ExactSplitViewProps) {
  const theme = useTheme();
  const symbol = getSymbol(currency);
  const activeParticipants = participants.filter(p => p.isActive);

  // Track computed amounts as the user types (both .value and .computedAmount = input)
  // Initialize from splits only when splits is populated (group flow).
  // When splits is empty (friends flow), build from activeParticipants directly so
  // newly-added participants get a valid initial state before the first onChangeSplits call.
  const [trackedAmounts, setTrackedAmounts] = useState<Record<string, number>>(() => {
    if (splits.length > 0) {
      const initial: Record<string, number> = {};
      for (const s of splits) {
        const v = s.computedAmount > 0 ? s.computedAmount : s.value;
        initial[s.userId] = v > 0 ? v : 0;
      }
      return initial;
    }
    // Friends/non-group flow: seed from activeParticipants immediately
    const initial: Record<string, number> = {};
    for (const p of activeParticipants) {
      initial[p.userId] = 0;
    }
    return initial;
  });

  const computedSum = Object.values(trackedAmounts).reduce((s, v) => s + v, 0);
  const diff = totalAmount - computedSum;
  const isValid = Math.abs(diff) <= 0.005;

  const handleChange = (userId: string, text: string) => {
    const num = parseFloat(text) || 0;
    setTrackedAmounts(prev => ({ ...prev, [userId]: num }));
  };

  // Sync computed amounts to parent whenever they change.
  // Include splits in the key so we also fire when the parent populates splits
  // (e.g. switching from Equal → Exact when splits was []).
  const prevKeyRef = useRef<string>('');
  const key = JSON.stringify({
    splits: splits.map(s => ({ userId: s.userId, computedAmount: s.computedAmount })),
    tracked: trackedAmounts,
  });

  useEffect(() => {
    if (!onChangeSplits) return;
    if (key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      const allUserIds = Array.from(new Set([...splits.map(s => s.userId), ...activeParticipants.map(p => p.userId)]));
      const newSplits = allUserIds.map(userId => ({
        userId,
        splitMethod: 'exact' as const,
        value: trackedAmounts[userId] ?? 0,
        computedAmount: trackedAmounts[userId] ?? 0,
      }));
      onChangeSplits(newSplits);
    }
  }, [key, splits, trackedAmounts, activeParticipants, onChangeSplits]);

  return (
    <View style={styles.container}>
      {activeParticipants.map(p => {
        const amount = trackedAmounts[p.userId] ?? 0;
        return (
          <View key={p.userId} style={styles.row}>
            <Text
              variant="bodyMedium"
              style={[styles.name, { color: theme.colors.onSurface }]}>
              {p.name}
            </Text>
            <View style={styles.inputWrap}>
              <TextInput
                mode="outlined"
                keyboardType="decimal-pad"
                value={amount > 0 ? amount.toString() : ''}
                onChangeText={text => handleChange(p.userId, text)}
                placeholder={symbol}
                style={styles.valueInput}
                dense
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                textColor={theme.colors.onSurface}
              />
            </View>
          </View>
        );
      })}

      {/* Footer with validation */}
      <View style={styles.footer}>
        <Text
          variant="bodySmall"
          style={{ color: isValid ? theme.success : theme.colors.error }}>
          Total: {symbol}{computedSum.toFixed(2)} / {symbol}{totalAmount.toFixed(2)}
        </Text>
        {!isValid && (
          <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 4 }}>
            {diff > 0 ? `Remaining: ${symbol}${diff.toFixed(2)}` : `Overage: ${symbol}${Math.abs(diff).toFixed(2)}`}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
  },
  inputWrap: {
    width: 100,
  },
  valueInput: {
    height: 40,
    backgroundColor: 'transparent',
  },
  computed: {
    width: 80,
    textAlign: 'right',
  },
  footer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
});