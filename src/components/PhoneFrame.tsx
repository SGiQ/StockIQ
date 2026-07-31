import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

/**
 * Constrains the web build to phone dimensions.
 *
 * StockIQ is a phone app. Run full-width in a desktop browser it stops being
 * a useful preview: the card deck stretches to 1400pt, line lengths triple,
 * and layout bugs that would be obvious at 390pt disappear. Worse, bugs that
 * only exist at desktop width — the deck misalignment found in Phase 5 —
 * waste time on a shape no user will ever see.
 *
 * So on web the app renders inside a 390x844 box (iPhone 14 logical points)
 * centred on the page. That is a preview device, not a responsive design:
 * everything inside still believes it is on a phone, because it is being
 * given a phone's dimensions.
 *
 * Below that width the frame gets out of the way entirely — a real phone
 * browser, or a narrow window, should just be the app.
 *
 * Native is untouched: this returns children directly, so nothing about the
 * iOS build changes.
 */

/** iPhone 14 logical points. Tall enough to show the tab bar and a full card. */
const FRAME_WIDTH = 390;
const FRAME_HEIGHT = 844;

export function PhoneFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();

  // Hooks must run unconditionally, so the platform check comes after them.
  if (Platform.OS !== 'web') return <>{children}</>;

  // On a narrow viewport the frame would be a border around nothing useful.
  if (width < FRAME_WIDTH + 40) return <>{children}</>;

  return (
    <View style={styles.page}>
      <View
        style={[
          styles.device,
          {
            width: FRAME_WIDTH,
            // Never taller than the window, or the tab bar sits below the
            // fold and the thing you most need to reach is unreachable.
            height: Math.min(FRAME_HEIGHT, height - 32),
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E8E6',
  },
  device: {
    // `overflow: hidden` is load-bearing: without it the deck's off-screen
    // cards render outside the frame and the illusion — and the layout —
    // both break.
    overflow: 'hidden',
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
  },
});
