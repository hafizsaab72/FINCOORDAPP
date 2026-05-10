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
      <Icon source={icon} size={48} color={theme.colors.outline} />
      <Text
        variant="bodyLarge"
        style={[styles.title, { color: theme.colors.onSurfaceVariant }]}>
        {title}
      </Text>
      {subtitle && (
        <Text
          variant="bodySmall"
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {subtitle}
        </Text>
      )}
      {action && (
        <Button
          mode="text"
          onPress={action.onPress}
          icon={action.icon}
          textColor={theme.colors.primary}
          style={{ marginTop: 8 }}>
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
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
