import React, { useState, useCallback } from 'react';
import { Snackbar, useTheme } from 'react-native-paper';

interface SnackbarState {
  visible: boolean;
  message: string;
  type: 'info' | 'error' | 'success';
}

export function useAppSnackbar() {
  const [state, setState] = useState<SnackbarState>({
    visible: false,
    message: '',
    type: 'info',
  });

  const showSnackbar = useCallback(
    (message: string, type: SnackbarState['type'] = 'info') => {
      setState({ visible: true, message, type });
    },
    [],
  );

  const hideSnackbar = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
  }, []);

  return { state, showSnackbar, hideSnackbar };
}

export function AppSnackbar({
  state,
  onDismiss,
}: {
  state: SnackbarState;
  onDismiss: () => void;
}) {
  const theme = useTheme();

  const getColors = () => {
    switch (state.type) {
      case 'error':
        return {
          background: theme.colors.errorContainer,
          text: theme.colors.onErrorContainer,
        };
      case 'success':
        return {
          background: theme.colors.primaryContainer,
          text: theme.colors.onPrimaryContainer,
        };
      default:
        return {
          background: theme.colors.surfaceVariant,
          text: theme.colors.onSurfaceVariant,
        };
    }
  };

  const colors = getColors();

  return (
    <Snackbar
      visible={state.visible}
      onDismiss={onDismiss}
      duration={3000}
      style={{ backgroundColor: colors.background }}
      wrapperStyle={{ bottom: 24 }}
      action={{
        label: 'Dismiss',
        textColor: colors.text,
        onPress: onDismiss,
      }}>
      <>{colors.text}</>
      {state.message}
    </Snackbar>
  );
}
