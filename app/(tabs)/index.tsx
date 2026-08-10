import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { getLesson, listCourses } from '@/content/registry';
import { ArtView } from '@/components/art/ArtView';
import { StreakRow } from '@/components/StreakRow';
import { GemCounter } from '@/components/Currency';
import { TodayCard } from '@/components/TodayCard';
import { KeepSharpCard } from '@/components/KeepSharpCard';
import { ThisWeekCard } from '@/components/ThisWeekCard';
import {
  CardSurface,
  PillButton,
  Screen,
  SpeakerIcon,
  Text,
} from '@/components/primitives';
import {
  courseCompletion,
  courseEarnedXp,
  nextLessonId,
  totalEarnedXp,
  useAppStore,
} from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';

export default function LearnTab() {
  const router = useRouter();
  const courses = listCourses();
  const totalXp = useAppStore((s) => totalEarnedXp(s.progress));
  const streak = useAppStore((s) => s.streak);
  const gemBalance = useAppStore((s) => s.gems?.balance ?? 0);
  const selectedCourseId = useAppStore((s) => s.profile?.selectedCourseId ?? null);
  const narrationEnabled = useAppStore(
    (s) => s.profile?.narrationEnabled ?? false,
  );

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
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push('/portfolio' as never)}
              accessibilityRole="button"
              accessibilityLabel="Practice portfolio"
              style={styles.narrationSettings}
              hitSlop={8}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Path
                  d="M4 8h16v11H4zM8 8V6a2 2 0 012-2h4a2 2 0 012 2v2"
                  fill="none"
                  stroke={palette.forestDeep}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
            <Pressable
              onPress={() => router.push('/watchlist' as never)}
              accessibilityRole="button"
              accessibilityLabel="Watchlist"
              style={styles.narrationSettings}
              hitSlop={8}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Path
                  d="M4 16l4-5 4 3 5-7"
                  fill="none"
                  stroke={palette.forestDeep}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path d="M17 7h3v3" fill="none" stroke={palette.forestDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
            <Pressable
              onPress={() => router.push('/ask' as never)}
              accessibilityRole="button"
              accessibilityLabel="Ask StockIQ"
              style={styles.narrationSettings}
              hitSlop={8}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Path
                  d="M4 5h16v11H9l-4 3v-3H4z"
                  fill="none"
                  stroke={palette.forestDeep}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                <Path d="M8.5 10h7M8.5 12.5h4.5" stroke={palette.forestDeep} strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </Pressable>
            <Pressable
              onPress={() => router.push('/settings/narration' as never)}
              accessibilityRole="button"
              accessibilityLabel="Narration settings"
              style={styles.narrationSettings}
              hitSlop={8}
            >
              <SpeakerIcon
                size={20}
                color={narrationEnabled ? palette.forestDeep : palette.slate}
                muted={!narrationEnabled}
              />
            </Pressable>
            <Pressable
              onPress={() => router.push('/settings' as never)}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={styles.narrationSettings}
              hitSlop={8}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Circle cx={12} cy={12} r={3.2} fill="none" stroke={palette.ink} strokeWidth={2} />
                <Path d="M12 2.7v2.1M12 19.2v2.1M2.7 12h2.1M19.2 12h2.1M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5" stroke={palette.ink} strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </Pressable>
            <GemCounter balance={gemBalance} />
            <View style={styles.xp}>
              <Text variant="label" color={palette.forestDeep} uppercase>
                {`${totalXp} XP`}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/streak' as never)}
          accessibilityRole="button"
          accessibilityLabel="Streak details"
        >
          <CardSurface style={styles.streakCard}>
            <View style={styles.streakTop}>
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
              {streak && streak.freezes > 0 ? (
                <View style={styles.freezePill}>
                  <Text variant="label" color={palette.azure} uppercase>
                    {`❄︎ ${streak.freezes}`}
                  </Text>
                </View>
              ) : null}
            </View>
            <StreakRow activeDays={streak?.activeDays ?? []} />
          </CardSurface>
        </Pressable>

        <KeepSharpCard />

        <TodayCard />

        <ThisWeekCard />

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
          <Text variant="caption" color={done ? palette.forestDeep : palette.slate}>
            {done
              ? `Complete · ${earnedXp} / ${course.totalXp} XP`
              : `${earnedXp} / ${course.totalXp} XP · ${Math.round(progress * 100)}%`}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  narrationSettings: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: palette.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCard: {
    gap: space.md,
  },
  streakTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  streakHeading: {
    gap: space.xxs,
    flex: 1,
  },
  freezePill: {
    backgroundColor: palette.azureSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs + 1,
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
