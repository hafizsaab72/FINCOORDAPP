import React from 'react';
import { SegmentedButtons, useTheme } from 'react-native-paper';

interface SplitSelectorProps {
  selected: 'equal' | 'percentage' | 'custom' | string;
  onSelect: (type: string) => void;
  options?: Array<{ value: string; label: string; icon?: string }>;
}

const DEFAULT_OPTIONS = [
  { value: 'equal', label: 'Equal', icon: 'equal' },
  { value: 'percentage', label: '%', icon: 'percent' },
  { value: 'custom', label: 'Custom', icon: 'tune' },
];

export default function SplitSelector({
  selected,
  onSelect,
  options = DEFAULT_OPTIONS,
}: SplitSelectorProps) {
  const theme = useTheme();

  return (
    <SegmentedButtons
      value={selected}
      onValueChange={onSelect}
      buttons={options.map(opt => ({
        value: opt.value,
        label: opt.label,
        icon: opt.icon,
        checkedColor: theme.colors.onPrimary,
        uncheckedColor: theme.colors.onSurfaceVariant,
      }))}
      style={{ marginBottom: 16 }}
    />
  );
}
