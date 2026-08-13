import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PillButton, Screen, Text } from '@/components/primitives';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, shadow, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/**
 * The commitment step.
 *
 * Asking for a daily pace up front is a small, deliberate act of investment —
 * the learner sets a promise to themselves before the first lesson, which is
 * what a streak then holds them to. It also gives the streak and future
 * reminders a target to aim at. Everyone can change it later in settings.
 */

const GOALS: { minutes: number; label: string; hint: string; recommended?: boolean }[] = [
  { minutes: 3, label: 'Casual', hint: '3 min a day' },
  { minutes: 5, label: 'Steady', hint: '5 min a day', recommended: true },
  { minutes: 10, label: 'Committed', hint: '10 min a day' },
  { minutes: 15, label: 'Serious', hint: '15 min a day' },
];

export default function DailyGoal() {
  const colors = useColors();
  const router = useRouter();
  const setDailyGoal = useAppStore((s) => s.setDailyGoal);
  // Default to the recommended pace, so Continue is live on arrival.
  const [minutes, setMinutes] = useState<number>(5);

  return (
    <Screen tone="forest">
      <View style={styles.content}>
        <OnboardingProgress step={2} total={4} />

        <View style={styles.header}>
          <Text variant="display" color={colors.paper}>
            Set a daily goal.
          </Text>
          <Text variant="body" color={palette.mintSoft}>
            A little every day beats a lot once in a while. We'll help you keep
            the streak.
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {GOALS.map((goal) => {
            const selected = minutes === goal.minutes;
            return (
              <Pressable
                key={goal.minutes}
                onPress={() => setMinutes(goal.minutes)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.option, { backgroundColor: colors.paper }, selected && styles.optionSelected]}
              >
                <View style={styles.optionCopy}>
                  <View style={styles.labelRow}>
                    <Text variant="body">
                      {goal.label}
                    </Text>
                    {goal.recommended ? (
                      <View style={styles.tag}>
                        <Text variant="label" color={palette.forestDeep} uppercase>
                          Recommended
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text variant="caption" color={colors.slate}>
                    {goal.hint}
                  </Text>
                </View>
                <View style={[styles.radio, { borderColor: colors.hairline }, selected && styles.radioOn]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <PillButton
          label="Continue"
          variant="light"
          onPress={async () => {
            await setDailyGoal(minutes);
            router.push('/(onboarding)/choose-course');
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
    marginTop: space.sm,
  },
  list: {
    gap: space.sm,
    paddingBottom: space.lg,
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  tag: {
    backgroundColor: palette.mintSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
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
});
