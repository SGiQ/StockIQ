import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { listWeeklyNotes } from '@/content/registry';
import { CardSurface, Text } from '@/components/primitives';
import { unseenWeeklyNoteCount, useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';

/**
 * The home entry point into This Week: the latest note, with a "new" dot when
 * there's something the learner hasn't opened. This is the after-the-course
 * reason to return — a fresh, timely read each drop.
 */
export function ThisWeekCard() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const latest = listWeeklyNotes()[0];
  if (!latest) return null;

  const unseen = unseenWeeklyNoteCount(profile);

  return (
    <Pressable
      onPress={() => router.push('/this-week' as never)}
      accessibilityRole="button"
      accessibilityLabel="This Week"
    >
      <CardSurface style={styles.card}>
        <View style={styles.top}>
          <Text variant="label" color={palette.violetInk} uppercase>
            This Week
          </Text>
          {unseen > 0 ? <View style={styles.newDot} /> : null}
        </View>
        <Text variant="h3" color={palette.ink}>
          {latest.title}
        </Text>
        <Text variant="caption" color={palette.slate}>
          {latest.summary}
        </Text>
      </CardSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.xs, borderRadius: radius.lg },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  newDot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    backgroundColor: palette.violet,
  },
});
