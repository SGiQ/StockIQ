import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getCourse, getLesson } from '@/content/registry';
import { CardSurface, PillButton, Text } from '@/components/primitives';
import { latestInProgress } from '@/features/resume';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/**
 * "Pick up where you left off."
 *
 * The first thing on the Learn tab whenever a lesson is open, so a returning
 * learner is one tap from the exact card they closed the app on rather than
 * having to find the course, find the lesson, and re-read the deck from the
 * top. Reads the same progress rows everything else does; hidden when
 * nothing is in progress, so it never nags a learner who is between lessons.
 */
export function ResumeCard() {
  const colors = useColors();
  const router = useRouter();
  const progress = useAppStore((s) => s.progress);
  const target = latestInProgress(progress);
  if (!target) return null;

  const lesson = getLesson(target.courseId, target.lessonId);
  const course = getCourse(target.courseId);
  // Content can be retired between releases; a row for a lesson that no
  // longer exists must not surface a dead button.
  if (!lesson || !course) return null;

  const total = lesson.cards.length;
  const cardNumber = Math.min(total, target.lastCardIndex + 1);
  const pct = total > 0 ? target.lastCardIndex / total : 0;
  const open = () => router.push(`/lesson/${target.courseId}/${target.lessonId}` as never);

  return (
    // The pill is the one tap target. Wrapping the whole card in a Pressable
    // as well would nest a button inside a button on web, which the DOM
    // rejects — and the course cards below already set the pattern.
    <CardSurface style={styles.card}>
      <Text variant="label" color={palette.forestDeep} uppercase>
        Pick up where you left off
      </Text>
      <View style={styles.body}>
        <Text variant="h3" numberOfLines={2}>
          {lesson.title}
        </Text>
        <Text variant="caption" color={colors.slate} numberOfLines={1}>
          {`${course.title} · Card ${cardNumber} of ${total}`}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.hairline }]}>
        <View style={[styles.fill, { width: `${Math.max(3, pct * 100)}%` }]} />
      </View>
      <PillButton label="Continue" variant="dark" onPress={open} testID="resume-continue" />
    </CardSurface>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  body: { gap: space.xxs },
  track: {
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.emerald,
  },
});
