import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from '@/components/primitives';
import { palette, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/**
 * The invisible navigation zones: left third goes back, right two-thirds
 * goes forward. Reproduced from the tutorial card in the Imprint
 * screenshots, including the asymmetric split — forward is the common
 * action, so it gets the larger target.
 *
 * These render *beneath* the card deck. The deck is `box-none`, so taps on
 * inert card content fall through to here while taps on real buttons are
 * caught by the buttons. Getting that layering right is what stops the
 * navigation and the answer options from fighting each other.
 */
export function TapZones({ onBack, onForward }: { onBack: () => void; onForward: () => void }) {
  // These zones are deliberately invisible and already exposed to assistive
  // tech by name. A desktop click focusing one used to draw the browser's
  // giant orange focus rectangle over one or two thirds of the lesson.
  const invisibleFocusStyle = Platform.OS === 'web'
    ? ({
        outlineStyle: 'solid',
        outlineWidth: 0,
        outlineColor: 'transparent',
      } satisfies ViewStyle)
    : undefined;
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.row}>
        <Pressable
          style={[styles.back, invisibleFocusStyle]}
          focusable={false}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Previous card"
        />
        <Pressable
          style={[styles.forward, invisibleFocusStyle]}
          focusable={false}
          onPress={onForward}
          accessibilityRole="button"
          accessibilityLabel="Next card"
        />
      </View>
    </View>
  );
}

/**
 * The one-time overlay teaching the tap zones, shown on the first lesson.
 *
 * It covers the card completely rather than sitting over it — in Imprint
 * this is its own blank screen, and half-showing the lesson underneath just
 * produced unreadable overlapping text.
 */
export function TapZoneTutorial() {
  const colors = useColors();
  return (
    <View style={[StyleSheet.absoluteFill, styles.tutorial, { backgroundColor: colors.paper }]} pointerEvents="none">
      <View style={styles.tutorialBack}>
        <Text variant="h3" color={colors.inkSoft} align="center">
          {'tap here\nto go\nback'}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.tutorialForward}>
        <Text variant="h2" align="center">
          {'tap here\nto go\nforward'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  back: {
    flex: 1,
  },
  forward: {
    flex: 2,
  },
  tutorial: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tutorialBack: {
    flex: 1,
    paddingHorizontal: space.sm,
  },
  tutorialForward: {
    flex: 2,
    paddingHorizontal: space.md,
  },
  divider: {
    position: 'absolute',
    left: '33.333%',
    top: '12%',
    bottom: '12%',
    width: 2,
    backgroundColor: palette.mint,
  },
});
