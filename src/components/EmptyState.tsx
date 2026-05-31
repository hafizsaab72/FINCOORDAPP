import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, Button, useTheme } from 'react-native-paper';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void; icon?: string };
}

export default function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Icon source={icon} size={40} color={theme.colors.primary} />
      </View>
      <Text
        variant="titleMedium"
        style={[styles.title, { color: theme.colors.onSurface }]}>
        {title}
      </Text>
      {subtitle && (
        <Text
          variant="bodyMedium"
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {subtitle}
        </Text>
      )}
      {action && (
        <Button
          mode="contained"
          onPress={action.onPress}
          icon={action.icon}
          style={styles.button}>
          {action.label}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    gap: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
    fontWeight: '600',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  button: {
    marginTop: 8,
    borderRadius: 10,
  },
});
