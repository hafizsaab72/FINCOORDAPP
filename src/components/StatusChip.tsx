import React from 'react';
import { Chip, useTheme } from 'react-native-paper';

interface StatusChipProps {
  type: 'overdue' | 'pending' | 'settled' | 'paid' | 'handled';
  compact?: boolean;
}

export default function StatusChip({ type, compact = true }: StatusChipProps) {
  const theme = useTheme();

  const getConfig = () => {
    switch (type) {
      case 'overdue':
        return { color: theme.colors.error, icon: 'alert-circle-outline' };
      case 'pending':
        return { color: theme.colors.tertiary ?? '#FFAA00', icon: 'clock-outline' };
      case 'settled':
      case 'paid':
      case 'handled':
        return { color: theme.colors.primary, icon: 'check-circle-outline' };
      default:
        return { color: theme.colors.onSurfaceVariant, icon: 'help-circle-outline' };
    }
  };

  const cfg = getConfig();

  return (
    <Chip
      compact={compact}
      mode="outlined"
      icon={cfg.icon}
      textStyle={{ color: cfg.color, fontSize: 10, fontWeight: '700' }}
      style={{ borderColor: cfg.color }}>
      {type.toUpperCase()}
    </Chip>
  );
}
