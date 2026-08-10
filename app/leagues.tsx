import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { CardSurface, Screen, Text } from '@/components/primitives';
import {
  COHORT_SIZE,
  PROMOTE_TOP,
  RELEGATE_BOTTOM,
  buildStandings,
  currentWeekXp,
  daysLeftInWeek,
  type Outcome,
} from '@/features/leagues';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';

const outcomeColor = (o: Outcome) =>
  o === 'promote' ? palette.emeraldDeep : o === 'relegate' ? palette.danger : palette.slateLight;

export default function LeaguesScreen() {
  const router = useRouter();
  const progress = useAppStore((s) => s.progress);

  const now = Date.now();
  const youXp = useMemo(() => currentWeekXp(progress, now), [progress, now]);
  const { entries, yourRank } = useMemo(() => buildStandings(youXp, now), [youXp, now]);
  const daysLeft = daysLeftInWeek(now);

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
            <Path d="M15 5l-7 7 7 7" stroke={palette.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Pressable>
        <Text variant="h2" color={palette.ink}>
          League
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <CardSurface tone="forestDeep" style={styles.summary}>
          <Text variant="label" color={palette.mintSoft} uppercase>
            Bronze league
          </Text>
          <Text variant="display" color={palette.paper}>
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

        <View style={styles.list}>
          {entries.map((e, i) => (
            <View key={`${e.name}-${i}`}>
              {i === PROMOTE_TOP ? <View style={[styles.divider, { backgroundColor: palette.emeraldDeep }]} /> : null}
              {i === COHORT_SIZE - RELEGATE_BOTTOM ? (
                <View style={[styles.divider, { backgroundColor: palette.danger }]} />
              ) : null}
              <View style={[styles.row, e.isYou && styles.youRow]}>
                <Text variant="bodyEm" color={palette.slate} style={styles.rank}>
                  {e.rank}
                </Text>
                <Text variant="bodyEm" color={e.isYou ? palette.violetInk : palette.ink} style={styles.name}>
                  {e.isYou ? 'You' : e.name}
                </Text>
                <View style={[styles.dot, { backgroundColor: outcomeColor(e.outcome) }]} />
                <Text variant="bodyEm" color={palette.ink} style={styles.xp}>
                  {`${e.xp} XP`}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text variant="caption" color={palette.slateLight} align="center" style={styles.note}>
          Preview: you're competing against a sample cohort until leagues go live. Your weekly XP is real — earn more to climb.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.sm },
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  summary: { alignItems: 'center', gap: space.xxs, paddingVertical: space.lg },
  legend: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.xs },
  list: { backgroundColor: palette.paper, borderRadius: radius.lg, overflow: 'hidden' },
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
