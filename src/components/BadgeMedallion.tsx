import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Glyph } from '@/components/art/Glyph';
import { Text } from '@/components/primitives';
import type { BadgeDef, BadgeTier } from '@/features/achievements';
import { easeOutCubic, easeOutQuad } from '@/lib/easing';
import { artPalettes, palette, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/** Tier → accent, reusing the dashboard's existing accent palette. */
const TIER_COLOR: Record<BadgeTier, string> = {
  bronze: palette.azure,
  silver: palette.violet,
  gold: palette.flame,
};

/** The ring that pulses out of a freshly earned badge. */
const RING_GOLD = artPalettes.butter.accent;

/**
 * One badge disc. Earned badges glow in their tier colour; locked ones are
 * greyed so the shelf reads as a goal board — you can see what's left to earn,
 * which is most of why an achievement wall works.
 *
 * `celebrate` marks a badge earned just now: the disc pops once (0.6 → 1.05
 * → 1) with a gold ring pulsing out. It plays once per mount, never on a
 * re-render and never for a badge that was already earned, and not at all
 * under reduced motion.
 */
export function BadgeMedallion({
  badge,
  earned,
  size = 60,
  showLabel = false,
  celebrate = false,
}: {
  badge: BadgeDef;
  earned: boolean;
  size?: number;
  showLabel?: boolean;
  celebrate?: boolean;
}) {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const color = TIER_COLOR[badge.tier];
  const willPop = celebrate && earned && !reduceMotion;
  const played = useRef(false);
  const scale = useSharedValue(willPop ? 0.6 : 1);
  const ring = useSharedValue(willPop ? 0 : 1);

  useEffect(() => {
    if (!willPop || played.current) return;
    played.current = true;
    scale.value = withSequence(
      withTiming(1.05, { duration: 280, easing: easeOutCubic, reduceMotion: ReduceMotion.System }),
      withTiming(1, { duration: 160, easing: easeOutQuad, reduceMotion: ReduceMotion.System }),
    );
    ring.value = withTiming(1, { duration: 640, easing: easeOutQuad, reduceMotion: ReduceMotion.System });
  }, [willPop, scale, ring]);

  const discStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.85 * (1 - ring.value),
    transform: [{ scale: 1 + ring.value * 0.5 }],
  }));

  return (
    <View style={[styles.wrap, { width: showLabel ? size + 28 : size }]}>
      <View style={{ width: size, height: size }}>
        {willPop ? (
          <Animated.View
            aria-hidden
            pointerEvents="none"
            style={[styles.ring, { borderRadius: size / 2, borderColor: RING_GOLD }, ringStyle]}
          />
        ) : null}
        <Animated.View
          style={[
            styles.disc,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: earned ? color : colors.hairline,
            },
            !earned && styles.locked,
            discStyle,
          ]}
        >
          <Glyph
            name={badge.glyph}
            size={size * 0.5}
            color={earned ? colors.paper : colors.slateLight}
            strokeWidth={2}
          />
        </Animated.View>
      </View>
      {showLabel ? (
        <Text
          variant="caption"
          color={earned ? colors.ink : colors.slateLight}
          align="center"
          numberOfLines={2}
        >
          {badge.name}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.xs },
  disc: { alignItems: 'center', justifyContent: 'center' },
  ring: { ...StyleSheet.absoluteFill, borderWidth: 3 },
  locked: { opacity: 0.55 },
});
