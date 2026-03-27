import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { lightTheme } from '../constants/theme';

export const StatusChip = ({
  type,
}: {
  type: 'overdue' | 'pending' | 'settled';
}) => {
  const getColor = () => {
    if (type === 'overdue') return '#FF3B30';
    if (type === 'settled') return lightTheme.primary;
    return '#FFCC00';
  };

  return (
    <View style={[styles.chip, { borderColor: getColor() }]}>
      <Text style={[styles.text, { color: getColor() }]}>
        {type.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: { fontSize: 10, fontWeight: '700' },
});
