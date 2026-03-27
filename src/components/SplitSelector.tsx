import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { lightTheme } from '../constants/theme';

interface Props {
  selected: 'equal' | 'percentage' | 'custom';
  onSelect: (type: 'equal' | 'percentage' | 'custom') => void;
}

export const SplitSelector = ({ selected, onSelect }: Props) => {
  const types: Array<'equal' | 'percentage' | 'custom'> = [
    'equal',
    'percentage',
    'custom',
  ];

  return (
    <View style={styles.container}>
      {types.map(type => (
        <TouchableOpacity
          key={type}
          style={[styles.btn, selected === type && styles.activeBtn]}
          onPress={() => onSelect(type)}
        >
          <Text style={[styles.text, selected === type && styles.activeText]}>
            {type.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  btn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: lightTheme.border,
    alignItems: 'center',
  },
  activeBtn: {
    backgroundColor: lightTheme.primary,
    borderColor: lightTheme.primary,
  },
  text: { fontSize: 10, fontWeight: 'bold', color: '#666' },
  activeText: { color: '#FFF' },
});
