import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { easeOutCubic } from '@/lib/easing';

export interface FadeUpProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: ViewProps['pointerEvents'];
  /** Wait before the entrance starts. */
  delayMs?: number;
  /** How far the block rises, in points. */
  distance?: number;
  durationMs?: number;
}

/**
 * Mount entrance for a block that appears in response to the learner: an
 * explanation after Check Answer, the out-of-hearts gate. Rises a little and
 * fades in, transform and opacity only, over about a quarter second; under
 * reduced motion it is simply there. Plays once per mount — key the block if
 * it must replay.
 */
export function FadeUp({ children, style, pointerEvents, delayMs = 0, distance = 14, durationMs = 260 }: FadeUpProps) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      t.value = 1;
      return;
    }
    const tween = withTiming(1, { duration: durationMs, easing: easeOutCubic, reduceMotion: ReduceMotion.System });
    t.value = delayMs > 0 ? withDelay(delayMs, tween) : tween;
  }, [t, reduceMotion, delayMs, durationMs]);

  const animated = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * distance }],
  }));

  return (
    <Animated.View style={[style, animated]} pointerEvents={pointerEvents}>
      {children}
    </Animated.View>
  );
}
