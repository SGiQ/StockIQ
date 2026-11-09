import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { StickerRevealCard } from '@/content/types';
import type { CardUiState } from '@/components/player/cardState';
import { ArtView } from '@/components/art/ArtView';
import { RichTextView, Text } from '@/components/primitives';
import { easeOutCubic } from '@/lib/easing';
import { motion, radius, shadow, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

export interface StickerRevealCardViewProps {
  card: StickerRevealCard;
  state: CardUiState;
  onChange: (next: CardUiState) => void;
}

/**
 * Body text with labelled stickers that pop in one tap at a time.
 *
 * This is the card type that leans hardest on Imprint's hand-drawn
 * scrapbook charm, which we deliberately do not try to reproduce with
 * illustration. Instead the stickers are typographic — a bold label chip
 * over a flat glyph panel, tilted slightly. Used sparingly it reads as
 * deliberate design rather than as a missing illustrator.
 *
 * The tap that reveals is consumed by the player (see consumesTap), so it
 * never falls through to the forward tap zone.
 */
/**
 * A sticker is ~150pt tall, and anchors are fractions of the stage. With four
 * stickers spread evenly the same-side pairs land about 0.46 of the stage
 * apart, so a fixed 260pt stage puts them 62pt apart and they overlap — the
 * label of the upper one disappears behind the lower one. The stage therefore
 * has to grow with the count the schema allows (up to four) rather than
 * assuming the three that happened to be authored first.
 */
function stageHeight(count: number): number {
  return count >= 4 ? 350 : 260;
}

export function StickerRevealCardView({ card, state }: StickerRevealCardViewProps) {
  const colors = useColors();
  const revealed = state.kind === 'sticker' ? state.revealed : 0;

  return (
    <View style={styles.container} pointerEvents="none">
      <RichTextView value={card.body} variant="body" color={colors.inkSoft} />

      <View
        style={[styles.stage, { height: stageHeight(card.stickers.length) }]}
        pointerEvents="none"
      >
        {card.stickers.slice(0, revealed).map((sticker) => (
          <Sticker key={sticker.label} sticker={sticker} />
        ))}
      </View>

      {revealed < card.stickers.length && (
        <View style={styles.hint} pointerEvents="none">
          <Text variant="caption" color={colors.slateLight} align="center">
            Tap to reveal
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * One sticker, popping in on mount.
 *
 * The pop is decorative and the component is mounted by `revealed`, not by
 * the animation — but a sticker that animated from `scale: 0` and never
 * arrived would be invisible while still counting toward the advance gate,
 * so the spring is backed by a timeout that force-lands the final value.
 * Same reasoning as the deck's offset: the visible result must not depend on
 * an animation engine doing its job.
 */
function Sticker({ sticker }: { sticker: StickerRevealCard['stickers'][number] }) {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  // The label lands a beat after the panel, like a sticker's caption being
  // pressed on second.
  const label = useSharedValue(reduceMotion ? 1 : 0);
  const land = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    progress.value = withSpring(1, { ...motion.spring, damping: 13, reduceMotion: ReduceMotion.System });
    label.value = withDelay(140, withTiming(1, { duration: 240, easing: easeOutCubic, reduceMotion: ReduceMotion.System }));
    land.current = setTimeout(() => {
      progress.value = 1;
      label.value = 1;
    }, motion.normal + 240);
    return () => {
      if (land.current) clearTimeout(land.current);
    };
  }, [progress, label]);

  const rotation = sticker.rotation ?? 0;
  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.4),
    transform: [
      { translateX: -60 },
      { translateY: -52 },
      // Swings in from a few degrees past its resting tilt; the lighter
      // damping above lets the spring overshoot once and settle.
      { rotate: `${rotation + (1 - progress.value) * -10}deg` },
      { scale: 0.72 + progress.value * 0.28 },
    ],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: label.value,
    transform: [{ translateY: (1 - label.value) * 6 }],
  }));

  return (
    <Animated.View
      style={[
        styles.sticker,
        { backgroundColor: colors.paper },
        {
          left: `${sticker.anchor.x * 100}%`,
          top: `${sticker.anchor.y * 100}%`,
        },
        animated,
      ]}
    >
      <ArtView spec={sticker.art} aspectRatio={1} rounded glyphSize={44} style={styles.stickerArt} />
      <Animated.View style={[styles.stickerLabel, labelStyle]}>
        <Text variant="label" uppercase numberOfLines={2} align="center">
          {sticker.label}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: space.md,
    gap: space.lg,
  },
  stage: {
    // height is set per-card from stageHeight()
  },
  sticker: {
    position: 'absolute',
    width: 120,
    alignItems: 'center',
    borderRadius: radius.md,
    padding: space.sm,
    gap: space.xs,
    ...shadow.sticker,
  },
  stickerArt: {
    borderRadius: radius.sm,
  },
  stickerLabel: {
    paddingHorizontal: space.xxs,
  },
  hint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
