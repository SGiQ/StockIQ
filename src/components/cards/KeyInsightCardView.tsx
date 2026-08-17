import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { KeyInsightCard } from '@/content/types';
import { ArtView } from '@/components/art/ArtView';
import { Text } from '@/components/primitives';
import { lessonArtRatios } from '@/content/index.generated';
import { palette, radius, shadow, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

// Illustrations arrive in a handful of ratios (square, 4:3 landscape, 3:4
// portrait). Framing the poster art at the source's true ratio avoids the
// cover-crop that used to slice a third of the width off every landscape hero.
function artAspectFor(card: KeyInsightCard): number {
  if (card.art.kind === 'illustration') {
    return lessonArtRatios[card.art.source] ?? 1;
  }
  return 1;
}

/**
 * The shareable poster.
 *
 * Predictable geometry — a fixed art panel above a black text panel — is what
 * makes these exportable as images later without a bespoke layout per card,
 * and it is why the schema keeps `insight` as plain text rather than
 * RichText. The art panel takes its aspect from the source illustration so
 * landscape heroes aren't cover-cropped down to their centre band, but the
 * text panel keeps its layout regardless.
 *
 * Extracted from the card view so the Saved Cards gallery (Phase 2) can
 * render the identical poster outside the player.
 */
export function KeyInsightPoster({
  card,
  style,
  compact = false,
  active = true,
}: {
  card: KeyInsightCard;
  style?: ViewStyle;
  /**
   * Grid-thumbnail sizing. Without it the insight renders at full body size
   * inside a half-width tile and the poster grows to several screens tall.
   */
  compact?: boolean;
  active?: boolean;
}) {
  const colors = useColors();
  const framed = card.frame === 'gradient';

  /**
   * The gradient frame is a border, so it is drawn as a padded backdrop with
   * the poster sitting on top — not as a background behind a transparent
   * poster, which would tint the black panel. It is also a plain style rather
   * than an animation: this poster is what `react-native-view-shot` captures
   * for sharing, and a capture must never race a running animation.
   */
  const body = (
    <View style={[styles.poster, { backgroundColor: colors.ink }]}>
        <ArtView
          spec={card.art}
          aspectRatio={artAspectFor(card)}
          rounded={false}
          glyphSize={compact ? 44 : 96}
          active={active}
        />

        <View style={compact ? styles.textCompact : styles.text}>
          <Text
            variant={compact ? 'caption' : 'insight'}
            color={colors.paper}
            align="center"
            numberOfLines={compact ? 4 : undefined}
            style={compact ? styles.insightCompact : undefined}
          >
            {card.insight}
          </Text>

          {card.attribution && !compact && (
            <View style={styles.attribution}>
              <Text variant="label" color={colors.slateLight} align="center" uppercase>
                {card.attribution.source}
              </Text>
              {card.attribution.detail && (
                <Text variant="caption" color={colors.slate} align="center">
                  {card.attribution.detail}
                </Text>
              )}
            </View>
          )}
        </View>
    </View>
  );

  if (!framed) return <View style={[styles.frame, style]}>{body}</View>;

  return (
    <LinearGradient
      colors={[palette.askFrom, palette.askTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.frame, styles.frameGradient, style]}
    >
      {body}
    </LinearGradient>
  );
}

export function KeyInsightCardView({ card, active = true }: { card: KeyInsightCard; active?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.container} pointerEvents="none">
      <Text variant="label" color={colors.slate} uppercase align="center">
        Key Insight
      </Text>
      <KeyInsightPoster card={card} active={active} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: space.md,
    gap: space.md,
  },
  frame: {
    borderRadius: radius.card,
    ...shadow.floating,
  },
  frameGradient: {
    padding: 3,
  },
  poster: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  text: {
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
    gap: space.md,
  },
  textCompact: {
    paddingHorizontal: space.sm,
    paddingVertical: space.md,
    minHeight: 92,
    justifyContent: 'center',
  },
  insightCompact: {
    fontStyle: 'italic',
  },
  attribution: {
    gap: space.xxs,
  },
});
