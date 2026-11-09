import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Bump, PillButton, Screen, Text } from '@/components/primitives';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import { useAppStore } from '@/store/slices/useAppStore';
import type { CourseId } from '@/content/types';
import type { ExperienceLevel, LearningGoal } from '@/store/repository';
import { palette, radius, shadow, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/**
 * The personalisation step.
 *
 * Where you're starting from (one answer) and what you're here for (any number),
 * so the next screens can pre-select a sensible course and pitch the app at the
 * right level. It's a nudge, not a gate: nothing here is required reading and
 * the learner can change the course a couple of screens later.
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

/** A gentle course nudge from the answers. Everyone can override it later. */
function recommendCourse(level: ExperienceLevel, goals: LearningGoal[]): CourseId {
  if (level === 'new') return 'market-foundations';
  if (goals.includes('trade')) return 'reading-a-chart';
  if (goals.includes('invest')) return 'reading-a-business';
  return 'market-foundations';
}

export default function Experience() {
  const colors = useColors();
  const router = useRouter();
  const setExperience = useAppStore((s) => s.setExperience);
  const selectCourse = useAppStore((s) => s.selectCourse);

  const [level, setLevel] = useState<ExperienceLevel | null>(null);
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const ready = level !== null && goals.length > 0;

  const toggleGoal = (value: LearningGoal) =>
    setGoals((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value],
    );

  return (
    <Screen tone="forest">
      <View style={styles.content}>
        <OnboardingProgress step={1} total={4} />

        <View style={styles.header}>
          <Text variant="display" color={colors.paper}>
            Let's tune it to you.
          </Text>
          <Text variant="body" color={palette.mintSoft}>
            A few quick taps — you can change anything later.
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.groups} showsVerticalScrollIndicator={false}>
          <Group title="Where are you starting from?">
            {LEVELS.map((option) => (
              <Option
                key={option.value}
                label={option.label}
                hint={option.hint}
                mode="radio"
                selected={level === option.value}
                onPress={() => setLevel(option.value)}
              />
            ))}
          </Group>

          <Group title="What brings you here?" hint="Pick all that apply">
            {GOALS.map((option) => (
              <Option
                key={option.value}
                label={option.label}
                hint={option.hint}
                mode="check"
                selected={goals.includes(option.value)}
                onPress={() => toggleGoal(option.value)}
              />
            ))}
          </Group>
        </ScrollView>

        <PillButton
          label="Continue"
          variant="light"
          disabled={!ready}
          onPress={async () => {
            if (!level || goals.length === 0) return;
            await setExperience(level, goals);
            await selectCourse(recommendCourse(level, goals));
            router.push('/(onboarding)/daily-goal' as never);
          }}
        />
      </View>
    </Screen>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <Text variant="label" color={palette.mintSoft} uppercase>
          {title}
        </Text>
        {hint ? (
          <Text variant="caption" color={palette.mint}>
            {hint}
          </Text>
        ) : null}
      </View>
      <View style={styles.options}>{children}</View>
    </View>
  );
}

function Option({
  label,
  hint,
  selected,
  mode,
  onPress,
}: {
  label: string;
  hint: string;
  selected: boolean;
  /** `radio` for the single-choice level; `check` for the multi-select goals. */
  mode: 'radio' | 'check';
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={mode === 'check' ? 'checkbox' : 'radio'}
      accessibilityState={{ selected, checked: selected }}
      style={[styles.option, { backgroundColor: colors.paper }, selected && styles.optionSelected]}
    >
      <View style={styles.optionCopy}>
        <Text variant="body">
          {label}
        </Text>
        <Text variant="caption" color={colors.slate}>
          {hint}
        </Text>
      </View>
      {mode === 'check' ? (
        <Bump value={selected} playWhen={selected} peak={1.25} style={[styles.check, { borderColor: colors.hairline }, selected && styles.checkOn]}>
          {selected ? (
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path
                d="M5 13l4 4L19 7"
                fill="none"
                stroke={colors.paper}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : null}
        </Bump>
      ) : (
        <Bump value={selected} playWhen={selected} peak={1.25} style={[styles.radio, { borderColor: colors.hairline }, selected && styles.radioOn]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </Bump>
      )}
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
    marginTop: space.sm,
  },
  groups: {
    gap: space.lg,
    paddingBottom: space.lg,
  },
  group: {
    gap: space.sm,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  options: {
    gap: space.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
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
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    borderColor: palette.forestDeep,
    backgroundColor: palette.forestDeep,
  },
});
