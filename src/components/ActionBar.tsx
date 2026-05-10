import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, useTheme } from 'react-native-paper';

interface Action {
  icon: string;
  label: string;
  onPress: () => void;
  variant?: 'contained' | 'outlined' | 'contained-tonal';
}

interface ActionBarProps {
  actions: Action[];
}

export default function ActionBar({ actions }: ActionBarProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {actions.map((action, index) => (
        <Button
          key={index}
          mode={action.variant || 'contained-tonal'}
          icon={action.icon}
          onPress={action.onPress}
          style={styles.button}
          buttonColor={
            action.variant === 'contained' ? theme.colors.primary : undefined
          }
          textColor={
            action.variant === 'contained'
              ? theme.colors.onPrimary
              : theme.colors.onSurface
          }>
          {action.label}
        </Button>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  button: {
    borderRadius: 20,
  },
});
