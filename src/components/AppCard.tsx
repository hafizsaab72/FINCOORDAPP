import React from 'react';
import { StyleSheet, ViewProps, Platform } from 'react-native';
import { Card, Surface, useTheme } from 'react-native-paper';

interface AppCardProps extends ViewProps {
  children: React.ReactNode;
  mode?: 'elevated' | 'outlined' | 'contained';
  elevation?: 0 | 1 | 2 | 3 | 4 | 5;
  glow?: boolean;
}

export default function AppCard({
  children,
  mode = 'outlined',
  elevation = 0,
  glow = false,
  style,
  ...props
}: AppCardProps) {
  const theme = useTheme();

  if (mode === 'elevated') {
    return (
      <Surface
        style={[
          styles.surface,
          glow && styles.surfaceGlow,
          glow && Platform.OS === 'ios' && {
            shadowColor: theme.colors.primary,
            shadowOpacity: 0.25,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
          },
          { backgroundColor: theme.colors.surface },
          style,
        ]}
        elevation={elevation}
        {...props}>
        {children}
      </Surface>
    );
  }

  return (
    <Card
      mode={mode}
      style={[
        styles.card,
        glow && styles.cardGlow,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
        style,
      ]}
      {...props}>
      <Card.Content>{children}</Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardGlow: {
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderWidth: 1.5,
  },
  surface: {
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  surfaceGlow: {
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderWidth: 1.5,
  },
});
