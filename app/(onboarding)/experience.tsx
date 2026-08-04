import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PillButton, Screen, Text } from '@/components/primitives';
import { useAppStore } from '@/store/slices/useAppStore';
import type { CourseId } from '@/content/types';
import type { ExperienceLevel, LearningGoal } from '@/store/repository';
import { palette, radius, shadow, space } from '@/theme/tokens';

/**
 * The personalisation step.
 *
 * Two quick taps — where you're starting from and what you're here for — so the
 * next screen can pre-select a sensible course and the app can pitch itself at
 * the right level. It's a nudge, not a gate: nothing here is required reading
 * and the learner can change the course on the very next screen.
 */

const LEVELS: { value: ExperienceLevel; label: string; hint: string }[] = [
  { value: 'new', label: 'New to investing', hint: 'Starting from the beginning' },
  { value: 'some', label: 'I know some basics', hint: 'Comfortable with the vocabulary' },
  { value: 'active', label: 'I already invest', hint: 'Sharpening what I know' },
];

const GOALS: { value: LearningGoal; label: string; hint: string }[] = [
  { value: 'invest', label: 'Invest for the long term', hint: 'Businesses, value, patience' },
  { value: 'trade', label: 'Learn to read charts', hint: 'Price, trend, and timing' },
  { value: 'understand', label: 'Just understand the market', hint: 'Make the headlines make sense' },
];

/** A gentle course nudge from the two answers. Everyone can override it next. */
function recommendCourse(level: ExperienceLevel, goal: LearningGoal): CourseId {
  if (level === 'new') return 'market-foundations';
  if (goal === 'trade') return 'reading-a-chart';
  if (goal === 'invest') return 'reading-a-business';
  return 'market-foundations';
}

export default function Experience() {
  const router = useRouter();
  const setExperience = useAppStore((s) => s.setExperience);
  const selectCourse = useAppStore((s) => s.selectCourse);

  const [level, setLevel] = useState<ExperienceLevel | null>(null);
  const [goal, setGoal] = useState<LearningGoal | null>(null);
  const ready = level !== null && goal !== null;

  return (
    <Screen tone="forest">
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="display" color={palette.paper}>
            Let's tune it to you.
          </Text>
          <Text variant="body" color={palette.mintSoft}>
            Two quick taps. You can change everything later.
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.groups} showsVerticalScrollIndicator={false}>
          <Group title="Where are you starting from?">
            {LEVELS.map((option) => (
              <Option
                key={option.value}
                label={option.label}
                hint={option.hint}
                selected={level === option.value}
                onPress={() => setLevel(option.value)}
              />
            ))}
          </Group>

          <Group title="What brings you here?">
            {GOALS.map((option) => (
              <Option
                key={option.value}
                label={option.label}
                hint={option.hint}
                selected={goal === option.value}
                onPress={() => setGoal(option.value)}
              />
            ))}
          </Group>
        </ScrollView>

        <PillButton
          label="Continue"
          variant="light"
          disabled={!ready}
          onPress={async () => {
            if (!level || !goal) return;
            await setExperience(level, goal);
            await selectCourse(recommendCourse(level, goal));
            router.push('/(onboarding)/choose-course');
          }}
        />
      </View>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text variant="label" color={palette.mintSoft} uppercase>
        {title}
      </Text>
      <View style={styles.options}>{children}</View>
    </View>
  );
}

function Option({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <View style={styles.optionCopy}>
        <Text variant="body" color={palette.ink}>
          {label}
        </Text>
        <Text variant="caption" color={palette.slate}>
          {hint}
        </Text>
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
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
  groups: {
    gap: space.lg,
    paddingBottom: space.lg,
  },
  group: {
    gap: space.sm,
  },
  options: {
    gap: space.sm,
  },
  option: {
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
  optionSelected: {
    borderColor: palette.mint,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: palette.forestDeep,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: palette.forestDeep,
  },
});
