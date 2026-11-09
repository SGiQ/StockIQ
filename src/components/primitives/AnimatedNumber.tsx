import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReduceMotion,
  runOnJS,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { easeOutCubic } from '@/lib/easing';
import { formatPrice } from '@/services/market/format';
import { Text, type TextProps } from './Text';

export interface AnimatedNumberProps extends Omit<TextProps, 'children'> {
  value: number;
  /** Display formatting. Defaults to the shared price formatter ("$1,234.56"). */
  format?: (n: number) => string;
  /** Tween length when the value changes. */
  durationMs?: number;
}

/**
 * A number that counts from its previous value to the new one.
 *
 * The tween runs as a Reanimated shared value; each UI frame the value is
 * rounded to cents and, only when that changed, handed back to JS to format
 * and render. Formatting stays on the JS side so `toLocaleString` (not
 * available in the worklet runtime on every platform) is never called from a
 * worklet. The first render shows the value as-is — there is nothing to count
 * from — and under reduced motion every change is an instant swap.
 */
export function AnimatedNumber({
  value,
  format = formatPrice,
  durationMs = 650,
  ...textProps
}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(value);
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  /** The interval the current tween moves through; frames outside it are clamped. */
  const bounds = useRef<[number, number]>([value, value]);

  useEffect(() => {
    if (prev.current === value) return;
    bounds.current = [Math.min(prev.current, value), Math.max(prev.current, value)];
    prev.current = value;
    if (reduceMotion || !Number.isFinite(value)) {
      progress.value = value;
      setShown(value);
      return;
    }
    progress.value = withTiming(value, {
      duration: durationMs,
      easing: easeOutCubic,
      reduceMotion: ReduceMotion.System,
    });
  }, [value, durationMs, reduceMotion, progress]);

  const show = useCallback((n: number) => {
    const [lo, hi] = bounds.current;
    setShown(n < lo ? lo : n > hi ? hi : n);
  }, []);

  useAnimatedReaction(
    () => Math.round(progress.value * 100),
    (cents, previousCents) => {
      if (cents !== previousCents) runOnJS(show)(cents / 100);
    },
    [show],
  );

  return <Text {...textProps}>{format(shown)}</Text>;
}
