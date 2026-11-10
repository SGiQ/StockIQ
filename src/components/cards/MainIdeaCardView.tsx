import { StyleSheet, View } from 'react-native';
import type { MainIdeaCard } from '@/content/types';
import { PillButton, RichTextView, Text } from '@/components/primitives';
import { CardScroll } from './CardScroll';
import { artPalettes, palette, radius, space } from '@/theme/tokens';
import { useColors, useIsDark } from '@/theme/ThemeProvider';

export interface MainIdeaCardViewProps {
  card: MainIdeaCard;
  onContinue: () => void;
}

/**
 * The recap card. Its Continue button is a real button rather than relying
 * on the tap zone, because a recap is a deliberate beat — the learner should
 * feel they finished the section rather than sliding past it.
 *
 * The prose sits in a scroll region that sizes to its content and gives way
 * before the button does. A phone browser is a lot shorter than the native
 * screen — Safari's address bar and toolbar take ~200pt off an iPhone 14 —
 * and a four-bullet recap that fits the native deck pushed Continue clean
 * off the bottom of the stage there, where the stage clips it. The button
 * now stays put and the bullets scroll instead.
 *
 * CardScroll only switches scrolling on once the prose is measured taller
 * than the room it has; while it fits, the recap behaves exactly as before.
 */
export function MainIdeaCardView({ card, onContinue }: MainIdeaCardViewProps) {
  const colors = useColors();
  const isDark = useIsDark();

  return (
    // Root is box-none so the Continue button stays tappable, but the prose
    // is explicitly "none" — otherwise that subtree would capture forward
    // taps meant for the navigation zones underneath.
    <View style={styles.container} pointerEvents="box-none">
      {/* A butter-cream wash for the recap, behind the prose; inert. */}
      <View
        pointerEvents="none"
        style={[
          styles.wash,
          { backgroundColor: isDark ? colors.flameSoft + '2E' : artPalettes.butter.bg + 'B3' },
        ]}
      />

      <CardScroll inert style={styles.scroll} contentContainerStyle={styles.prose}>
        {/* The text itself is never a touch target: when the region scrolls,
            CardScroll owns the drag; when it does not, the tap zones do. */}
        <View style={styles.proseInner} pointerEvents="none">
          <Text variant="label" color={colors.slate} uppercase>
            {card.title ?? 'The Main Idea'}
          </Text>

          <RichTextView value={card.summary} variant="h2" color={colors.ink} />

          <View style={styles.bullets}>
            {card.bullets.map((bullet, index) => (
              <View key={index} style={styles.bullet}>
                <View style={styles.dot} />
                <RichTextView
                  value={bullet}
                  variant="body"
                  color={colors.inkSoft}
                  style={styles.bulletText}
                />
              </View>
            ))}
          </View>
        </View>
      </CardScroll>

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
  wash: {
    ...StyleSheet.absoluteFill,
    margin: -space.md,
    borderRadius: radius.lg,
  },
  /**
   * Sizes to the prose and shrinks before the button does. `flexGrow: 0` is
   * what keeps a short recap looking as it always did — button directly
   * under the last bullet — rather than pinned to the bottom of the card.
   */
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  prose: {
    flexGrow: 0,
  },
  proseInner: {
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
    flexShrink: 0,
    marginTop: space.lg,
  },
});
