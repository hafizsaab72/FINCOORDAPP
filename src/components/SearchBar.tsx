import React from 'react';
import { TextInput, StyleSheet, View } from 'react-native';
import { lightTheme } from '../constants/theme';

export const SearchBar = ({ placeholder, value, onChangeText }: any) => (
  <View style={styles.container}>
    <TextInput
      style={styles.input}
      placeholder={placeholder || 'Search...'}
      placeholderTextColor="#999"
      value={value}
      onChangeText={onChangeText}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  input: {
    backgroundColor: lightTheme.surface,
    borderWidth: 1,
    borderColor: lightTheme.border,
    padding: 12,
    borderRadius: 8,
    color: lightTheme.text,
  },
});
