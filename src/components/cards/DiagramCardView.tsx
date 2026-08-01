import { StyleSheet, View } from 'react-native';
import type { DiagramCard } from '@/content/types';
import { ArtView } from '@/components/art/ArtView';
import { RichTextView, Text } from '@/components/primitives';
import { palette, space } from '@/theme/tokens';

/**
 * A card where the visual *is* the content — the annotated chart, given the
 * full width of the screen with only a caption beneath it.
 */
export function DiagramCardView({ card, active = true }: { card: DiagramCard; active?: boolean }) {
  return (
    <View style={styles.container} pointerEvents="none">
      {card.title && (
        <Text variant="label" color={palette.slate} uppercase>
          {card.title}
        </Text>
      )}

      <ArtView
        spec={card.art}
        aspectRatio={card.art.kind === 'illustration' ? 1.35 : 1.15}
        active={active}
      />

      <RichTextView value={card.caption} variant="body" color={palette.inkSoft} align="center" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
});
