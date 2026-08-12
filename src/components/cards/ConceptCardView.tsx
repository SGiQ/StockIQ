import { StyleSheet, View } from 'react-native';
import type { ConceptCard } from '@/content/types';
import { ArtView } from '@/components/art/ArtView';
import { RichTextView, Text } from '@/components/primitives';
import { palette, radius, space } from '@/theme/tokens';

/**
 * The workhorse card: a short headline, a short body, optional art.
 *
 * Nothing here is interactive, so the whole surface stays transparent to
 * touches and the tap zones underneath handle navigation.
 */
export function ConceptCardView({ card, active = true }: { card: ConceptCard; active?: boolean }) {
  // Wholly inert: "none" rather than "box-none" so taps fall through to the
  // navigation zones underneath. box-none would leave the text subtree as a
  // hit target on web and silently swallow every forward tap.
  return (
    <View style={styles.container} pointerEvents="none">
      <RichTextView value={card.headline} variant="h1" color={palette.ink} />

      {card.art && (
        <View style={styles.art}>
          <ArtView spec={card.art} aspectRatio={1.35} glyphSize={72} active={active} />
        </View>
      )}

      <RichTextView value={card.body} variant="body" color={palette.inkSoft} style={styles.body} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: space.xs,
    gap: space.sm,
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
   * Scrolling would be the other fix and is wrong here: the card is
   * deliberately inert (`pointerEvents="none"`) so taps reach the navigation
   * zones underneath, and a ScrollView would have to capture those touches.
   */
  art: {
    marginVertical: 0,
    flexShrink: 1,
    maxHeight: '38%',
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
