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
        return { color: theme.colors.error, icon: 'alert-circle-outline', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'pending':
        return { color: theme.colors.tertiary ?? '#F59E0B', icon: 'clock-outline', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'settled':
      case 'paid':
      case 'handled':
        return { color: (theme.colors as any).success ?? '#4ADE80', icon: 'check-circle-outline', bg: 'rgba(34, 197, 94, 0.15)' };
      default:
        return { color: theme.colors.onSurfaceVariant, icon: 'help-circle-outline', bg: 'rgba(148, 163, 184, 0.15)' };
    }
  };

  const cfg = getConfig();

  return (
    <Chip
      compact={compact}
      mode="flat"
      icon={cfg.icon}
      textStyle={{ color: cfg.color, fontSize: 10, fontWeight: '700', letterSpacing: 0.05 }}
      style={{ backgroundColor: cfg.bg, borderRadius: 6 }}
      selectedColor={cfg.color}>
      {type.toUpperCase()}
    </Chip>
  );
}
