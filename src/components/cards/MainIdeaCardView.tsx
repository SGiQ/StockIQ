import { StyleSheet, View } from 'react-native';
import type { MainIdeaCard } from '@/content/types';
import { PillButton, RichTextView, Text } from '@/components/primitives';
import { palette, space } from '@/theme/tokens';

export interface MainIdeaCardViewProps {
  card: MainIdeaCard;
  onContinue: () => void;
}

/**
 * The recap card. Its Continue button is a real button rather than relying
 * on the tap zone, because a recap is a deliberate beat — the learner should
 * feel they finished the section rather than sliding past it.
 */
export function MainIdeaCardView({ card, onContinue }: MainIdeaCardViewProps) {
  return (
    // Root is box-none so the Continue button stays tappable, but the prose
    // above it is explicitly "none" — otherwise that subtree would capture
    // forward taps meant for the navigation zones underneath.
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.prose} pointerEvents="none">
        <Text variant="label" color={palette.slate} uppercase>
          {card.title ?? 'The Main Idea'}
        </Text>

        <RichTextView value={card.summary} variant="h2" color={palette.ink} />

        <View style={styles.bullets}>
          {card.bullets.map((bullet, index) => (
            <View key={index} style={styles.bullet}>
              <View style={styles.dot} />
              <RichTextView
                value={bullet}
                variant="body"
                color={palette.inkSoft}
                style={styles.bulletText}
              />
            </View>
          ))}
        </View>
      </View>

      <PillButton label="Continue" variant="dark" onPress={onContinue} style={styles.continue} />
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
  prose: {
    gap: space.md,
  },
  bullets: {
    gap: space.md,
    marginTop: space.xs,
  },
  bullet: {
    flexDirection: 'row',
    gap: space.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.mint,
    marginTop: 11,
  },
  bulletText: {
    flex: 1,
  },
  continue: {
    marginTop: space.lg,
  },
});
