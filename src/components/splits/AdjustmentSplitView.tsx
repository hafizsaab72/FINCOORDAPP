import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { Split, Participant } from '../../types';
import { getSymbol } from '../../utils/currency';

interface AdjustmentSplitViewProps {
  splits: Split[];
  participants: Participant[];
  totalAmount: number;
  currency: string;
  onChangeSplits: (splits: Split[]) => void;
}

export default function AdjustmentSplitView({
  splits,
  participants,
  totalAmount,
  currency,
  onChangeSplits,
}: AdjustmentSplitViewProps) {
  const theme = useTheme();
  const symbol = getSymbol(currency);
  const activeParticipants = participants.filter(p => p.isActive);

  // Local input values for adjustments - keyed by userId
  // Initialize from splits when populated (group flow).
  // When splits is empty (friends flow), seed from activeParticipants directly.
  const [inputValues, setInputValues] = useState<Record<string, string>>(() => {
    if (splits.length > 0) {
      const initial: Record<string, string> = {};
      for (const s of splits) {
        const val = s.value !== 0 ? s.value.toString() : '';
        initial[s.userId] = val;
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

  // When splits transitions from empty → populated (e.g. Equal → Adjustment switch),
  // seed inputValues from the newly-arrived splits so displayed values match.
  const prevSplitsLen = useRef(splits.length);
  useEffect(() => {
    if (prevSplitsLen.current === 0 && splits.length > 0) {
      const seeded: Record<string, string> = {};
      for (const s of splits) {
        seeded[s.userId] = s.value !== 0 ? s.value.toString() : '';
      }
      setInputValues(prev => ({ ...prev, ...seeded }));
    }
    prevSplitsLen.current = splits.length;
  }, [splits]);

  // Base equal share per person
  const basePerPerson = activeParticipants.length > 0
    ? totalAmount / activeParticipants.length
    : 0;

  // Parse adjustments from inputs
  const parsedAdjustments = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [userId, text] of Object.entries(inputValues)) {
      result[userId] = parseFloat(text) || 0;
    }
    return result;
  }, [inputValues]);

  // Computed amounts based on base + adjustment
  const computedAmounts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const s of splits) {
      const adjustment = parsedAdjustments[s.userId] ?? 0;
      result[s.userId] = basePerPerson + adjustment;
    }
    return result;
  }, [splits, parsedAdjustments, basePerPerson]);

  // Total adjustments (should sum to 0 for validity)
  const totalAdjustments = useMemo(() => {
    return Object.values(parsedAdjustments).reduce((s, v) => s + v, 0);
  }, [parsedAdjustments]);

  const isValid = Math.abs(totalAdjustments) <= 0.005;

  // Check if any computed amount would be negative
  const hasNegative = useMemo(() => {
    return Object.values(computedAmounts).some(v => v < 0);
  }, [computedAmounts]);

  const handleChange = useCallback((userId: string, text: string) => {
    setInputValues(prev => ({ ...prev, [userId]: text }));
  }, []);

  const syncToParent = useCallback(() => {
    // Produce splits for every tracked userId (covers participants added via friends flow).
    const allUserIds = Array.from(new Set([...splits.map(s => s.userId), ...activeParticipants.map(p => p.userId)]));
    const newSplits = allUserIds.map(userId => ({
      userId,
      splitMethod: 'adjustment' as const,
      value: parsedAdjustments[userId] ?? 0,
      computedAmount: computedAmounts[userId] ?? 0,
    }));
    onChangeSplits(newSplits);
  }, [splits, activeParticipants, parsedAdjustments, computedAmounts, onChangeSplits]);

  const handleBlur = useCallback(() => {
    syncToParent();
  }, [syncToParent]);

  const handleSubmitEditing = useCallback(() => {
    syncToParent();
  }, [syncToParent]);

  return (
    <View style={styles.container}>
      {/* Base amount info */}
      <View style={styles.baseInfo}>
        <Text variant="bodySmall" style={{ color: theme.colors.textSecondary }}>
          Base per person: {symbol}{basePerPerson.toFixed(2)}
        </Text>
      </View>

      {activeParticipants.map(p => {
        const adjustment = parsedAdjustments[p.userId] ?? 0;
        const amount = computedAmounts[p.userId] ?? 0;
        return (
          <View key={p.userId} style={styles.row}>
            <Text
              variant="bodyMedium"
              style={[styles.name, { color: theme.colors.onSurface }]}>
              {p.name}
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.baseLabel, { color: theme.colors.textTertiary }]}>
              {symbol}{basePerPerson.toFixed(2)}
            </Text>
            <View style={styles.inputWrap}>
              <TextInput
                mode="outlined"
                keyboardType="decimal-pad"
                value={inputValues[p.userId] ?? ''}
                onChangeText={text => handleChange(p.userId, text)}
                onBlur={handleBlur}
                onSubmitEditing={handleSubmitEditing}
                placeholder="±0"
                style={styles.valueInput}
                dense
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                textColor={theme.colors.onSurface}
              />
            </View>
            <Text
              variant="bodySmall"
              style={[
                styles.computed,
                {
                  color: amount < 0 ? theme.colors.error : theme.colors.primary,
                  fontWeight: '600'
                }
              ]}>
              {symbol}{amount.toFixed(2)}
            </Text>
          </View>
        );
      })}

      {/* Footer with validation */}
      <View style={styles.footer}>
        <Text
          variant="bodySmall"
          style={{ color: isValid && !hasNegative ? theme.success : theme.colors.error }}>
          Adjustments: {symbol}{totalAdjustments.toFixed(2)} (must = 0)
        </Text>
        {hasNegative && (
          <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 4 }}>
            Amounts cannot be negative
          </Text>
        )}
        {!isValid && !hasNegative && (
          <Text variant="bodySmall" style={{ color: theme.warning, marginTop: 4 }}>
            Off by {symbol}{Math.abs(totalAdjustments).toFixed(2)} — adjust to zero
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
  baseInfo: {
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
  },
  baseLabel: {
    width: 60,
    textAlign: 'right',
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