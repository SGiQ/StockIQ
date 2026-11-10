import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { ConceptCard } from '@/content/types';
import { ArtView } from '@/components/art/ArtView';
import { RichTextView, Text } from '@/components/primitives';
import { CardScroll } from './CardScroll';
import { artPalettes, radius, space } from '@/theme/tokens';
import { useColors, useIsDark } from '@/theme/ThemeProvider';

/**
 * The workhorse card: a short headline, a short body, optional art.
 *
 * Nothing here is interactive, so the whole surface stays transparent to
 * touches and the tap zones underneath handle navigation.
 */
export function ConceptCardView({ card, active = true }: { card: ConceptCard; active?: boolean }) {
  const colors = useColors();
  const isDark = useIsDark();
  const windowHeight = useWindowDimensions().height;
  // Wholly inert: "none" rather than "box-none" so taps fall through to the
  // navigation zones underneath. box-none would leave the text subtree as a
  // hit target on web and silently swallow every forward tap.
  return (
    <CardScroll inert>
    <View style={styles.container} pointerEvents="none">
      {/* A pale green wash, drawn as a layer behind the content and inset
          outward so the text and art keep exactly the geometry they had. */}
      <View
        style={[
          styles.wash,
          { backgroundColor: isDark ? colors.successSoft + '59' : artPalettes.mint.bg + 'B3' },
        ]}
      />
      <RichTextView value={card.headline} variant="h1" color={colors.ink} />

      {card.art && (
        <View style={[styles.art, { maxHeight: Math.round(windowHeight * ART_SHARE) }]}>
          <ArtView spec={card.art} aspectRatio={4 / 3} glyphSize={72} active={active} />
        </View>
      )}

      <RichTextView value={card.body} variant="body" color={colors.inkSoft} style={styles.body} />
    </View>
    </CardScroll>
  );
}

/**
 * The most of the window the art may take. A share of the *window* rather
 * than of the card: inside CardScroll the card is as tall as its content, so
 * a percentage of it would no longer cap anything. ~35% of the window is the
 * 48% of the stage it used to be on a native phone, and keeps the art
 * shrinking first on a short phone browser so the card still fits without
 * having to scroll.
 */
const ART_SHARE = 0.35;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: space.xs,
    gap: space.sm,
  },
  wash: {
    ...StyleSheet.absoluteFill,
    margin: -space.md,
    borderRadius: radius.lg,
  },
  /**
   * Shrinks before the text does.
   *
   * The card is centred and clipped, so content taller than the box loses
   * equal slices off the TOP and bottom — a long card silently ate the first
   * line of its own headline, which reads as a rendering fault rather than an
   * overflow. Text cannot shrink and is the content, so the art gives way
   * first: capped at a share of the card and allowed to compress further when
   * a headline wraps to three lines.
   *
   * CardScroll is the backstop for a body that is still too long once the
   * art has given all it can; shrinking stays the first resort because a
   * card that fits reads better than one that scrolls.
   */
  art: {
    marginVertical: 0,
    flexShrink: 1,
    /**
     * Load-bearing. `ArtView` sizes itself from an aspectRatio, so when this
     * box shrinks the art inside keeps its full height and bleeds out the
     * bottom — the body text then renders on top of the panel. Clipping is
     * invisible here because the glyph is centred, so the only thing lost is
     * empty panel.
     */
    overflow: 'hidden',
    borderRadius: radius.lg,
  },
  body: {
    marginTop: -space.xs,
  },
});

export { Text };
