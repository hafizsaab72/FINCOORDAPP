import React from 'react';
import { StyleSheet } from 'react-native';
import { Surface, Text, Icon, useTheme } from 'react-native-paper';

interface SummaryTileProps {
  label: string;
  value: string;
  type: 'positive' | 'negative' | 'neutral';
  icon?: string;
}

export default function SummaryTile({ label, value, type, icon }: SummaryTileProps) {
  const theme = useTheme();

  const valueColor =
    type === 'positive'
      ? theme.colors.primary
      : type === 'negative'
      ? theme.colors.error
      : theme.colors.onSurface;

  return (
    <Surface style={styles.tile} elevation={1}>
      {icon && <Icon source={icon} size={24} color={valueColor} />}
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="titleLarge" style={[styles.value, { color: valueColor }]}>
        {value}
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    gap: 6,
    alignItems: 'flex-start',
  },
  value: { fontWeight: '700' },
});
