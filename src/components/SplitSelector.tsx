import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

interface Props {
  selected: 'equal' | 'percentage' | 'custom';
  onSelect: (type: 'equal' | 'percentage' | 'custom') => void;
}

export const SplitSelector = ({ selected, onSelect }: Props) => {
  const { theme } = useAppTheme();
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
          style={[styles.btn, { borderColor: theme.border }, selected === type && { backgroundColor: theme.primary, borderColor: theme.primary }]}
          onPress={() => onSelect(type)}
        >
          <Text style={[styles.text, { color: selected === type ? '#FFF' : theme.textSecondary }]}>
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
    alignItems: 'center',
  },
  text: { fontSize: 10, fontWeight: 'bold' },
});
