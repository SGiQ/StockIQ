import { StyleSheet, View } from 'react-native';
import type { ConceptCard } from '@/content/types';
import { ArtView } from '@/components/art/ArtView';
import { RichTextView, Text } from '@/components/primitives';
import { palette, space } from '@/theme/tokens';

/**
 * The workhorse card: a short headline, a short body, optional art.
 *
 * Nothing here is interactive, so the whole surface stays transparent to
 * touches and the tap zones underneath handle navigation.
 */
export function ConceptCardView({ card }: { card: ConceptCard }) {
  // Wholly inert: "none" rather than "box-none" so taps fall through to the
  // navigation zones underneath. box-none would leave the text subtree as a
  // hit target on web and silently swallow every forward tap.
  return (
    <View style={styles.container} pointerEvents="none">
      <RichTextView value={card.headline} variant="h1" color={palette.ink} />

      {card.art && (
        <View style={styles.art}>
          <ArtView spec={card.art} aspectRatio={1.35} glyphSize={72} />
        </View>
      )}

      <RichTextView value={card.body} variant="body" color={palette.inkSoft} style={styles.body} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
  art: {
    marginVertical: space.xs,
  },
  body: {
    marginTop: -space.xs,
  },
});

export { Text };
