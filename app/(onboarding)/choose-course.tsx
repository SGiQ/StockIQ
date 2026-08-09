import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { listCourses } from '@/content/registry';
import { ArtView } from '@/components/art/ArtView';
import { PillButton, Screen, Text } from '@/components/primitives';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, shadow, space } from '@/theme/tokens';

/** Mirrors "Choose your course." from the Imprint onboarding. */
export default function ChooseCourse() {
  const router = useRouter();
  const courses = listCourses();
  const selectCourse = useAppStore((s) => s.selectCourse);
  // Pre-select whatever the personalisation step recommended (stored on the
  // profile), falling back to the first course for anyone who skipped it.
  const recommended = useAppStore((s) => s.profile?.selectedCourseId ?? null);
  const [selected, setSelected] = useState<string | null>(recommended ?? courses[0]?.id ?? null);

  return (
    <Screen tone="forest">
      <View style={styles.content}>
        <OnboardingProgress step={3} total={4} />

        <View style={styles.header}>
          <Text variant="display" color={palette.paper}>
            Choose your course.
          </Text>
          <Text variant="body" color={palette.mintSoft}>
            You can always change this later.
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {courses.map((course) => {
            const isSelected = selected === course.id;
            return (
              <Pressable
                key={course.id}
                onPress={() => setSelected(course.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={[styles.row, isSelected && styles.rowSelected]}
              >
                <View style={styles.cover}>
                  <ArtView spec={course.cover} aspectRatio={1} glyphSize={36} />
                </View>
                <View style={styles.rowTitle}>
                  <Text variant="h3" color={palette.ink}>
                    {course.title}
                  </Text>
                  {course.id === recommended ? (
                    <View style={styles.recommendedTag}>
                      <Text variant="label" color={palette.forestDeep} uppercase>
                        Recommended for you
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <PillButton
          label="Continue"
          variant="light"
          disabled={!selected}
          onPress={async () => {
            if (selected) await selectCourse(selected);
            router.push('/(onboarding)/disclaimer');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: space.lg,
    paddingBottom: space.xl,
    gap: space.lg,
  },
  header: {
    gap: space.sm,
    marginTop: space.md,
  },
  list: {
    gap: space.md,
    paddingBottom: space.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: palette.paper,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 3,
    borderColor: 'transparent',
    ...shadow.card,
  },
  rowSelected: {
    borderColor: palette.mint,
  },
  cover: {
    width: 64,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  rowTitle: {
    flex: 1,
    gap: space.xs,
  },
  recommendedTag: {
    alignSelf: 'flex-start',
    backgroundColor: palette.mintSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
});
