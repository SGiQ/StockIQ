import { Fragment, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { palette, radius, shadow, space } from '@/theme/tokens';

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
      </View>

      <View style={[styles.overview, shadow.card]}>
        <View style={styles.overviewTop}>
          <View>
            <Text variant="label" color={palette.slate} uppercase>Market map</Text>
            <Text variant="h3">Your route to fluency</Text>
          </View>
          <View style={styles.statPill}>
            <Text variant="label" color={palette.forestDeep} uppercase>{`${earnedXp} / ${course.totalXp} XP`}</Text>
          </View>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} /></View>
        <Text variant="caption" color={palette.slate}>{`${Math.round(progress * 100)}% of this market explored`}</Text>
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

                return (
                  <View key={lessonId}>
                    <LessonNode
                      lessonId={lessonId}
                      title={lesson.title}
                      status={statuses[lessonId] ?? 'locked'}
                      starred={record?.starred}
                      position={i % 2 === 0 ? 'left' : 'right'}
                      isCurrent={lessonId === currentLessonId}
                      isLast={i === unit.lessonIds.length - 1}
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
  overview: { marginHorizontal: space.lg, marginTop: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: palette.paper, gap: space.sm },
  overviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  statPill: {
    backgroundColor: palette.mint,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
  },
  progressTrack: { height: 8, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: palette.hairline },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: palette.emeraldDeep },
  path: {
    padding: space.lg,
    gap: space.md,
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
