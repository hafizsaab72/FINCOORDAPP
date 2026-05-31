import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { Split, Participant } from '../../types';
import { getSymbol } from '../../utils/currency';

interface SharesSplitViewProps {
  splits: Split[];
  participants: Participant[];
  totalAmount: number;
  currency: string;
  onChangeSplits: (splits: Split[]) => void;
}

export default function SharesSplitView({
  splits,
  participants,
  totalAmount,
  currency,
  onChangeSplits,
}: SharesSplitViewProps) {
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

  // When splits transitions from empty → populated (e.g. Equal → Shares switch),
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

  // Parse share counts from inputs
  const parsedShares = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [userId, text] of Object.entries(inputValues)) {
      result[userId] = parseInt(text, 10) || 0;
    }
    return result;
  }, [inputValues]);

  // Total shares
  const totalShares = useMemo(() => {
    return Object.values(parsedShares).reduce((s, v) => s + v, 0);
  }, [parsedShares]);

  // Computed amounts: last active person absorbs rounding remainder so total always = totalAmount exactly.
  const computedAmounts = useMemo(() => {
    const result: Record<string, number> = {};
    if (totalShares <= 0) return result;

    // Floor each amount to 2dp, track remainder.
    let remainder = Math.round((totalAmount - Math.floor(totalAmount * 100)) / 100) * 100;
    let usedRemainder = false;

    for (const s of splits) {
      const shares = parsedShares[s.userId] ?? 0;
      if (shares <= 0) {
        result[s.userId] = 0;
        continue;
      }

      const exact = (shares / totalShares) * totalAmount;
      const floored = Math.floor(exact * 100) / 100;
      const isLastActive = !usedRemainder; // assign remainder to first valid split

      result[s.userId] = isLastActive
        ? Math.round((floored + remainder) * 100) / 100
        : floored;

      if (isLastActive) {
        usedRemainder = true;
        remainder = 0;
      }
    }
    return result;
  }, [splits, parsedShares, totalShares, totalAmount]);

  const totalComputed = Object.values(computedAmounts).reduce((s, v) => s + v, 0);

  const handleChange = useCallback((userId: string, text: string) => {
    setInputValues(prev => ({ ...prev, [userId]: text }));
  }, []);

  const syncToParent = useCallback(() => {
    // Produce splits for every tracked userId (covers participants added via friends flow).
    const allUserIds = Array.from(new Set([...splits.map(s => s.userId), ...activeParticipants.map(p => p.userId)]));
    const newSplits = allUserIds.map(userId => ({
      userId,
      splitMethod: 'shares' as const,
      value: parsedShares[userId] ?? 0,
      computedAmount: computedAmounts[userId] ?? 0,
    }));
    onChangeSplits(newSplits);
  }, [splits, activeParticipants, parsedShares, computedAmounts, onChangeSplits]);

  const handleBlur = useCallback(() => {
    syncToParent();
  }, [syncToParent]);

  const handleSubmitEditing = useCallback(() => {
    syncToParent();
  }, [syncToParent]);

  return (
    <View style={styles.container}>
      {activeParticipants.map(p => {
        const shares = parsedShares[p.userId] ?? 0;
        const amount = computedAmounts[p.userId] ?? 0;
        const sharePct = totalShares > 0 ? (shares / totalShares) * 100 : 0;
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
                keyboardType="number-pad"
                value={inputValues[p.userId] ?? ''}
                onChangeText={text => handleChange(p.userId, text)}
                onBlur={handleBlur}
                onSubmitEditing={handleSubmitEditing}
                placeholder="0"
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

      {/* Footer with summary */}
      <View style={styles.footer}>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.textSecondary }}>
          Total shares: {totalShares} | {symbol}{totalComputed.toFixed(2)} / {symbol}{totalAmount.toFixed(2)}
        </Text>
        {totalShares === 0 && (
          <Text variant="bodySmall" style={{ color: theme.warning, marginTop: 4 }}>
            Enter share counts to split the amount
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
    width: 70,
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
