import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import Animated, { FadeIn, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { Breathe, CardSurface, Screen, Text } from '@/components/primitives';
import { PROMOTE_TOP, RELEGATE_BOTTOM, currentWeekXp, daysLeftInWeek, type Outcome } from '@/features/leagues';
import { fetchLeagueStandings, simulatedView, type LeagueView } from '@/services/leagues';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

export default function LeaguesScreen() {
  const router = useRouter();
  const colors = useColors();
  const progress = useAppStore((s) => s.progress);

  const outcomeColor = (o: Outcome) =>
    o === 'promote' ? palette.emeraldDeep : o === 'relegate' ? palette.danger : colors.slateLight;

  const now = Date.now();
  const youXp = useMemo(() => currentWeekXp(progress, now), [progress, now]);
  const daysLeft = daysLeftInWeek(now);

  // Start on the instant sim, then replace with the real cohort if the server
  // has the endpoint (otherwise the sim stands).
  const [view, setView] = useState<LeagueView>(() => simulatedView(youXp, now));
  useEffect(() => {
    let cancelled = false;
    void fetchLeagueStandings(youXp, now).then((v) => {
      if (!cancelled) setView(v);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youXp]);
  const { entries, yourRank, tier } = view;

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
          League
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <CardSurface tone="forestDeep" style={styles.summary}>
          <Text variant="label" color={palette.mintSoft} uppercase>
            {`${tier} league`}
          </Text>
          <Text variant="display" color={colors.paper}>
            {`#${yourRank}`}
          </Text>
          <Text variant="caption" color={palette.mintSoft}>
            {`${youXp} XP this week · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
          </Text>
        </CardSurface>

        <View style={styles.legend}>
          <Text variant="caption" color={palette.emeraldDeep}>
            {`Top ${PROMOTE_TOP} promote`}
          </Text>
          <Text variant="caption" color={palette.danger}>
            {`Bottom ${RELEGATE_BOTTOM} relegate`}
          </Text>
        </View>

        <View style={[styles.list, { backgroundColor: colors.paper }]}>
          {/* Rows are keyed by competitor, so when the live cohort replaces
              the sample (or ranks shift) each row slides to its new place
              instead of the list re-painting. */}
          {entries.map((e, i) => (
            <Animated.View
              key={e.isYou ? 'you' : e.name}
              layout={LinearTransition.springify().damping(18).reduceMotion(ReduceMotion.System)}
              entering={FadeIn.delay(Math.min(i, 12) * 30).duration(260).reduceMotion(ReduceMotion.System)}
            >
              {i === PROMOTE_TOP && entries.length > PROMOTE_TOP + RELEGATE_BOTTOM ? (
                <View style={[styles.divider, { backgroundColor: palette.emeraldDeep }]} />
              ) : null}
              {i === entries.length - RELEGATE_BOTTOM && entries.length > PROMOTE_TOP + RELEGATE_BOTTOM ? (
                <View style={[styles.divider, { backgroundColor: palette.danger }]} />
              ) : null}
              <View style={[styles.row, e.isYou && styles.youRow]}>
                {i < PROMOTE_TOP ? (
                  <Breathe style={[StyleSheet.absoluteFill, { backgroundColor: palette.emeraldDeep }]} />
                ) : null}
                <Text variant="bodyEm" color={colors.slate} style={styles.rank}>
                  {e.rank}
                </Text>
                <Text variant="bodyEm" color={e.isYou ? palette.violetInk : colors.ink} style={styles.name}>
                  {e.isYou ? 'You' : e.name}
                </Text>
                <View style={[styles.dot, { backgroundColor: outcomeColor(e.outcome) }]} />
                <Text variant="bodyEm" style={styles.xp}>
                  {`${e.xp} XP`}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {!view.live ? (
          <Text variant="caption" color={colors.slateLight} align="center" style={styles.note}>
            Preview: you're competing against a sample cohort until leagues go live. Your weekly XP is real — earn more to climb.
          </Text>
        ) : (
          <Text variant="caption" color={colors.slateLight} align="center" style={styles.note}>
            Top finishers promote, bottom finishers relegate when the week ends. Your weekly XP is real.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.sm },
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  summary: { alignItems: 'center', gap: space.xxs, paddingVertical: space.lg },
  legend: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.xs },
  list: { borderRadius: radius.lg, overflow: 'hidden' },
  divider: { height: 2, marginVertical: space.xs, marginHorizontal: space.md, borderRadius: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
  },
  youRow: { backgroundColor: palette.violetSoft },
  rank: { width: 28 },
  name: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  xp: { width: 72, textAlign: 'right' },
  note: { marginTop: space.sm },
});
