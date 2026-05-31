import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export const EXPENSE_CATEGORIES = [
  { id: 'general', label: 'General', icon: 'cash' },
  { id: 'dining', label: 'Dining Out', icon: 'food-fork-drink' },
  { id: 'groceries', label: 'Groceries', icon: 'cart-outline' },
  { id: 'rent', label: 'Rent & Mortgage', icon: 'home-outline' },
  { id: 'utilities', label: 'Utilities', icon: 'flash-outline' },
  { id: 'travel', label: 'Travel & Transport', icon: 'train-car' },
  { id: 'flights', label: 'Flights', icon: 'airplane' },
  { id: 'entertainment', label: 'Entertainment', icon: 'movie-open-outline' },
  { id: 'health', label: 'Health & Medical', icon: 'medical-bag' },
  { id: 'shopping', label: 'Shopping', icon: 'shopping-outline' },
];

interface CategoryPickerProps {
  selected: string;
  onSelect: (categoryId: string) => void;
}

export default function CategoryPicker({ selected, onSelect }: CategoryPickerProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="titleSmall" style={[styles.header, { color: theme.colors.textSecondary }]}>
        Category
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipsRow}>
          {EXPENSE_CATEGORIES.map(cat => {
            const isSelected = selected === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primaryContainer
                      : theme.colors.surfaceVariant,
                    borderColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.outline,
                  },
                ]}
                onPress={() => onSelect(cat.id)}>
                <MaterialCommunityIcons
                  name={cat.icon}
                  size={18}
                  color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text
                  variant="bodySmall"
                  style={{
                    color: isSelected
                      ? theme.colors.onPrimaryContainer
                      : theme.colors.onSurfaceVariant,
                    marginTop: 4,
                  }}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  chip: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 80,
  },
});
