import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getLesson, listCourses } from '@/content/registry';
import { ArtView } from '@/components/art/ArtView';
import { StreakRow } from '@/components/StreakRow';
import { CardSurface, PillButton, Screen, Text } from '@/components/primitives';
import {
  courseCompletion,
  courseEarnedXp,
  nextLessonId,
  useAppStore,
} from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';

export default function LearnTab() {
  const courses = listCourses();
  const totalXp = useAppStore((s) => s.profile?.totalXp ?? 0);
  const streak = useAppStore((s) => s.streak);
  const selectedCourseId = useAppStore((s) => s.profile?.selectedCourseId ?? null);

  // The chosen course leads; the rest follow in authored order.
  const ordered = useMemo(() => {
    if (!selectedCourseId) return courses;
    const chosen = courses.find((c) => c.id === selectedCourseId);
    return chosen ? [chosen, ...courses.filter((c) => c.id !== selectedCourseId)] : courses;
  }, [courses, selectedCourseId]);

  return (
    <Screen tone="warm" edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="h1" color={palette.ink}>
            Keep going.
          </Text>
          <View style={styles.xp}>
            <Text variant="label" color={palette.forestDeep} uppercase>
              {`${totalXp} XP`}
            </Text>
          </View>
        </View>

        <CardSurface style={styles.streakCard}>
          <View style={styles.streakHeading}>
            <Text variant="h3" color={palette.ink}>
              {streak && streak.currentStreak > 0
                ? `${streak.currentStreak}-day streak`
                : 'Start a streak'}
            </Text>
            <Text variant="caption" color={palette.slate}>
              {streak && streak.currentStreak > 0
                ? `Longest: ${streak.longestStreak}`
                : 'Finish a lesson today'}
            </Text>
          </View>
          <StreakRow activeDays={streak?.activeDays ?? []} />
        </CardSurface>

        {ordered.map((course) => (
          <CourseCard key={course.id} courseId={course.id} />
        ))}

        <Text variant="caption" color={palette.slateLight} align="center" style={styles.disclaimer}>
          Educational content only. StockIQ does not provide financial advice.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function CourseCard({ courseId }: { courseId: string }) {
  const router = useRouter();
  const course = listCourses().find((c) => c.id === courseId)!;
  const progressMap = useAppStore((s) => s.progress);

  const progress = useMemo(() => courseCompletion(progressMap, courseId), [progressMap, courseId]);
  const earnedXp = useMemo(() => courseEarnedXp(progressMap, courseId), [progressMap, courseId]);
  const nextLesson = useMemo(() => nextLessonId(progressMap, courseId), [progressMap, courseId]);
  const nextTitle = nextLesson ? getLesson(courseId, nextLesson)?.title : undefined;
  const done = progress >= 1;

  return (
    <CardSurface style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.cover}>
          <ArtView spec={course.cover} aspectRatio={1} glyphSize={40} />
        </View>
        <View style={styles.cardText}>
          <Text variant="h3" color={palette.ink} numberOfLines={2}>
            {course.title}
          </Text>
          <Text variant="caption" color={palette.slate}>
            {`${earnedXp} / ${course.totalXp} XP · ${Math.round(progress * 100)}%`}
          </Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(2, progress * 100)}%` }]} />
      </View>

      {nextTitle && !done && (
        <Text variant="caption" color={palette.slate} numberOfLines={1}>
          {`Up next: ${nextTitle}`}
        </Text>
      )}

      <View style={styles.actions}>
        <PillButton
          label={done ? 'Review course' : progress > 0 ? 'Continue' : 'Start course'}
          variant="dark"
          onPress={() => {
            if (nextLesson) router.push(`/lesson/${courseId}/${nextLesson}` as never);
            else router.push(`/course/${courseId}` as never);
          }}
        />
        <PillButton
          label="See all lessons"
          variant="ghost"
          onPress={() => router.push(`/course/${courseId}` as never)}
        />
      </View>
    </CardSurface>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.lg,
    gap: space.lg,
    paddingBottom: space.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  xp: {
    backgroundColor: palette.mint,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  streakCard: {
    gap: space.md,
  },
  streakHeading: {
    gap: space.xxs,
  },
  card: {
    gap: space.md,
  },
  cardRow: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
  },
  cover: {
    width: 72,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  cardText: {
    flex: 1,
    gap: space.xs,
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.hairline,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.emerald,
  },
  actions: {
    gap: space.sm,
  },
  disclaimer: {
    marginTop: space.md,
  },
});
