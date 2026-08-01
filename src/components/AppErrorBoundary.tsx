import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { trackTelemetry } from '@/services/telemetry';
import { Text } from '@/components/primitives';
import { palette, radius, space } from '@/theme/tokens';

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    void trackTelemetry('client_error', undefined, error.name.slice(0, 40));
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.screen} accessibilityRole="alert">
        <Text variant="h2" color={palette.ink} align="center">Something went wrong.</Text>
        <Text variant="body" color={palette.slate} align="center">
          Your progress is saved. Try loading this screen again.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={() => this.setState({ failed: false })}
          style={styles.button}
        >
          <Text variant="button" color={palette.paper}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    backgroundColor: palette.paperWarm,
  },
  button: {
    minHeight: 56,
    minWidth: 180,
    borderRadius: radius.pill,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.md,
  },
});
