import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { ArtView } from '@/components/art/ArtView';
import { StreakRow } from '@/components/StreakRow';
import { CardSurface, Screen, SpeakerIcon, Text } from '@/components/primitives';
import { getLesson, listCourses, listLessonsInCourse } from '@/content/registry';
import { pairing } from '@/store';
import { courseCompletion, useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';

export default function DashboardTab() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const streak = useAppStore((s) => s.streak);
  const progress = useAppStore((s) => s.progress);
  const saved = useAppStore((s) => s.saved);
  const liked = useAppStore((s) => s.liked);
  const unlockedStrategies = useAppStore((s) => s.unlockedStrategies);
  const courses = listCourses();

  const completed = useMemo(
    () => Object.values(progress).filter((lesson) => lesson.status === 'completed'),
    [progress],
  );
  const starred = useMemo(() => completed.filter((lesson) => lesson.starred).length, [completed]);
  const totalLessons = useMemo(
    () => courses.reduce((sum, course) => sum + listLessonsInCourse(course.id).length, 0),
    [courses],
  );
  const recent = useMemo(
    () => [...completed]
      .filter((lesson) => lesson.completedAt !== null)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      .slice(0, 3),
    [completed],
  );

  const narration = `${profile?.narrationVoice ?? 'female'} · ${profile?.narrationSpeed ?? 1}× · ${profile?.narrationEnabled ? 'autoplay on' : 'autoplay off'}`;

  return (
    <Screen tone="warm" edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text variant="h1" color={palette.ink}>Your dashboard</Text>
            <Text variant="caption" color={palette.slate}>A clear view of your learning.</Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings' as never)}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={styles.settingsButton}
          >
            <SettingsIcon />
          </Pressable>
        </View>

        <CardSurface tone="forestDeep" style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.avatar}>
              <Text variant="h2" color={palette.forestDeep}>SIQ</Text>
            </View>
            <View style={styles.heroCopy}>
              <Text variant="label" color={palette.mintSoft} uppercase>Learning portfolio</Text>
              <Text variant="display" color={palette.paper}>{`${profile?.totalXp ?? 0} XP`}</Text>
              <Text variant="caption" color={palette.paper}>
                {`${completed.length} of ${totalLessons} lessons complete`}
              </Text>
            </View>
          </View>
          <View style={styles.heroTrack}>
            <View
              style={[
                styles.heroFill,
                { width: `${totalLessons > 0 ? (completed.length / totalLessons) * 100 : 0}%` },
              ]}
            />
          </View>
        </CardSurface>

        <View style={styles.statsGrid}>
          <StatCard value={streak?.currentStreak ?? 0} label="Day streak" accent={palette.flame} />
          <StatCard value={starred} label="Starred lessons" accent={palette.violet} />
          <StatCard value={saved.length} label="Saved cards" accent={palette.azure} />
          <StatCard value={unlockedStrategies.length} label="Strategies open" accent={palette.emeraldDeep} />
        </View>

        <CardSurface style={styles.streakCard}>
          <View>
            <Text variant="h3" color={palette.ink}>This week</Text>
            <Text variant="caption" color={palette.slate}>
              {streak?.currentStreak ? `Keep your ${streak.currentStreak}-day streak moving.` : 'Complete a lesson to start your streak.'}
            </Text>
          </View>
          <StreakRow activeDays={streak?.activeDays ?? []} />
        </CardSurface>

        <SectionTitle title="Course progress" />
        {courses.map((course) => {
          const completion = courseCompletion(progress, course.id);
          return (
            <Pressable
              key={course.id}
              onPress={() => router.push(`/course/${course.id}` as never)}
              accessibilityRole="button"
              accessibilityLabel={`${course.title}, ${Math.round(completion * 100)} percent complete`}
            >
              <CardSurface style={styles.courseRow}>
                <View style={styles.courseArt}>
                  <ArtView spec={course.cover} aspectRatio={1} glyphSize={28} />
                </View>
                <View style={styles.courseCopy}>
                  <View style={styles.courseHeading}>
                    <Text variant="body" color={palette.ink} numberOfLines={1}>{course.title}</Text>
                    <Text variant="label" color={palette.forestDeep}>{`${Math.round(completion * 100)}%`}</Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${completion * 100}%` }]} />
                  </View>
                </View>
              </CardSurface>
            </Pressable>
          );
        })}

        {recent.length > 0 ? (
          <>
            <SectionTitle title="Recently completed" />
            <CardSurface style={styles.listCard}>
              {recent.map((lesson, index) => (
                <Pressable
                  key={lesson.id}
                  onPress={() => router.push(`/lesson/${lesson.courseId}/${lesson.lessonId}` as never)}
                  accessibilityRole="button"
                  style={[styles.recentRow, index > 0 && styles.rowDivider]}
                >
                  <View style={styles.checkCircle}><Text variant="label" color={palette.paper}>✓</Text></View>
                  <View style={styles.courseCopy}>
                    <Text variant="body" color={palette.ink} numberOfLines={1}>
                      {getLesson(lesson.courseId, lesson.lessonId)?.title ?? lesson.lessonId}
                    </Text>
                    <Text variant="caption" color={palette.slate}>{`${lesson.xpAwarded} XP${lesson.starred ? ' · Starred' : ''}`}</Text>
                  </View>
                </Pressable>
              ))}
            </CardSurface>
          </>
        ) : null}

        <SectionTitle title="Account & preferences" />
        <DashboardLink
          icon={<SpeakerIcon size={22} color={palette.forestDeep} muted={!profile?.narrationEnabled} />}
          title="Narration"
          subtitle={narration}
          onPress={() => router.push('/settings/narration' as never)}
        />
        <DashboardLink
          icon={<AccountIcon />}
          title="Email sign-in & sync"
          subtitle={pairing ? 'Recovery and multi-device progress' : 'Sync is not configured'}
          onPress={() => router.push('/settings/devices' as never)}
        />

        <Text variant="caption" color={palette.slateLight} align="center">
          {`${liked.length} liked item${liked.length === 1 ? '' : 's'} · Educational content only`}
        </Text>
      </ScrollView>
    </Screen>
  );
}

function StatCard({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <CardSurface style={styles.statCard}>
      <View style={[styles.statDot, { backgroundColor: accent }]} />
      <Text variant="h2" color={palette.ink}>{value}</Text>
      <Text variant="caption" color={palette.slate}>{label}</Text>
    </CardSurface>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text variant="label" color={palette.slate} uppercase>{title}</Text>;
}

function DashboardLink({ icon, title, subtitle, onPress }: { icon: React.ReactNode; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <CardSurface style={styles.linkRow}>
        <View style={styles.linkIcon}>{icon}</View>
        <View style={styles.courseCopy}>
          <Text variant="body" color={palette.ink}>{title}</Text>
          <Text variant="caption" color={palette.slate}>{subtitle}</Text>
        </View>
        <Text variant="h2" color={palette.slateLight}>›</Text>
      </CardSurface>
    </Pressable>
  );
}

function SettingsIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={3.2} fill="none" stroke={palette.ink} strokeWidth={2} />
      <Path d="M12 2.7v2.1M12 19.2v2.1M2.7 12h2.1M19.2 12h2.1M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5" stroke={palette.ink} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function AccountIcon() {
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={4} fill="none" stroke={palette.forestDeep} strokeWidth={2} />
      <Path d="M4.5 21a7.5 7.5 0 0115 0" fill="none" stroke={palette.forestDeep} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.lg, paddingBottom: space.xxl + 96, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingsButton: { width: 46, height: 46, borderRadius: radius.pill, backgroundColor: palette.paper, alignItems: 'center', justifyContent: 'center' },
  hero: { padding: space.lg, gap: space.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 62, height: 62, borderRadius: radius.pill, backgroundColor: palette.mintSoft, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, gap: space.xxs },
  heroTrack: { height: 8, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  heroFill: { height: '100%', borderRadius: radius.pill, backgroundColor: palette.mint },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.sm },
  statCard: { width: '48.5%', minHeight: 118, gap: space.xs },
  statDot: { width: 10, height: 10, borderRadius: radius.pill },
  streakCard: { gap: space.md },
  courseRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg },
  courseArt: { width: 52, borderRadius: radius.md, overflow: 'hidden' },
  courseCopy: { flex: 1, gap: space.xs },
  courseHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, alignItems: 'center' },
  track: { height: 7, borderRadius: radius.pill, backgroundColor: palette.hairline, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: palette.emerald },
  listCard: { paddingVertical: 0 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  rowDivider: { borderTopWidth: 1, borderTopColor: palette.hairline },
  checkCircle: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: palette.emeraldDeep, alignItems: 'center', justifyContent: 'center' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg },
  linkIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: palette.mintSoft, alignItems: 'center', justifyContent: 'center' },
});
