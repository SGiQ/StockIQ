import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { ChartMotion, ChartSpec } from '@/content/types';
import { ChartView } from './index';
import type { ChartTheme } from './LineChart';
import { useNarrationSync } from './narrationSync';

interface AnimatedChartViewProps {
  spec: ChartSpec;
  theme: ChartTheme;
  motion: ChartMotion;
  active: boolean;
}

/**
 * A reusable reveal layer over mathematically complete chart SVGs.
 *
 * The data is never interpolated or distorted: the correct chart is rendered
 * first, then uncovered in the direction that teaches its reading order.
 * `ReduceMotion.System` resolves straight to the completed state for learners
 * who disable motion at OS/browser level.
 */
export function AnimatedChartView({ spec, theme, motion, active }: AnimatedChartViewProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(active && !reduceMotion ? 0 : 1);
  const { enabled: narrationEnabled, sync } = useNarrationSync();
  // Once a clip has driven this chart, it "owns" the reveal for the card, so a
  // pause or the clip ending completes rather than snapping back to a timer.
  const narratedRef = useRef(false);

  useEffect(() => {
    if (!active) narratedRef.current = false;
  }, [active]);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    // Narration is playing: reveal in lock-step with the voice.
    if (sync >= 0) {
      narratedRef.current = true;
      progress.value = withTiming(sync, { duration: 260, easing: Easing.linear });
      return;
    }
    // The clip paused or finished — settle on the complete chart.
    if (narratedRef.current) {
      progress.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      return;
    }
    // Narration is on but this card's clip has not begun yet: stay hidden so it
    // can build with the voice rather than pre-revealing on a timer.
    if (narrationEnabled) {
      progress.value = 0;
      return;
    }
    // No narration — the original timed reveal.
    progress.value = 0;
    progress.value = withDelay(
      120,
      withTiming(1, {
        duration: motion === 'sequence' ? 1350 : 1050,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [active, sync, narrationEnabled, motion, progress, reduceMotion]);

  const chartStyle = useAnimatedStyle(() => ({
    opacity: motion === 'focus' ? 0.35 + progress.value * 0.65 : 1,
    transform: motion === 'focus'
      ? [{ scale: 0.94 + progress.value * 0.06 }]
      : [{ scale: 1 }],
  }));

  const maskStyle = useAnimatedStyle(() => {
    if (motion === 'build') {
      return {
        transformOrigin: 'top',
        transform: [{ scaleY: 1 - progress.value }],
      };
    }
    return {
      transformOrigin: 'right',
      transform: [{ scaleX: 1 - progress.value }],
    };
  });

  return (
    <View style={styles.root} pointerEvents="none" testID="animated-chart">
      <Animated.View style={[styles.chart, chartStyle]}>
        <ChartView spec={spec} theme={theme} />
      </Animated.View>
      {motion === 'focus' ? null : (
        <Animated.View
          testID="chart-motion-mask"
          style={[styles.mask, { backgroundColor: theme.bg }, maskStyle]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', overflow: 'hidden' },
  chart: { flex: 1, width: '100%' },
  mask: { ...StyleSheet.absoluteFill },
});
