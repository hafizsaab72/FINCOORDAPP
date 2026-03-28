import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { useAppTheme } from '../context/ThemeContext';

interface ProGateProps {
  feature: string;
  children: React.ReactNode;
}

/**
 * Wraps Pro-only content. Free users see a locked placeholder with a CTA.
 * Pro users see the children directly.
 */
export default function ProGate({ feature, children }: ProGateProps) {
  const isPro = useStore(state => state.isPro);
  const { theme } = useAppTheme();
  const navigation = useNavigation<any>();

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Icon source="lock-outline" size={32} color={theme.primary} />
      <Text variant="titleSmall" style={[styles.title, { color: theme.text }]}>
        {feature} is a Pro feature
      </Text>
      <Text variant="bodySmall" style={styles.sub}>
        Upgrade to FinCoord Pro to unlock this and more.
      </Text>
      <Button
        mode="contained"
        icon="crown"
        onPress={() => navigation.navigate('Upgrade')}
        style={[styles.btn, { backgroundColor: theme.primary }]}
        compact
      >
        Go Pro
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  title: { fontWeight: '600', textAlign: 'center' },
  sub: { color: '#888', textAlign: 'center' },
  btn: { marginTop: 4, borderRadius: 20 },
});
