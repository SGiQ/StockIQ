import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Glyph } from '@/components/art/Glyph';
import { CardSurface, Text } from '@/components/primitives';
import { dueReviewCount } from '@/features/review';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';

/**
 * The keep-sharp nudge: appears only when spaced-review cards have fallen due.
 *
 * This is the behavioural half of Maintained Readiness — the retention score
 * drifts down as cards go overdue, and this card is the one-tap way back to
 * clearing them. Hidden when there's nothing due, so it never nags.
 */
export function KeepSharpCard() {
  const router = useRouter();
  const reviews = useAppStore((s) => s.reviews);
  const due = dueReviewCount(reviews, Date.now());
  if (due === 0) return null;

  return (
    <Pressable
      onPress={() => router.push('/review' as never)}
      accessibilityRole="button"
      accessibilityLabel={`Keep sharp — ${due} cards due for review`}
    >
      <CardSurface style={styles.card}>
        <View style={styles.icon}>
          <Glyph name="brain" size={24} color={palette.forestDeep} />
        </View>
        <View style={styles.text}>
          <Text variant="h3" color={palette.ink}>
            Keep sharp
          </Text>
          <Text variant="caption" color={palette.slate}>
            {`${due} card${due === 1 ? '' : 's'} due — a quick review keeps your readiness up.`}
          </Text>
        </View>
        <Text variant="h2" color={palette.slateLight}>
          ›
        </Text>
      </CardSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg },
  icon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: palette.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: space.xxs },
});
