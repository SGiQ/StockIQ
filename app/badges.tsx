import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { BadgeMedallion } from '@/components/BadgeMedallion';
import { CardSurface, Screen, Text } from '@/components/primitives';
import { BADGES } from '@/features/achievements';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';

/**
 * The full achievement wall — earned badges first, then everything still to
 * earn with the exact criteria, so it reads as a goal board rather than a
 * trophy case you can't add to.
 */
export default function BadgesScreen() {
  const router = useRouter();
  const badges = useAppStore((s) => s.badges);
  const refreshAchievements = useAppStore((s) => s.refreshAchievements);

  // Catch anything earned via non-lesson actions (saves, assessment) since the
  // last time the store evaluated.
  useEffect(() => {
    void refreshAchievements();
  }, [refreshAchievements]);

  const earnedAt = useMemo(() => new Map(badges.map((b) => [b.id, b.unlockedAt])), [badges]);

  const rows = useMemo(() => {
    return [...BADGES]
      .map((def) => ({ def, unlockedAt: earnedAt.get(def.id) ?? null }))
      .sort((a, b) => {
        // Earned first (newest earned on top), then locked in catalog order.
        if (a.unlockedAt && b.unlockedAt) return b.unlockedAt - a.unlockedAt;
        if (a.unlockedAt) return -1;
        if (b.unlockedAt) return 1;
        return 0;
      });
  }, [earnedAt]);

  const earnedCount = badges.length;
  const total = BADGES.length;

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
            <Path
              d="M15 5l-7 7 7 7"
              stroke={palette.ink}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Pressable>
        <Text variant="h3" color={palette.ink}>
          Badges
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <CardSurface tone="forestDeep" style={styles.summary}>
          <Text variant="label" color={palette.mintSoft} uppercase>
            Achievements
          </Text>
          <Text variant="display" color={palette.paper}>
            {`${earnedCount} of ${total}`}
          </Text>
          <View style={styles.summaryTrack}>
            <View
              style={[styles.summaryFill, { width: `${total > 0 ? (earnedCount / total) * 100 : 0}%` }]}
            />
          </View>
        </CardSurface>

        {rows.map(({ def, unlockedAt }) => {
          const earned = unlockedAt !== null;
          return (
            <CardSurface key={def.id} style={styles.row}>
              <BadgeMedallion badge={def} earned={earned} size={54} />
              <View style={styles.rowCopy}>
                <Text variant="body" color={earned ? palette.ink : palette.slate}>
                  {def.name}
                </Text>
                <Text variant="caption" color={palette.slate}>
                  {def.description}
                </Text>
              </View>
              {earned ? (
                <View style={styles.earnedTag}>
                  <Text variant="label" color={palette.forestDeep} uppercase>
                    Earned
                  </Text>
                </View>
              ) : (
                <LockIcon />
              )}
            </CardSurface>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function LockIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3"
        stroke={palette.slateLight}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  body: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  summary: { gap: space.xs, alignItems: 'flex-start' },
  summaryTrack: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    marginTop: space.xs,
  },
  summaryFill: { height: '100%', borderRadius: radius.pill, backgroundColor: palette.mint },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowCopy: { flex: 1, gap: 2 },
  earnedTag: {
    backgroundColor: palette.mintSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
});
