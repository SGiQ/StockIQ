import { useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { motion } from '@/theme/tokens';

export interface SpringFillProps {
  /** 0..100. */
  pct: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A progress-bar fill that springs between values without ever being wrong.
 *
 * The fill's real width is a plain percentage, set directly from props — the
 * state the learner relies on. The spring is layered on top as a transform:
 * when `pct` grows the fill is first scaled back to its previous width
 * (scaleX = old / new, origin left) and springs to 1. If the animation engine
 * ever fails to drive, the transform simply stays at identity and the bar
 * reads correctly — which is the failure the player's bar once had when its
 * width itself was animated, and why this shape exists.
 */
export function SpringFill({ pct, color, style }: SpringFillProps) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, pct));
  const prev = useRef(clamped);
  const scale = useSharedValue(1);

  useEffect(() => {
    const from = prev.current;
    prev.current = clamped;
    if (reduceMotion || clamped <= 0 || from === clamped) {
      scale.value = 1;
      return;
    }
    scale.value = Math.max(0.02, Math.min(1.5, from / clamped));
    scale.value = withSpring(1, { ...motion.spring, reduceMotion: ReduceMotion.System });
  }, [clamped, reduceMotion, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scaleX: scale.value }] }));

  return (
    <View style={[{ width: `${clamped}%`, height: '100%' }, style]}>
      <Animated.View style={[{ flex: 1, backgroundColor: color, borderRadius: 999, transformOrigin: 'left' }, animated]} />
    </View>
  );
}
