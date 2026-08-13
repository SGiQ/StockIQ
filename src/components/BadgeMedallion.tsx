import { View, StyleSheet } from 'react-native';
import { Glyph } from '@/components/art/Glyph';
import { Text } from '@/components/primitives';
import type { BadgeDef, BadgeTier } from '@/features/achievements';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/** Tier → accent, reusing the dashboard's existing accent palette. */
const TIER_COLOR: Record<BadgeTier, string> = {
  bronze: palette.azure,
  silver: palette.violet,
  gold: palette.flame,
};

/**
 * One badge disc. Earned badges glow in their tier colour; locked ones are
 * greyed so the shelf reads as a goal board — you can see what's left to earn,
 * which is most of why an achievement wall works.
 */
export function BadgeMedallion({
  badge,
  earned,
  size = 60,
  showLabel = false,
}: {
  badge: BadgeDef;
  earned: boolean;
  size?: number;
  showLabel?: boolean;
}) {
  const colors = useColors();
  const color = TIER_COLOR[badge.tier];

  return (
    <View style={[styles.wrap, { width: showLabel ? size + 28 : size }]}>
      <View
        style={[
          styles.disc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: earned ? color : colors.hairline,
          },
          !earned && styles.locked,
        ]}
      >
        <Glyph
          name={badge.glyph}
          size={size * 0.5}
          color={earned ? colors.paper : colors.slateLight}
          strokeWidth={2}
        />
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
  locked: { opacity: 0.55 },
});
