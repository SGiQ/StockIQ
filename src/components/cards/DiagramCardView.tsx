import { StyleSheet, View } from 'react-native';
import type { DiagramCard } from '@/content/types';
import { ArtView } from '@/components/art/ArtView';
import { RichTextView, Text } from '@/components/primitives';
import { CardScroll } from './CardScroll';
import { artPalettes, radius, space } from '@/theme/tokens';
import { useColors, useIsDark } from '@/theme/ThemeProvider';

/**
 * A card where the visual *is* the content — the annotated chart, given the
 * full width of the screen with only a caption beneath it.
 */
export function DiagramCardView({ card, active = true }: { card: DiagramCard; active?: boolean }) {
  const colors = useColors();
  const isDark = useIsDark();
  // Inert, so a tap anywhere on it still reaches the navigation zones; the
  // caption is what overflows a short phone browser, and CardScroll lets it.
  return (
    <CardScroll inert>
    <View style={styles.container} pointerEvents="none">
      {/* A cream wash behind the diagram — same layer trick as the concept card. */}
      <View
        style={[
          styles.wash,
          { backgroundColor: isDark ? colors.flameSoft + '33' : artPalettes.parchment.bg + 'B3' },
        ]}
      />
      {card.title && (
        <Text variant="label" color={colors.slate} uppercase>
          {card.title}
        </Text>
      )}

      <ArtView
        spec={card.art}
        aspectRatio={card.art.kind === 'illustration' ? 4 / 3 : 1.15}
        active={active}
      />

      <RichTextView value={card.caption} variant="body" color={colors.inkSoft} align="center" />
    </View>
    </CardScroll>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: space.md,
    gap: space.lg,
  },
  wash: {
    ...StyleSheet.absoluteFill,
    margin: -space.md,
    borderRadius: radius.lg,
  },
});
