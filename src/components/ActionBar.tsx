import React from 'react';
import { ScrollView, StyleSheet, Platform } from 'react-native';
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
          style={[
            styles.button,
            action.variant === 'contained' && styles.buttonPrimary,
          ]}
          contentStyle={styles.buttonContent}
          labelStyle={styles.label}
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
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  button: {
    borderRadius: 12,
    height: 48,
    minWidth: 80,
  },
  buttonPrimary: {
    ...Platform.select({
      ios: {
        shadowColor: '#A855F7',
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  buttonContent: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 0,
  },
});
