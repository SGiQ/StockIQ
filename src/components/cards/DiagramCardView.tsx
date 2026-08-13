import { StyleSheet, View } from 'react-native';
import type { DiagramCard } from '@/content/types';
import { ArtView } from '@/components/art/ArtView';
import { RichTextView, Text } from '@/components/primitives';
import { space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/**
 * A card where the visual *is* the content — the annotated chart, given the
 * full width of the screen with only a caption beneath it.
 */
export function DiagramCardView({ card, active = true }: { card: DiagramCard; active?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.container} pointerEvents="none">
      {card.title && (
        <Text variant="label" color={colors.slate} uppercase>
          {card.title}
        </Text>
      )}

      <ArtView
        spec={card.art}
        aspectRatio={card.art.kind === 'illustration' ? 1.35 : 1.15}
        active={active}
      />

      <RichTextView value={card.caption} variant="body" color={colors.inkSoft} align="center" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: space.md,
    gap: space.lg,
  },
});
