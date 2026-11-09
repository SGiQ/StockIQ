import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { motion, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

export interface OnboardingProgressProps {
  /** 1-based position of the current step. */
  step: number;
  /** Total steps in the flow. */
  total: number;
}

/**
 * The step tracker across the onboarding flow.
 *
 * Filled segments up to `step`, hollow after — so a new learner can see the
 * flow is short and finite, which is most of why a four-step form does not feel
 * like a wall. Lives on the forest background, so the fill is paper and the rest
 * a faint tint of it.
 */
export function OnboardingProgress({ step, total }: OnboardingProgressProps) {
  const colors = useColors();
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: step }}
      accessibilityLabel={`Step ${step} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <Segment key={i} filled={i < step} fresh={i === step - 1} color={colors.paper} />
      ))}
    </View>
  );
}

/** The segment for the current step springs in from the left when the step mounts. */
function Segment({ filled, fresh, color }: { filled: boolean; fresh: boolean; color: string }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(fresh && !reduceMotion ? 0.15 : 1);
  useEffect(() => {
    if (!fresh || reduceMotion) return;
    scale.value = withSpring(1, { ...motion.spring, reduceMotion: ReduceMotion.System });
  }, [fresh, reduceMotion, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scaleX: scale.value }] }));
  if (!filled) return <View style={[styles.segment, styles.off]} />;
  return <Animated.View style={[styles.segment, { backgroundColor: color, transformOrigin: 'left' }, animated]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.xs,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: radius.pill,
  },
  off: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
