import React, { Component, ErrorInfo } from 'react';
import { View, StyleSheet, DevSettings } from 'react-native';
import { Text, Button, Icon, Surface, useTheme } from 'react-native-paper';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundaryInner extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRestart = () => {
    if (__DEV__ && DevSettings?.reload) {
      DevSettings.reload();
    } else {
      // In production we can only ask the user to restart manually,
      // or use a native restart module if available.
      this.setState({ hasError: false, error: undefined });
    }
  };

  render() {
    if (this.state.hasError) {
      return <FallbackScreen error={this.state.error} onRestart={this.handleRestart} />;
    }
    return this.props.children;
  }
}

function FallbackScreen({ error, onRestart }: { error?: Error; onRestart: () => void }) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface
        style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
        elevation={2}>
        <View style={[styles.iconCircle, { backgroundColor: theme.colors.errorContainer }]}>
          <Icon source="alert-circle-outline" size={40} color={theme.colors.error} />
        </View>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
          Something went wrong
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          The app encountered an unexpected error. Please restart to continue.
        </Text>
        {__DEV__ && error && (
          <Text
            variant="bodySmall"
            style={[styles.errorText, { color: theme.colors.error }]}>
            {error.message}
          </Text>
        )}
        <Button
          mode="contained"
          onPress={onRestart}
          style={styles.button}
          contentStyle={styles.buttonContent}
          icon="refresh">
          Restart App
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    borderRadius: 10,
    width: '100%',
  },
  buttonContent: {
    paddingVertical: 6,
  },
});

export default function ErrorBoundary({ children }: Props) {
  return (
    <ErrorBoundaryInner>
      {children}
    </ErrorBoundaryInner>
  );
}
