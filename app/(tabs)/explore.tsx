import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { listBooks, listCourses, listStrategies, listTraders } from '@/content/registry';
import { COURSE_CATEGORIES, type Course, type CourseCategory } from '@/content/types';
import { ArtView } from '@/components/art/ArtView';
import { Glyph } from '@/components/art/Glyph';
import { Chip, Screen, Text } from '@/components/primitives';
import { courseCompletion, useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, shadow, space } from '@/theme/tokens';

const CATEGORY_LABELS: Record<CourseCategory, string> = {
  fundamentals: 'Fundamentals',
  analysis: 'Analysis',
  technicals: 'Charts',
  risk: 'Risk',
  psychology: 'Psychology',
  strategies: 'Strategies',
  'getting-started': 'Getting Started',
};

/** Each category gets a fixed tone so the filter row reads like Imprint's. */
const CATEGORY_TONES = ['violet', 'flame', 'azure', 'mint', 'dark', 'neutral'] as const;

export default function ExploreTab() {
  const router = useRouter();
  const courses = listCourses();
  const [filter, setFilter] = useState<CourseCategory | null>(null);

  const traderCount = listTraders().length;
  const strategyCount = listStrategies().length;
  const bookCount = listBooks().length;

  // Only offer categories that actually have content behind them — an empty
  // filter chip is a dead end.
  const available = useMemo(
    () => COURSE_CATEGORIES.filter((c) => courses.some((course) => course.category === c)),
    [courses],
  );

  const shown = useMemo(
    () => (filter ? courses.filter((c) => c.category === filter) : courses),
    [courses, filter],
  );
  // A "New" highlight is only meaningful when something is *not* new —
  // otherwise it just prints the same grid twice.
  const fresh = useMemo(() => {
    const isNew = shown.filter((c) => c.isNew);
    return isNew.length === shown.length ? [] : isNew;
  }, [shown]);

  return (
    <Screen tone="warm" edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="h1" color={palette.ink}>
          Explore
        </Text>

        {/*
          The knowledge base lives behind Explore rather than getting a fifth
          tab — four tabs is the shape Imprint uses, and "browse everything"
          is already what this screen is for.
        */}
        <Pressable
          onPress={() => router.push('/kb')}
          accessibilityRole="button"
          accessibilityLabel="Knowledge base"
        >
          <View style={styles.kbCard}>
            <View style={styles.kbIcon}>
              <Glyph name="compass" size={26} color={palette.paper} />
            </View>
            <View style={styles.kbText}>
              <Text variant="h3" color={palette.paper}>
                Knowledge base
              </Text>
              <Text variant="caption" color={palette.mintSoft}>
                {`${traderCount} traders · ${strategyCount} strategies · ${bookCount} books`}
              </Text>
            </View>
          </View>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip label="All" selected={filter === null} onPress={() => setFilter(null)} />
          {available.map((category, i) => (
            <Chip
              key={category}
              label={CATEGORY_LABELS[category]}
              tone={filter === category ? CATEGORY_TONES[i % CATEGORY_TONES.length] : 'neutral'}
              selected={filter === category}
              onPress={() => setFilter(filter === category ? null : category)}
            />
          ))}
        </ScrollView>

        {fresh.length > 0 && (
          <Section title="New">
            <Grid courses={fresh} />
          </Section>
        )}

        <Section title={filter ? CATEGORY_LABELS[filter] : 'All courses'}>
          <Grid courses={shown} />
        </Section>

        {shown.length === 0 && (
          <Text variant="body" color={palette.slate} align="center">
            Nothing here yet.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="h2" color={palette.ink}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Grid({ courses }: { courses: Course[] }) {
  return (
    <View style={styles.grid}>
      {courses.map((course) => (
        <CourseTile key={course.id} course={course} />
      ))}
    </View>
  );
}

function CourseTile({ course }: { course: Course }) {
  const router = useRouter();
  const progressMap = useAppStore((s) => s.progress);
  const progress = useMemo(
    () => courseCompletion(progressMap, course.id),
    [progressMap, course.id],
  );

  return (
    <Pressable
      onPress={() => router.push(`/course/${course.id}` as never)}
      accessibilityRole="button"
      accessibilityLabel={course.title}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <View style={styles.tileCover}>
        <ArtView spec={course.cover} aspectRatio={1} rounded={false} glyphSize={56} />
        {course.isNew && (
          <View style={styles.newBadge}>
            <Text variant="label" color={palette.paper} uppercase>
              New
            </Text>
          </View>
        )}
      </View>

      <Text variant="bodySm" color={palette.ink} numberOfLines={2} style={styles.tileTitle}>
        {course.title}
      </Text>
      <Text variant="caption" color={palette.slate}>
        {progress > 0 ? `${Math.round(progress * 100)}% complete` : course.author}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.lg,
    gap: space.lg,
    paddingBottom: space.xxl,
  },
  chips: {
    gap: space.sm,
    paddingRight: space.lg,
  },
  kbCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: palette.forestDeep,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.card,
  },
  kbIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: palette.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kbText: {
    flex: 1,
    gap: space.xxs,
  },
  section: {
    gap: space.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // space-between supplies the column gutter. A `gap` plus 48%-wide tiles
    // overflows the row and collapses the grid to a single column.
    justifyContent: 'space-between',
    rowGap: space.lg,
  },
  tile: {
    width: '48%',
    gap: space.xs,
  },
  tilePressed: {
    opacity: 0.75,
  },
  tileCover: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  newBadge: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    backgroundColor: palette.ink,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs + 1,
  },
  tileTitle: {
    marginTop: space.xxs,
  },
});
