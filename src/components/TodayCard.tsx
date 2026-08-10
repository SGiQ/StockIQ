import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { CardSurface, Text } from '@/components/primitives';
import { GemIcon } from '@/components/Currency';
import { GEMS_DAILY_QUEST } from '@/features/gems';
import {
  dailyStats,
  dailyXpGoal,
  questProgress,
  questsForDay,
  questClaimKey,
} from '@/features/daily';
import { useAppStore } from '@/store/slices/useAppStore';
import { toDayISO } from '@/lib/dates';
import { palette, radius, space } from '@/theme/tokens';

/** A ring that fills toward the day's XP goal. */
function GoalRing({ value, goal, size = 68 }: { value: number; goal: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={r} stroke={palette.hairline} strokeWidth={stroke} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={pct >= 1 ? palette.emerald : palette.mint}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.ringLabel}>
        <Text variant="label" color={palette.ink}>
          {String(value)}
        </Text>
      </View>
    </View>
  );
}

/**
 * The daily card: an XP-goal ring plus the day's three quests.
 *
 * Everything is derived from the progress rows and the date — the ring reads
 * XP earned today against the pace chosen in onboarding, and the quests read the
 * same daily stats. Rewards are paid out by the store the moment a lesson meets
 * a quest, so a checked quest here has already added its gems.
 */
export function TodayCard() {
  const progress = useAppStore((s) => s.progress);
  const goalMinutes = useAppStore((s) => s.profile?.dailyGoalMinutes ?? null);
  const claims = useAppStore((s) => s.profile?.questClaims ?? []);

  const today = toDayISO();
  const stats = useMemo(() => dailyStats(progress, today), [progress, today]);
  const quests = useMemo(() => questsForDay(today), [today]);
  const goal = dailyXpGoal(goalMinutes);
  const claimed = new Set(claims);

  return (
    <CardSurface style={styles.card}>
      <View style={styles.top}>
        <GoalRing value={stats.xp} goal={goal} />
        <View style={styles.topText}>
          <Text variant="h3" color={palette.ink}>
            {stats.xp >= goal ? 'Daily goal met' : 'Today'}
          </Text>
          <Text variant="caption" color={palette.slate}>
            {`${stats.xp} / ${goal} XP${stats.xp >= goal ? ' — nice.' : ' today'}`}
          </Text>
        </View>
      </View>

      <View style={styles.quests}>
        {quests.map((quest) => {
          const value = questProgress(quest, stats);
          const done = claimed.has(questClaimKey(today, quest.id)) || value >= quest.target;
          return (
            <View key={quest.id} style={styles.quest}>
              <View style={[styles.check, done && styles.checkOn]}>
                {done ? (
                  <Text variant="label" color={palette.paper}>
                    ✓
                  </Text>
                ) : null}
              </View>
              <View style={styles.questBody}>
                <Text variant="bodySm" color={palette.ink}>
                  {quest.title}
                </Text>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${Math.max(4, (value / quest.target) * 100)}%` },
                      done && styles.fillDone,
                    ]}
                  />
                </View>
              </View>
              <View style={styles.reward}>
                <GemIcon size={13} />
                <Text variant="caption" color={done ? palette.emerald : palette.azure}>
                  {`+${GEMS_DAILY_QUEST}`}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </CardSurface>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  topText: { flex: 1, gap: space.xxs },
  ringLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quests: { gap: space.sm },
  quest: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  check: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { borderColor: palette.emerald, backgroundColor: palette.emerald },
  questBody: { flex: 1, gap: space.xxs },
  track: { height: 5, borderRadius: radius.pill, backgroundColor: palette.hairline, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: palette.mint },
  fillDone: { backgroundColor: palette.emerald },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
