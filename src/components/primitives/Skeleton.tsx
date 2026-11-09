import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { radius as radii } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/** How long data may be pending before a skeleton appears. Under this, a fast load just renders. */
export const SKELETON_DELAY_MS = 150;
/** Skeleton → content cross-fade. */
export const SKELETON_FADE_MS = 150;

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A shimmer block standing in for text or a tile while its data is pending.
 *
 * Opacity pulse rather than a travelling gradient: it animates only opacity
 * (one composited layer, no layout, no per-frame paint of a gradient), which
 * is what keeps a dozen of them cheap inside the phone frame on web and on a
 * mid-range Android. Under reduced motion it holds a static tint.
 */
export function Skeleton({ width = '100%', height = 14, radius = radii.sm, style }: SkeletonProps) {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0.7;
      return;
    }
    pulse.value = 1;
    pulse.value = withRepeat(
      withTiming(0.45, { duration: 800, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      testID="skeleton"
      aria-hidden
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.hairline }, animated, style]}
    />
  );
}

/**
 * True once `pending` has been true for longer than the delay, false the
 * moment it clears. Stops a sub-150ms load flashing a skeleton for one frame.
 */
export function useDelayedPending(pending: boolean, delayMs: number = SKELETON_DELAY_MS): boolean {
  const [show, setShow] = useState(false);
  // Reset synchronously when a pending cycle ends, so the next one waits the
  // full delay again instead of inheriting the previous cycle's "show".
  const [prevPending, setPrevPending] = useState(pending);
  if (pending !== prevPending) {
    setPrevPending(pending);
    if (!pending) setShow(false);
  }
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(t);
  }, [pending, delayMs]);
  return pending && show;
}

export interface SkeletonSwapProps {
  /** Data is still loading. */
  pending: boolean;
  /** What to draw while pending (after the delay). Should match the content's layout. */
  skeleton: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders the skeleton while pending, then cross-fades to the content.
 *
 * Three phases: nothing for the first 150ms (fast loads never see a
 * skeleton), the skeleton in flow, then the content fading in while the
 * skeleton — now an absolute overlay so it takes no layout — fades out and
 * unmounts. If the content arrives before the skeleton ever showed, it simply
 * renders; there is nothing to fade from.
 */
export function SkeletonSwap({ pending, skeleton, children, style }: SkeletonSwapProps) {
  const reduceMotion = useReducedMotion();
  const showSkeleton = useDelayedPending(pending);
  const [fading, setFading] = useState(false);
  const contentOpacity = useSharedValue(1);
  const skeletonOpacity = useSharedValue(1);

  // Whether the skeleton was on screen when the content arrived — the only
  // case that needs a cross-fade. Tracked with the "adjust state during
  // render" pattern so the fade starts in the same render that first shows
  // the content, and overlay and content commit together: deferring this to
  // an effect left one frame with the content invisible and no skeleton.
  const [wasShowing, setWasShowing] = useState(false);
  const [prevShow, setPrevShow] = useState(showSkeleton);
  if (showSkeleton !== prevShow) {
    setPrevShow(showSkeleton);
    if (showSkeleton) setWasShowing(true);
  }
  const [prevPending, setPrevPending] = useState(pending);
  if (pending !== prevPending) {
    setPrevPending(pending);
    if (!pending && wasShowing) {
      setWasShowing(false);
      if (!reduceMotion) {
        contentOpacity.value = 0;
        skeletonOpacity.value = 1;
        setFading(true);
      }
    }
  }

  useEffect(() => {
    if (!fading) return;
    contentOpacity.value = withTiming(1, { duration: SKELETON_FADE_MS, reduceMotion: ReduceMotion.System });
    skeletonOpacity.value = withTiming(0, { duration: SKELETON_FADE_MS, reduceMotion: ReduceMotion.System });
    const hide = setTimeout(() => setFading(false), SKELETON_FADE_MS + 20);
    return () => clearTimeout(hide);
  }, [fading, contentOpacity, skeletonOpacity]);

  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: skeletonOpacity.value }));

  if (pending) {
    return <View style={style}>{showSkeleton ? skeleton : null}</View>;
  }

  return (
    <View style={style}>
      <Animated.View style={contentStyle}>{children}</Animated.View>
      {fading ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, overlayStyle]}>
          {skeleton}
        </Animated.View>
      ) : null}
    </View>
  );
}
