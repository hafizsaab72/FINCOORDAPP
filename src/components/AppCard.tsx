import React from 'react';
import { StyleSheet, ViewProps } from 'react-native';
import { Card, Surface, useTheme } from 'react-native-paper';

interface AppCardProps extends ViewProps {
  children: React.ReactNode;
  mode?: 'elevated' | 'outlined' | 'contained';
  elevation?: 0 | 1 | 2 | 3 | 4 | 5;
}

export default function AppCard({
  children,
  mode = 'outlined',
  elevation = 0,
  style,
  ...props
}: AppCardProps) {
  const theme = useTheme();

  if (mode === 'elevated') {
    return (
      <Surface
        style={[
          styles.surface,
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
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
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
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  surface: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
});
