import React from 'react';
import { StyleSheet } from 'react-native';
import { Searchbar, useTheme } from 'react-native-paper';

interface AppSearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  loading?: boolean;
}

export default function AppSearchBar({
  placeholder = 'Search...',
  value,
  onChangeText,
  onSubmit,
  loading = false,
}: AppSearchBarProps) {
  const theme = useTheme();

  return (
    <Searchbar
      placeholder={placeholder}
      onChangeText={onChangeText}
      value={value}
      onSubmitEditing={onSubmit}
      loading={loading}
      style={[
        styles.searchbar,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      inputStyle={{ color: theme.colors.onSurface }}
      iconColor={theme.colors.onSurfaceVariant}
      placeholderTextColor={theme.colors.onSurfaceVariant}
    />
  );
}

const styles = StyleSheet.create({
  searchbar: {
    borderRadius: 14,
    borderWidth: 1,
    height: 48,
    marginVertical: 8,
  },
});
