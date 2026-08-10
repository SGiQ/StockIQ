import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { BinaryChoiceCardView } from '@/components/cards/BinaryChoiceCardView';
import { FillBlankCardView } from '@/components/cards/FillBlankCardView';
import { Glyph } from '@/components/art/Glyph';
import { CardSurface, PillButton, Screen, Text } from '@/components/primitives';
import { GemIcon } from '@/components/Currency';
import { HeartIcon } from '@/components/player/HeartPips';
import { initialStateFor, type CardUiState } from '@/components/player/cardState';
import { buildReviewQueue } from '@/features/review';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';

/**
 * Spaced review.
 *
 * Resurfaces the interactive cards a learner has seen, prioritising the ones
 * that are due, and reschedules each on the answer. This is the loop that turns
 * "I finished the lessons" into "I still know it" — and it is what keeps the
 * Market Readiness score honest over time.
 */
export default function ReviewScreen() {
  const router = useRouter();
  const reviews = useAppStore((s) => s.reviews);
  const recordReview = useAppStore((s) => s.recordReview);
  const finishReviewSession = useAppStore((s) => s.finishReviewSession);

  // Freeze the queue for the session so answering doesn't reshuffle it underfoot.
  const [queue] = useState(() => buildReviewQueue(reviews, Date.now()));
  const total = queue.length;

  const [index, setIndex] = useState(0);
  const [state, setState] = useState<CardUiState>(() =>
    total > 0 ? initialStateFor(queue[0].card) : { kind: 'passive' },
  );
  const [answered, setAnswered] = useState(false);
  const [remembered, setRemembered] = useState(0);
  const [done, setDone] = useState(total === 0);
  const [reward, setReward] = useState<{ gemsAwarded: number; heartRefilled: boolean } | null>(null);

  const current = queue[index];

  // Finishing a real session (not an empty "all caught up") pays out gems and
  // practices a heart back. Runs exactly once, when the session ends.
  const rewardedRef = useRef(false);
  useEffect(() => {
    if (done && total > 0 && !rewardedRef.current) {
      rewardedRef.current = true;
      void finishReviewSession().then(setReward);
    }
  }, [done, total, finishReviewSession]);

  const onAnswered = useCallback(
    (correct: boolean) => {
      if (answered) return;
      setAnswered(true);
      if (correct) setRemembered((n) => n + 1);
      void recordReview(current.review.courseId, current.review.lessonId, current.review.cardId, correct);
    },
    [answered, current, recordReview],
  );

  const next = useCallback(() => {
    if (index + 1 < total) {
      const ni = index + 1;
      setIndex(ni);
      setState(initialStateFor(queue[ni].card));
      setAnswered(false);
    } else {
      setDone(true);
    }
  }, [index, queue, total]);

  const exit = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  return (
    <Screen tone="warm" edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={exit} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path d="M6 6l12 12M18 6L6 18" stroke={palette.ink} strokeWidth={2.4} strokeLinecap="round" fill="none" />
          </Svg>
        </Pressable>
        <Text variant="h3" color={palette.ink}>
          Review
        </Text>
      </View>

      {!done && total > 0 ? (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((index + 1) / total) * 100}%` }]} />
          </View>
          <Text variant="caption" color={palette.slate}>{`Card ${index + 1} of ${total}`}</Text>
        </View>
      ) : null}

      {done ? (
        <Summary total={total} remembered={remembered} reward={reward} onDone={exit} />
      ) : current ? (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {current.card.type === 'binary_choice' ? (
            <BinaryChoiceCardView card={current.card} state={state} onChange={setState} onAnswered={onAnswered} />
          ) : current.card.type === 'fill_blank' ? (
            <FillBlankCardView card={current.card} state={state} onChange={setState} onAnswered={onAnswered} />
          ) : null}

          {answered ? (
            <PillButton
              label={index + 1 < total ? 'Next card' : 'Finish review'}
              variant="dark"
              onPress={next}
            />
          ) : null}
        </ScrollView>
      ) : null}
    </Screen>
  );
}

function Summary({
  total,
  remembered,
  reward,
  onDone,
}: {
  total: number;
  remembered: number;
  reward: { gemsAwarded: number; heartRefilled: boolean } | null;
  onDone: () => void;
}) {
  const allCaughtUp = total === 0;
  return (
    <ScrollView contentContainerStyle={styles.summary} showsVerticalScrollIndicator={false}>
      <View style={styles.summaryBadge}>
        <Glyph name={allCaughtUp ? 'check' : 'brain'} size={52} color={palette.paper} strokeWidth={2.2} />
      </View>
      <Text variant="display" color={palette.ink} align="center">
        {allCaughtUp ? 'All caught up.' : 'Review done.'}
      </Text>
      <Text variant="body" color={palette.slate} align="center">
        {allCaughtUp
          ? 'Nothing is due right now. Finish a lesson, or come back tomorrow — cards resurface on a spacing schedule so they actually stick.'
          : `You remembered ${remembered} of ${total}. The ones you missed will come back sooner; the rest, later. That spacing is what makes it durable.`}
      </Text>

      {reward ? (
        <View style={styles.rewardRow}>
          <View style={styles.rewardChip}>
            <GemIcon size={16} />
            <Text variant="label" color={palette.azure} uppercase>
              {`+${reward.gemsAwarded}`}
            </Text>
          </View>
          {reward.heartRefilled ? (
            <View style={styles.rewardChipHeart}>
              <HeartIcon size={16} color={palette.danger} />
              <Text variant="label" color={palette.danger} uppercase>
                +1
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.summaryActions}>
        <PillButton label="Done" variant="dark" onPress={onDone} />
      </View>
    </ScrollView>
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
  progressWrap: { paddingHorizontal: space.lg, gap: space.xs, paddingBottom: space.sm },
  progressTrack: { height: 7, borderRadius: radius.pill, backgroundColor: palette.hairline, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: palette.mint },
  body: { padding: space.lg, paddingBottom: space.xxl, gap: space.lg },
  summary: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    padding: space.lg,
    paddingBottom: space.xxl,
  },
  summaryBadge: {
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    backgroundColor: palette.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryActions: { alignSelf: 'stretch', gap: space.sm, marginTop: space.md },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs + 1,
    backgroundColor: palette.azureSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  rewardChipHeart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs + 1,
    backgroundColor: palette.dangerSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
});
