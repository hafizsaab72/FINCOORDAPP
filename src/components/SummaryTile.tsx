import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Surface, Text, Icon, useTheme } from 'react-native-paper';

interface SummaryTileProps {
  label: string;
  value: string;
  type: 'positive' | 'negative' | 'neutral';
  icon?: string;
  glow?: boolean;
}

export default function SummaryTile({ label, value, type, icon, glow }: SummaryTileProps) {
  const theme = useTheme();

  const valueColor =
    type === 'positive'
      ? (theme.colors as any).success ?? '#4ADE80'
      : type === 'negative'
      ? theme.colors.error
      : theme.colors.onSurface;

  return (
    <Surface
      style={[
        styles.tile,
        glow && styles.tileGlow,
        glow && Platform.OS === 'ios' && {
          shadowColor: valueColor,
          shadowOpacity: 0.2,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 2 },
        },
      ]}
      elevation={1}
    >
      {icon && <Icon source={icon} size={24} color={valueColor} />}
      <Text variant="labelSmall" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text variant="titleMedium" style={[styles.value, { color: valueColor }]}>
        {value}
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    marginHorizontal: 4,
    gap: 6,
    alignItems: 'flex-start',
  },
  tileGlow: {
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
  value: { fontWeight: '600' },
});
