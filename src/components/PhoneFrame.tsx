import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { usePathname } from 'expo-router';
import { StageBackdrop } from '@/components/StageBackdrop';
import { useColors, useIsDark } from '@/theme/ThemeProvider';

/**
 * Constrains the web build to phone dimensions.
 *
 * StockiQ is a phone app. Run full-width in a desktop browser it stops being
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

/**
 * True on a real touchscreen.
 *
 * Width alone is the wrong test and shipped a visible bug: the guard was
 * `width < 430`, and an iPhone Plus / Pro Max reports exactly 430, so the
 * larger iPhones drew a phone inside a phone — letterboxed, with the app
 * inset behind a drop shadow. Bumping the number just moves the seam to the
 * next handset.
 *
 * Pointer type asks the question actually being asked: is this a preview on
 * a desktop, or is it the device? Evaluated once because a device's primary
 * input does not change mid-session, and guarded for `window` because the
 * web build is statically exported.
 */
const IS_TOUCH_DEVICE =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

export function PhoneFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const pathname = usePathname();
  const colors = useColors();
  const isDark = useIsDark();

  // Hooks must run unconditionally, so the platform check comes after them.
  if (Platform.OS !== 'web') return <>{children}</>;

  // The public landing route is a responsive website, not a phone preview.
  if (pathname === '/landing') return <>{children}</>;

  // A real phone browser is not a preview — it is the thing being previewed.
  if (IS_TOUCH_DEVICE) return <>{children}</>;

  // On a narrow desktop window the frame would be a border around nothing.
  if (width < FRAME_WIDTH + 40) return <>{children}</>;

  return (
    <View style={[styles.page, { backgroundColor: isDark ? '#1A1A1A' : '#E8E8E6' }]}>
      {/* Painted behind the frame; the frame, its shadow and everything inside are unchanged. */}
      <StageBackdrop />
      <View
        style={[
          styles.device,
          {
            width: FRAME_WIDTH,
            height: Math.min(FRAME_HEIGHT, height - 32),
            backgroundColor: colors.paperWarm,
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
  },
  device: {
    overflow: 'hidden',
    borderRadius: 44,
    boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
  },
});
