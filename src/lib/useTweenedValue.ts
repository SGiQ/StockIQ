import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReduceMotion,
  runOnJS,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { easeOutCubic } from './easing';
import { motion } from '@/theme/tokens';

export interface TweenOptions {
  /** Spring (default) or a fixed-length ease-out. */
  kind?: 'spring' | 'timing';
  /** Timing only. */
  durationMs?: number;
  /** Wait before the tween starts. */
  delayMs?: number;
  /** Start here on mount and tween to the first `target`; default is to start at `target`. */
  from?: number;
  /** Digits the returned value is rounded to before it reaches React. */
  precision?: number;
}

/**
 * A number that follows `target` through a Reanimated spring or timing, as a
 * plain React value.
 *
 * For the few places that must animate an SVG attribute (an arc's dash
 * array, a path's dash offset) rather than a transform or opacity: the shared
 * value runs on the UI thread, and only a quantised copy is handed back to
 * React, so the component re-renders a few dozen times over the tween and
 * then stops. Under reduced motion the value snaps.
 */
export function useTweenedValue(target: number, opts: TweenOptions = {}): number {
  const { kind = 'spring', durationMs = 600, delayMs = 0, from, precision = 2 } = opts;
  const reduceMotion = useReducedMotion();
  const start = from ?? target;
  const sv = useSharedValue(start);
  const [shown, setShown] = useState(start);
  const last = useRef<number | null>(null);
  const scale = 10 ** precision;

  useEffect(() => {
    if (last.current === target) return;
    const first = last.current === null;
    last.current = target;
    if (reduceMotion || !Number.isFinite(target) || (first && from === undefined)) {
      // Snap. The reaction below delivers the new value to React.
      sv.value = target;
      return;
    }
    const anim =
      kind === 'spring'
        ? withSpring(target, { ...motion.spring, reduceMotion: ReduceMotion.System })
        : withTiming(target, { duration: durationMs, easing: easeOutCubic, reduceMotion: ReduceMotion.System });
    sv.value = delayMs > 0 ? withDelay(delayMs, anim) : anim;
  }, [target, kind, durationMs, delayMs, from, reduceMotion, sv]);

  const show = useCallback((n: number) => setShown(n), []);

  useAnimatedReaction(
    () => Math.round(sv.value * scale),
    (q, prevQ) => {
      if (q !== prevQ) runOnJS(show)(q / scale);
    },
    [scale, show],
  );

  return shown;
}
