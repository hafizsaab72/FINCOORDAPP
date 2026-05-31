import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { Split, Participant } from '../../types';
import { getSymbol } from '../../utils/currency';

interface PercentageSplitViewProps {
  splits: Split[];
  participants: Participant[];
  totalAmount: number;
  currency: string;
  onChangeSplits: (splits: Split[]) => void;
}

export default function PercentageSplitView({
  splits,
  participants,
  totalAmount,
  currency,
  onChangeSplits,
}: PercentageSplitViewProps) {
  const theme = useTheme();
  const symbol = getSymbol(currency);
  const activeParticipants = participants.filter(p => p.isActive);

  // Local input values - keyed by userId
  // Initialize from splits when populated (group flow).
  // When splits is empty (friends flow), seed from activeParticipants directly.
  const [inputValues, setInputValues] = useState<Record<string, string>>(() => {
    if (splits.length > 0) {
      const initial: Record<string, string> = {};
      for (const s of splits) {
        const v = s.value > 0 ? s.value.toString() : '';
        initial[s.userId] = v;
      }
      return initial;
    }
    // Friends/non-group flow: seed from activeParticipants immediately
    const initial: Record<string, string> = {};
    for (const p of activeParticipants) {
      initial[p.userId] = '';
    }
    return initial;
  });

  // When splits transitions from empty → populated (e.g. Equal → Percentage switch),
  // seed inputValues from the newly-arrived splits so displayed values match.
  const prevSplitsLen = useRef(splits.length);
  useEffect(() => {
    if (prevSplitsLen.current === 0 && splits.length > 0) {
      const seeded: Record<string, string> = {};
      for (const s of splits) {
        seeded[s.userId] = s.value > 0 ? s.value.toString() : '';
      }
      setInputValues(prev => ({ ...prev, ...seeded }));
    }
    prevSplitsLen.current = splits.length;
  }, [splits]);

  // Parse percentages from inputs
  const parsedPercentages = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [userId, text] of Object.entries(inputValues)) {
      result[userId] = parseFloat(text) || 0;
    }
    return result;
  }, [inputValues]);

  const totalPercentage = Object.values(parsedPercentages).reduce((s, v) => s + v, 0);
  const pctDiff = 100 - totalPercentage;

  // Computed amounts with last-active-absorbs-remainder to avoid 0.01 rounding errors.
  const computedAmounts = useMemo(() => {
    const result: Record<string, number> = {};
    let remainder = Math.round((totalAmount * 1000 - Math.floor(totalAmount * 1000)) / 10) / 100;
    let usedRemainder = false;

    for (const s of splits) {
      const pct = parsedPercentages[s.userId] ?? 0;
      if (pct <= 0) {
        result[s.userId] = 0;
        continue;
      }

      const exact = (pct / 100) * totalAmount;
      const floored = Math.floor(exact * 100) / 100;
      const isLastActive = !usedRemainder;

      result[s.userId] = isLastActive
        ? Math.round((floored + remainder) * 100) / 100
        : floored;

      if (isLastActive) {
        usedRemainder = true;
        remainder = 0;
      }
    }
    return result;
  }, [splits, parsedPercentages, totalAmount]);

  const totalComputed = Object.values(computedAmounts).reduce((s, v) => s + v, 0);
  const isValid = Math.abs(totalPercentage - 100) <= 0.05;

  const handleChange = useCallback((userId: string, text: string) => {
    setInputValues(prev => ({ ...prev, [userId]: text }));
  }, []);

  const syncToParent = useCallback(() => {
    // Produce splits for every tracked userId (covers participants added via friends flow
    // that may not exist in the initial splits array yet).
    const allUserIds = Array.from(new Set([...splits.map(s => s.userId), ...activeParticipants.map(p => p.userId)]));
    const newSplits = allUserIds.map(userId => ({
      userId,
      splitMethod: 'percentage' as const,
      value: parsedPercentages[userId] ?? 0,
      computedAmount: computedAmounts[userId] ?? 0,
    }));
    onChangeSplits(newSplits);
  }, [splits, activeParticipants, parsedPercentages, computedAmounts, onChangeSplits]);

  const handleBlur = useCallback(() => {
    syncToParent();
  }, [syncToParent]);

  const handleSubmitEditing = useCallback(() => {
    syncToParent();
  }, [syncToParent]);

  return (
    <View style={styles.container}>
      {activeParticipants.map(p => {
        const pct = parsedPercentages[p.userId] ?? 0;
        const amount = computedAmounts[p.userId] ?? 0;
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
                value={inputValues[p.userId] ?? ''}
                onChangeText={text => handleChange(p.userId, text)}
                onBlur={handleBlur}
                onSubmitEditing={handleSubmitEditing}
                placeholder="%"
                style={styles.valueInput}
                dense
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                textColor={theme.colors.onSurface}
              />
            </View>
            <Text
              variant="bodySmall"
              style={[styles.computed, { color: theme.colors.primary, fontWeight: '600' }]}>
              {symbol}{amount.toFixed(2)}
            </Text>
          </View>
        );
      })}

      {/* Footer with validation */}
      <View style={styles.footer}>
        <Text
          variant="bodySmall"
          style={{ color: isValid ? theme.success : theme.colors.error }}>
          Total: {totalPercentage.toFixed(2)}% / 100%
          {isValid ? ' ✓' : ` (off by ${Math.abs(pctDiff).toFixed(2)}%)`}
        </Text>
        {!isValid && (
          <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 4 }}>
            {pctDiff > 0 ? `Remaining: ${pctDiff.toFixed(2)}%` : `Overage: ${Math.abs(pctDiff).toFixed(2)}%`}
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
    width: 80,
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