import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { lightTheme } from '../constants/theme';

interface SummaryProps {
  label: string;
  value: string;
  type: 'positive' | 'negative' | 'neutral';
}

export const SummaryTile = ({ label, value, type }: SummaryProps) => {
  const valueColor =
    type === 'positive'
      ? '#0F7A5B'
      : type === 'negative'
      ? '#FF3B30'
      : '#1E1E1E';

  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    padding: 16,
    backgroundColor: lightTheme.surface,
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: lightTheme.border,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: { fontSize: 20, fontWeight: 'bold' },
});
