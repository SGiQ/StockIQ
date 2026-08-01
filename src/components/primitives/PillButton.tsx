import { useCallback } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as haptics from '@/lib/haptics';
import { Text } from './Text';
import { motion, palette, radius, shadow, space } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PillVariant =
  /** Filled violet — the primary answer option. */
  | 'primary'
  /** Tinted violet — the secondary answer option. */
  | 'secondary'
  /** Black — "Check Answer" and "Continue". */
  | 'dark'
  /** White on a coloured surface — "Continue" during onboarding. */
  | 'light'
  /** Transparent with a hairline border. */
  | 'ghost';

export interface PillButtonProps {
  label: string;
  onPress?: () => void;
  variant?: PillVariant;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const SURFACES: Record<PillVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: palette.violet, fg: palette.paper },
  secondary: { bg: palette.violetSoft, fg: palette.violetInk },
  dark: { bg: palette.ink, fg: palette.paper },
  light: { bg: palette.paper, fg: palette.ink },
  ghost: { bg: 'transparent', fg: palette.ink, border: palette.hairline },
};

/**
 * The heavy rounded pill that carries every action in the app. Press state
 * is a spring scale rather than opacity — it reads as physical, which is
 * most of what makes Imprint's buttons feel good.
 */
export function PillButton({
  label,
  onPress,
  variant = 'dark',
  disabled = false,
  fullWidth = true,
  haptic = true,
  style,
  testID,
}: PillButtonProps) {
  const pressed = useSharedValue(0);
  const surface = SURFACES[variant];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.03 }],
  }));

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (haptic) haptics.tap();
    onPress?.();
  }, [disabled, haptic, onPress]);

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => {
        pressed.value = withSpring(1, motion.spring);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, motion.spring);
      }}
      onPress={handlePress}
      style={[
        styles.base,
        {
          backgroundColor: surface.bg,
          borderColor: surface.border ?? 'transparent',
          borderWidth: surface.border ? 1 : 0,
          alignSelf: fullWidth ? 'stretch' : 'center',
          opacity: disabled ? 0.45 : 1,
        },
        animatedStyle,
        style,
      ]}
    >
      <View pointerEvents="none">
        <Text variant="button" color={surface.fg} align="center">
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    ...shadow.card,
  },
});
