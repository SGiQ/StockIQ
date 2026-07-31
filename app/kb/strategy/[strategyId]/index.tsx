import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getLessonByPath, getStrategy } from '@/content/registry';
import type { EntityRef, LessonPath } from '@/content/types';
import { ArtView } from '@/components/art/ArtView';
import { Glyph } from '@/components/art/Glyph';
import { CardSurface, Chip, PillButton, RichTextView, Screen, Text } from '@/components/primitives';
import { BulletBlock, EntityDetail, EntityHeader } from '@/components/kb/EntityScaffold';
import { RefChips, bookRefs, traderRefs } from '@/components/kb/RefChips';
import { courseNodeStatuses, useAppStore } from '@/store/slices/useAppStore';
import { progressId } from '@/store';
import { palette, radius, space } from '@/theme/tokens';

const TIMEFRAME_LABEL = {
  intraday: 'Intraday',
  swing: 'Swing',
  position: 'Position',
  'long-term': 'Long term',
} as const;

export default function StrategyDetail() {
  const { strategyId } = useLocalSearchParams<{ strategyId: string }>();
  const router = useRouter();
  const strategy = getStrategy(strategyId);
  const progressMap = useAppStore((s) => s.progress);

  const gates = useMemo(() => {
    if (!strategy) return [];
    return strategy.prerequisiteLessons.map((path) => {
      const [courseId, lessonId] = path.split('/');
      return {
        path: path as LessonPath,
        courseId,
        lessonId,
        title: getLessonByPath(path as LessonPath)?.title ?? lessonId,
        done: progressMap[progressId(courseId, lessonId)]?.status === 'completed',
      };
    });
  }, [strategy, progressMap]);

  if (!strategy) {
    return (
      <Screen tone="warm">
        <View style={styles.centre}>
          <Text variant="h2">Strategy not found</Text>
        </View>
      </Screen>
    );
  }

  const unlocked = gates.every((g) => g.done);
  const entityRef = `strategy:${strategy.id}` as EntityRef;

  // The gate is enforced here rather than by hiding the row in the hub: the
  // learner should be able to see that a strategy exists and exactly what
  // stands between them and it.
  if (!unlocked) {
    return <LockedStrategy name={strategy.name} entityRef={entityRef} gates={gates} />;
  }

  return (
    <EntityDetail
      eyebrow={`${TIMEFRAME_LABEL[strategy.timeframe]} · ${strategy.family}`}
      title={strategy.name}
      entityRef={entityRef}
      oneLiner={strategy.oneLiner}
      showAdviceNotice
    >
      <View style={styles.meta}>
        <Chip label={TIMEFRAME_LABEL[strategy.timeframe]} tone="mint" />
        <Chip label={`Risk ${strategy.riskLevel} / 5`} tone={strategy.riskLevel >= 4 ? 'flame' : 'neutral'} />
      </View>

      <RichTextView value={strategy.thesis} variant="body" color={palette.inkSoft} linksEnabled />

      {/*
        Directly under the thesis and above the rules: the rules are reference
        material, the guide is the part that teaches. Absent when a strategy
        has no deck — `guideCards` is optional, so a page can ship before it.
      */}
      {strategy.guideCards?.length ? (
        <View style={styles.guide}>
          <PillButton
            label={`Play the guide · ${strategy.guideCards.length} cards`}
            variant="dark"
            onPress={() => router.push(`/kb/strategy/${strategy.id}/guide` as never)}
          />
        </View>
      ) : null}

      {strategy.illustrativeChart && (
        <View style={styles.chart}>
          <ArtView
            spec={{ kind: 'chart', spec: strategy.illustrativeChart }}
            aspectRatio={1.15}
          />
        </View>
      )}

      <BulletBlock title="How practitioners enter" items={strategy.entryRules} />
      <BulletBlock title="How they exit" items={strategy.exitRules} />
      <BulletBlock title="Risk management" items={strategy.riskManagement} tone={palette.flame} />

      <RefChips title="Practised by" refs={traderRefs(strategy.practicedBy)} />
      <RefChips title="Further reading" refs={bookRefs(strategy.furtherReading)} />
    </EntityDetail>
  );
}

function LockedStrategy({
  name,
  entityRef,
  gates,
}: {
  name: string;
  entityRef: EntityRef;
  gates: Array<{ path: LessonPath; courseId: string; lessonId: string; title: string; done: boolean }>;
}) {
  const router = useRouter();
  const remaining = gates.filter((g) => !g.done).length;

  return (
    <Screen tone="warm">
      <EntityHeader eyebrow="Locked strategy" title={name} entityRef={entityRef} />

      <ScrollView contentContainerStyle={styles.lockedBody} showsVerticalScrollIndicator={false}>
        <View style={styles.lockBadge}>
          <Glyph name="lock" size={38} color={palette.slate} />
        </View>

        <Text variant="h2" color={palette.ink} align="center">
          Finish the groundwork first.
        </Text>
        <Text variant="body" color={palette.slate} align="center">
          {`${name} builds on ${gates.length} lesson${gates.length === 1 ? '' : 's'}. ${remaining} left to go.`}
        </Text>

        <View style={styles.gateList}>
          {gates.map((gate) => (
            <Pressable
              key={gate.path}
              onPress={() =>
                router.push(`/lesson/${gate.courseId}/${gate.lessonId}` as never)
              }
              accessibilityRole="button"
              accessibilityLabel={gate.title}
            >
              <CardSurface style={styles.gate}>
                <View style={[styles.gateMark, gate.done && styles.gateMarkDone]}>
                  <Glyph
                    name={gate.done ? 'check' : 'arrow-up'}
                    size={16}
                    color={gate.done ? palette.paper : palette.slate}
                    strokeWidth={2.8}
                  />
                </View>
                <View style={styles.gateText}>
                  <Text variant="bodyEm" color={palette.ink} numberOfLines={2}>
                    {gate.title}
                  </Text>
                  <Text variant="caption" color={palette.slate}>
                    {gate.done ? 'Completed' : 'Tap to start this lesson'}
                  </Text>
                </View>
              </CardSurface>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guide: {
    marginTop: space.sm,
  },
  meta: {
    flexDirection: 'row',
    gap: space.sm,
  },
  chart: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  lockedBody: {
    padding: space.lg,
    gap: space.md,
    alignItems: 'center',
    paddingBottom: space.xxl,
  },
  lockBadge: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    backgroundColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  gateList: {
    alignSelf: 'stretch',
    gap: space.sm,
    marginTop: space.lg,
  },
  gate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  gateMark: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateMarkDone: {
    backgroundColor: palette.emerald,
  },
  gateText: {
    flex: 1,
    gap: space.xxs,
  },
});
