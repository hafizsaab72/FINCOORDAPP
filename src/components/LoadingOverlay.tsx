import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Surface, Text, useTheme } from 'react-native-paper';

interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
}

export default function LoadingOverlay({ visible, text }: LoadingOverlayProps) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Surface
        style={[
          styles.container,
          { backgroundColor: theme.colors.surface },
        ]}
        elevation={3}>
        <ActivityIndicator
          animating
          color={theme.colors.primary}
          size="large"
        />
        {text && (
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurface, marginTop: 12 }}>
            {text}
          </Text>
        )}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  container: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
});
