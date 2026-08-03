import { Fragment, useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { getCourse, getLesson } from '@/content/registry';
import { LessonNode } from '@/components/path/LessonNode';
import { UnitBanner } from '@/components/path/UnitBanner';
import { Screen, Text } from '@/components/primitives';
import {
  courseCompletion,
  courseEarnedXp,
  courseNodeStatuses,
  useAppStore,
} from '@/store/slices/useAppStore';
import { progressId } from '@/store';
import { toPlainText } from '@/content/richtext';
import { palette, radius, space } from '@/theme/tokens';

/**
 * The course path.
 *
 * Nodes alternate left/right down the screen rather than sitting in a grid,
 * which is what makes it read as a journey with a next step instead of a
 * table of contents.
 */
export default function CourseScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();

  const course = getCourse(courseId);
  // Subscribe to the stable progress map and derive from it. Passing a
  // freshly-built object out of a Zustand selector would fail its identity
  // check on every read and re-render forever.
  const progressMap = useAppStore((s) => s.progress);

  const statuses = useMemo(() => courseNodeStatuses(progressMap, courseId), [progressMap, courseId]);
  const progress = useMemo(() => courseCompletion(progressMap, courseId), [progressMap, courseId]);
  const earnedXp = useMemo(() => courseEarnedXp(progressMap, courseId), [progressMap, courseId]);
  const currentLessonId = useMemo(() => {
    if (!course) return undefined;
    const ids = course.units.slice().sort((a, b) => a.index - b.index).flatMap((unit) => unit.lessonIds);
    return ids.find((id) => statuses[id] === 'in_progress') ?? ids.find((id) => statuses[id] === 'available');
  }, [course, statuses]);

  // The eyebrow over the progress bar names where you are in the course — the
  // unit holding the current lesson — rather than a fixed string. It fell back
  // to a hardcoded "Introduction to equities" that was wrong on every course
  // but the first.
  const currentUnitName = useMemo(() => {
    if (!course) return undefined;
    const sorted = course.units.slice().sort((a, b) => a.index - b.index);
    return (sorted.find((u) => u.lessonIds.includes(currentLessonId ?? '')) ?? sorted[0])?.name;
  }, [course, currentLessonId]);

  if (!course) {
    return (
      <Screen tone="warm">
        <View style={styles.missing}>
          <Text variant="h2">Course not found</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen tone="warm">
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path
              d="M15 5l-7 7 7 7"
              stroke={palette.ink}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Pressable>
        <Text variant="h3" color={palette.ink} numberOfLines={2} style={styles.headerTitle}>
          {course.title}
        </Text>
        <View style={styles.logoCrop} accessibilityLabel="StockIQ">
          <Image source={require('../../public/logo/SG.png')} resizeMode="contain" style={styles.logo} />
        </View>
      </View>

      <View style={styles.progressHeader}>
        <View style={styles.progressCopy}>
          <Text variant="label" color={palette.slate} uppercase>{currentUnitName ?? 'Your progress'}</Text>
          <Text variant="caption" color={palette.forestDeep}>{`${earnedXp} / ${course.totalXp} XP`}</Text>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} /></View>
        <Text variant="label" color={palette.forestDeep}>{`${Math.round(progress * 100)}%`}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.path} showsVerticalScrollIndicator={false}>
        {course.units
          .slice()
          .sort((a, b) => a.index - b.index)
          .map((unit) => (
            <Fragment key={unit.id}>
              <UnitBanner
                index={unit.index}
                name={unit.name}
                total={unit.lessonIds.length}
                completed={unit.lessonIds.filter((id) => statuses[id] === 'completed').length}
              />

              {unit.lessonIds.map((lessonId, i) => {
                const lesson = getLesson(course.id, lessonId);
                if (!lesson) return null;
                const record = progressMap[progressId(course.id, lessonId)];
                const intro = lesson.cards.find((card) => card.type === 'concept');
                const summary = intro ? toPlainText(intro.body) : `Build the next part of your ${course.category} foundation.`;

                return (
                  <View key={lessonId}>
                    <LessonNode
                      lessonId={lessonId}
                      title={lesson.title}
                      summary={summary}
                      estimatedMinutes={lesson.estimatedMinutes}
                      status={statuses[lessonId] ?? 'locked'}
                      starred={record?.starred}
                      isCurrent={lessonId === currentLessonId}
                      onPress={() =>
                        router.push(`/lesson/${course.id}/${lessonId}` as never)
                      }
                    />
                  </View>
                );
              })}
            </Fragment>
          ))}

        <Text variant="caption" color={palette.slateLight} align="center" style={styles.disclaimer}>
          Educational content only. StockIQ does not provide financial advice.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  headerTitle: {
    flex: 1,
  },
  logoCrop: { width: 64, height: 42, overflow: 'hidden', borderRadius: radius.sm, backgroundColor: palette.paper },
  logo: { width: '100%', height: '100%' },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: palette.hairline },
  progressCopy: { flex: 1 },
  progressTrack: { width: 84, height: 5, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: palette.hairline },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: palette.emeraldDeep },
  path: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xxl,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: {
    marginTop: space.lg,
  },
});
