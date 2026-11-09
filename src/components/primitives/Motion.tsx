import { useEffect, useRef, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { easeOutQuad, linearClamped } from '@/lib/easing';

/**
 * Small reusable motion wrappers. Each animates transform or opacity only and
 * does nothing under reduced motion.
 */

export interface BumpProps {
  children: ReactNode;
  /** Plays a bump whenever this changes (never on mount). */
  value: unknown;
  /** Only bump when this is true at the time of the change. Default: always. */
  playWhen?: boolean;
  /** Peak scale. */
  peak?: number;
  style?: StyleProp<ViewStyle>;
}

/** Scales up and settles once when `value` changes — a counter, a selected option, a focused tab. */
export function Bump({ children, value, playWhen = true, peak = 1.18, style }: BumpProps) {
  const reduceMotion = useReducedMotion();
  const prev = useRef(value);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    if (!playWhen || reduceMotion) return;
    scale.value = withSequence(
      withTiming(peak, { duration: 140, easing: easeOutQuad, reduceMotion: ReduceMotion.System }),
      withTiming(1, { duration: 220, easing: easeOutQuad, reduceMotion: ReduceMotion.System }),
    );
  }, [value, playWhen, peak, reduceMotion, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

export interface FloatProps {
  children: ReactNode;
  /** Vertical travel in points, each way. */
  amplitude?: number;
  periodMs?: number;
  style?: StyleProp<ViewStyle>;
}

/** A slow vertical bob for an idle illustration, such as an empty-state badge. */
export function Float({ children, amplitude = 4, periodMs = 2800, style }: FloatProps) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      t.value = 0;
      return;
    }
    t.value = withRepeat(
      withTiming(1, { duration: periodMs, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.System }),
      -1,
      true,
    );
    return () => cancelAnimation(t);
  }, [t, reduceMotion, periodMs]);

  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: (t.value - 0.5) * 2 * amplitude }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

export interface SpinProps {
  children: ReactNode;
  /** Spins while true; eases to rest when false. */
  spinning: boolean;
  periodMs?: number;
  style?: StyleProp<ViewStyle>;
}

/** Rotates its child continuously while `spinning` — a refresh glyph during a load. */
export function Spin({ children, spinning, periodMs = 900, style }: SpinProps) {
  const reduceMotion = useReducedMotion();
  const turns = useSharedValue(0);

  useEffect(() => {
    if (!spinning || reduceMotion) {
      cancelAnimation(turns);
      turns.value = withTiming(Math.ceil(turns.value), { duration: 200, easing: easeOutQuad, reduceMotion: ReduceMotion.System });
      return;
    }
    turns.value = withRepeat(
      withTiming(turns.value + 1, { duration: periodMs, easing: linearClamped, reduceMotion: ReduceMotion.System }),
      -1,
      false,
    );
    return () => cancelAnimation(turns);
  }, [spinning, reduceMotion, periodMs, turns]);

  const animated = useAnimatedStyle(() => ({ transform: [{ rotate: `${(turns.value % 1) * 360}deg` }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

export interface BreatheProps {
  /** Opacity range the layer breathes between. */
  from?: number;
  to?: number;
  periodMs?: number;
  style?: StyleProp<ViewStyle>;
}

/** A tinted layer whose opacity breathes slowly — marks a zone without shouting. */
export function Breathe({ from = 0.05, to = 0.12, periodMs = 2600, style }: BreatheProps) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      t.value = 0.5;
      return;
    }
    t.value = withRepeat(
      withTiming(1, { duration: periodMs, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.System }),
      -1,
      true,
    );
    return () => cancelAnimation(t);
  }, [t, reduceMotion, periodMs]);

  const animated = useAnimatedStyle(() => ({ opacity: from + (to - from) * t.value }));
  return <Animated.View pointerEvents="none" aria-hidden style={[style, animated]} />;
}
