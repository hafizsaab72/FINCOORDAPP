import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, SegmentedButtons } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { SplitMethod } from '../types';
import {
  EqualSplitView,
  ExactSplitView,
  PercentageSplitView,
  SharesSplitView,
  AdjustmentSplitView,
} from './splits';
import { Split, Participant } from '../types';

interface SplitConfiguratorProps {
  method: SplitMethod;
  splits: Split[];
  participants: Participant[];
  totalAmount: number;
  currency: string;
  onChangeMethod: (method: SplitMethod) => void;
  onChangeSplits: (splits: Split[]) => void;
}

const SPLIT_OPTIONS = [
  { value: 'equal', label: 'Equal' },
  { value: 'exact', label: 'Exact' },
  { value: 'percentage', label: '%' },
  { value: 'shares', label: 'Shares' },
  { value: 'adjustment', label: 'Adjust' },
];

export default function SplitConfigurator({
  method,
  splits,
  participants,
  totalAmount,
  currency,
  onChangeMethod,
  onChangeSplits,
}: SplitConfiguratorProps) {
  const theme = useTheme();

  const activeParticipants = participants.filter(p => p.isActive);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleSmall" style={{ color: theme.colors.textSecondary }}>
          How to Split
        </Text>
      </View>

      <SegmentedButtons
        value={method}
        onValueChange={v => onChangeMethod(v as SplitMethod)}
        buttons={[
          { value: 'equal', label: 'Equal', checkedColor: theme.colors.primary },
          { value: 'exact', label: 'Exact', checkedColor: theme.colors.primary },
          { value: 'percentage', label: '%', checkedColor: theme.colors.primary },
          { value: 'shares', label: 'Shares', checkedColor: theme.colors.primary },
          { value: 'adjustment', label: 'Adjust', checkedColor: theme.colors.primary },
        ]}
        style={{ marginBottom: 12 }}
      />

      {method === 'equal' && (
        <EqualSplitView
          splits={splits}
          participants={activeParticipants}
          totalAmount={totalAmount}
          currency={currency}
          onChangeSplits={onChangeSplits}
        />
      )}

      {method === 'exact' && (
        <ExactSplitView
          splits={splits}
          participants={activeParticipants}
          totalAmount={totalAmount}
          currency={currency}
          onChangeSplits={onChangeSplits}
        />
      )}

      {method === 'percentage' && (
        <PercentageSplitView
          splits={splits}
          participants={activeParticipants}
          totalAmount={totalAmount}
          currency={currency}
          onChangeSplits={onChangeSplits}
        />
      )}

      {method === 'shares' && (
        <SharesSplitView
          splits={splits}
          participants={activeParticipants}
          totalAmount={totalAmount}
          currency={currency}
          onChangeSplits={onChangeSplits}
        />
      )}

      {method === 'adjustment' && (
        <AdjustmentSplitView
          splits={splits}
          participants={activeParticipants}
          totalAmount={totalAmount}
          currency={currency}
          onChangeSplits={onChangeSplits}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    marginBottom: 12,
  },
});
