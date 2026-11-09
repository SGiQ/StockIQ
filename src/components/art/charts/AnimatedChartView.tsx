import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { ChartMotion, ChartSpec } from '@/content/types';
import { easeOutCubic } from '@/lib/easing';
import { ChartView } from './index';
import type { ChartTheme } from './LineChart';

interface AnimatedChartViewProps {
  spec: ChartSpec;
  theme: ChartTheme;
  motion: ChartMotion;
  active: boolean;
}

/**
 * A reusable entrance over mathematically complete charts.
 *
 * The data is never interpolated or distorted: the correct chart is computed
 * first, then revealed in the order that teaches its reading — bars grow from
 * the axis one after another, a line draws from left to right with its points
 * landing behind it, candles print in sequence. The per-mark stagger lives in
 * the chart renderers (`progress` on ChartView); this component only supplies
 * the 0..1 timeline, which is a Reanimated timing mirrored to React a few
 * dozen times over the entrance and then left at 1. `focus` keeps its
 * whole-chart scale/opacity, since a payoff diagram is read as one shape.
 * `ReduceMotion.System` resolves straight to the completed state for
 * learners who disable motion at OS/browser level.
 */
export function AnimatedChartView({ spec, theme, motion, active }: AnimatedChartViewProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(active && !reduceMotion ? 0 : 1);
  const [shown, setShown] = useState(active && !reduceMotion ? 0 : 1);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      120,
      withTiming(1, {
        duration: motion === 'sequence' ? 1350 : 1050,
        easing: easeOutCubic,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [active, motion, progress, reduceMotion]);

  // Quantised to 48 steps: each step re-renders the SVG, so this caps the
  // entrance at ~48 renders however fast the display runs.
  const show = useCallback((p: number) => setShown(p), []);
  useAnimatedReaction(
    () => Math.round(progress.value * 48) / 48,
    (p, prev) => {
      if (p !== prev) runOnJS(show)(p);
    },
    [show],
  );

  const chartStyle = useAnimatedStyle(() => ({
    opacity: motion === 'focus' ? 0.35 + progress.value * 0.65 : 1,
    transform: motion === 'focus'
      ? [{ scale: 0.94 + progress.value * 0.06 }]
      : [{ scale: 1 }],
  }));

  // An inactive chart (the next card in the deck) sits complete but hidden
  // behind its neighbour; drawing it at progress 0 would blank it for the
  // frame it slides in on, so it renders finished until its entrance starts.
  const chartProgress = motion === 'focus' || !active ? 1 : shown;

  return (
    <View style={styles.root} pointerEvents="none" testID="animated-chart">
      <Animated.View style={[styles.chart, chartStyle]}>
        <ChartView spec={spec} theme={theme} progress={chartProgress} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', overflow: 'hidden' },
  chart: { flex: 1, width: '100%' },
});
