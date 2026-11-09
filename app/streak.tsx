import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { AnimatedNumber, Bump, CardSurface, FadeUp, PillButton, Screen, Text } from '@/components/primitives';
import { GemIcon } from '@/components/Currency';
import { MAX_FREEZES } from '@/features/streak';
import { STREAK_FREEZE_COST } from '@/features/gems';
import { useAppStore } from '@/store/slices/useAppStore';
import { toDayISO } from '@/lib/dates';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** The current calendar month as weeks of DayISO cells (null pads the edges). */
function useMonthGrid(): { title: string; weeks: (string | null)[][] } {
  return useMemo(() => {
    const nowDate = new Date();
    const year = nowDate.getFullYear();
    const month = nowDate.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lead = first.getDay();

    const cells: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(toDayISO(new Date(year, month, d)));
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    const title = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return { title, weeks };
  }, []);
}

export default function StreakScreen() {
  const colors = useColors();
  const router = useRouter();
  const streak = useAppStore((s) => s.streak);
  const gemBalance = useAppStore((s) => s.gems?.balance ?? 0);
  const buyStreakFreeze = useAppStore((s) => s.buyStreakFreeze);

  const active = useMemo(() => new Set(streak?.activeDays ?? []), [streak?.activeDays]);
  const today = toDayISO();
  const { title, weeks } = useMonthGrid();

  const freezes = streak?.freezes ?? 0;
  const atCap = freezes >= MAX_FREEZES;
  const canAfford = gemBalance >= STREAK_FREEZE_COST;

  return (
    <Screen tone="warm" edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path d="M15 5l-7 7 7 7" stroke={colors.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Pressable>
        <Text variant="h2">
          Streak
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <CardSurface style={styles.hero}>
          <AnimatedNumber
            from={0}
            value={streak?.currentStreak ?? 0}
            durationMs={700}
            format={(n) => String(Math.round(n))}
            variant="display"
            color={palette.flame}
          />
          <Text variant="body" color={colors.slate}>
            {streak && streak.currentStreak > 0
              ? `day streak · longest ${streak.longestStreak}`
              : 'Finish a lesson today to start one.'}
          </Text>
        </CardSurface>

        <CardSurface style={styles.calendarCard}>
          <Text variant="h3">
            {title}
          </Text>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} variant="label" color={colors.slateLight} style={styles.weekday}>
                {d}
              </Text>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day, di) => (
                <View key={di} style={styles.cell}>
                  {day ? (
                    // Cells cascade in row by row — a short stagger so the
                    // month reads as filling up rather than popping.
                    <FadeUp delayMs={(wi * 7 + di) * 14} distance={6} durationMs={220}>
                      <View
                        style={[
                          styles.dayDot,
                          active.has(day) && styles.dayActive,
                          day === today && styles.dayToday,
                        ]}
                      >
                        <Text
                          variant="caption"
                          color={active.has(day) ? colors.paper : colors.slate}
                        >
                          {String(Number(day.slice(-2)))}
                        </Text>
                      </View>
                    </FadeUp>
                  ) : null}
                </View>
              ))}
            </View>
          ))}
        </CardSurface>

        <CardSurface style={styles.freezeCard}>
          <View style={styles.freezeHead}>
            <Text variant="h3">
              Streak freezes
            </Text>
            <Bump value={freezes} peak={1.3}>
              <Text variant="label" color={palette.azure} uppercase>
                {`${freezes} / ${MAX_FREEZES}`}
              </Text>
            </Bump>
          </View>
          <Text variant="caption" color={colors.slate}>
            A freeze protects your streak for one missed day — it's spent
            automatically the day you skip. Keep up to {MAX_FREEZES} on hand.
          </Text>
          <PillButton
            label={
              atCap
                ? 'Freezes full'
                : canAfford
                  ? `Buy a freeze · ${STREAK_FREEZE_COST} gems`
                  : `Need ${STREAK_FREEZE_COST} gems`
            }
            variant="dark"
            disabled={atCap || !canAfford}
            onPress={() => void buyStreakFreeze()}
          />
          <View style={styles.gemRow}>
            <GemIcon size={14} />
            <Text variant="caption" color={colors.slate}>
              {`You have ${gemBalance} gems`}
            </Text>
          </View>
        </CardSurface>
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
  body: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl },
  hero: { alignItems: 'center', gap: space.xs, paddingVertical: space.lg },
  calendarCard: { gap: space.sm },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  cell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayActive: { backgroundColor: palette.flame },
  dayToday: { borderColor: palette.forestDeep },
  freezeCard: { gap: space.sm },
  freezeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gemRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
