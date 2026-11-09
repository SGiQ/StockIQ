import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import * as haptics from '@/lib/haptics';
import { BadgeMedallion } from '@/components/BadgeMedallion';
import { Confetti } from '@/components/Confetti';
import { CardSurface, PillButton, RichTextView, Screen, Text } from '@/components/primitives';
import { buildAssessment, type BadgeDef } from '@/features/achievements';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

const QUESTION_COUNT = 8;

type Phase = 'intro' | 'quiz' | 'result';

/**
 * The Market Readiness check.
 *
 * Retakeable, drawn from real lesson questions, and scored as a "best of" so a
 * shaky retry never lowers a proven result. It is framed throughout as a
 * knowledge check, not a trading clearance — the score it feeds is educational.
 */
export default function AssessmentScreen() {
  const colors = useColors();
  const router = useRouter();
  const recordAssessment = useAppStore((s) => s.recordAssessment);

  const questions = useMemo(() => buildAssessment(QUESTION_COUNT), []);
  const total = questions.length;

  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState<BadgeDef[]>([]);

  const current = questions[index];

  const answer = useCallback(
    (optionId: string, correct: boolean) => {
      if (revealed) return;
      setSelectedId(optionId);
      setRevealed(true);
      if (correct) {
        haptics.success();
        setCorrectCount((c) => c + 1);
      } else {
        haptics.failure();
      }
    },
    [revealed],
  );

  const advance = useCallback(async () => {
    if (index + 1 < total) {
      setIndex((i) => i + 1);
      setSelectedId(null);
      setRevealed(false);
      return;
    }
    // Last question answered — finalise. correctCount already includes it.
    const score = total > 0 ? correctCount / total : 0;
    const newBadges = await recordAssessment(score);
    setEarnedBadges(newBadges);
    setPhase('result');
  }, [correctCount, index, recordAssessment, total]);

  const retake = useCallback(() => {
    router.replace('/assessment' as never);
  }, [router]);

  const exit = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

  return (
    <Screen tone="warm" edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={exit} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path
              d="M6 6l12 12M18 6L6 18"
              stroke={colors.ink}
              strokeWidth={2.4}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </Pressable>
        <Text variant="h3">
          Readiness check
        </Text>
      </View>

      {phase === 'quiz' && current ? (
        <QuizProgress index={index} total={total} />
      ) : null}

      {phase === 'intro' ? (
        <Intro total={total} onBegin={() => setPhase('quiz')} onCancel={exit} />
      ) : phase === 'result' ? (
        <Result
          correct={correctCount}
          total={total}
          earnedBadges={earnedBadges}
          onRetake={retake}
          onDone={exit}
        />
      ) : current ? (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.topicTag}>
            <Text variant="label" color={palette.forestDeep} uppercase>
              {current.courseTitle}
            </Text>
          </View>

          <RichTextView value={current.prompt} variant="h2" color={colors.ink} />

          <View style={styles.options}>
            {current.options.map((option) => {
              const isChosen = selectedId === option.id;
              const state = !revealed
                ? 'idle'
                : option.correct
                  ? 'correct'
                  : isChosen
                    ? 'wrong'
                    : 'idle';
              return (
                <Pressable
                  key={option.id}
                  onPress={() => answer(option.id, option.correct)}
                  accessibilityRole="button"
                  disabled={revealed}
                  style={[
                    styles.option,
                    { backgroundColor: colors.paper, borderColor: colors.hairline },
                    state === 'correct' && styles.optionCorrect,
                    state === 'wrong' && styles.optionWrong,
                  ]}
                >
                  <Text variant="body" style={styles.optionLabel}>
                    {option.label}
                  </Text>
                  {state === 'correct' ? <Mark kind="check" /> : null}
                  {state === 'wrong' ? <Mark kind="cross" /> : null}
                </Pressable>
              );
            })}
          </View>

          {revealed ? (
            <CardSurface style={{ backgroundColor: colors.paperWarm }}>
              <RichTextView value={current.explanation} variant="caption" color={colors.slate} />
            </CardSurface>
          ) : null}

          {revealed ? (
            <PillButton
              label={index + 1 < total ? 'Next question' : 'See result'}
              variant="dark"
              onPress={() => void advance()}
            />
          ) : null}
        </ScrollView>
      ) : (
        <View style={styles.body}>
          <Text variant="body" color={colors.slate} align="center">
            No questions are available yet.
          </Text>
          <PillButton label="Back" variant="dark" fullWidth={false} onPress={exit} />
        </View>
      )}
    </Screen>
  );
}

function QuizProgress({ index, total }: { index: number; total: number }) {
  const colors = useColors();
  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressTrack, { backgroundColor: colors.hairline }]}>
        <View style={[styles.progressFill, { width: `${((index + 1) / total) * 100}%` }]} />
      </View>
      <Text variant="caption" color={colors.slate}>
        {`Question ${index + 1} of ${total}`}
      </Text>
    </View>
  );
}

function Intro({ total, onBegin, onCancel }: { total: number; onBegin: () => void; onCancel: () => void }) {
  const colors = useColors();
  return (
    <ScrollView contentContainerStyle={styles.introBody} showsVerticalScrollIndicator={false}>
      <Text variant="display">
        Check your readiness.
      </Text>
      <Text variant="body" color={colors.slate}>
        {`${total} questions drawn from across the five topics. Answer honestly — this measures how much of the curriculum has landed, and your best score feeds your Market Readiness.`}
      </Text>
      <CardSurface style={styles.introNote}>
        <Text variant="caption" color={palette.forestDeep}>
          This is a knowledge check, not financial advice or a signal to buy or sell anything.
        </Text>
      </CardSurface>
      <View style={styles.introActions}>
        <PillButton label="Begin" variant="dark" onPress={onBegin} />
        <PillButton label="Not now" variant="ghost" onPress={onCancel} />
      </View>
    </ScrollView>
  );
}

function Result({
  correct,
  total,
  earnedBadges,
  onRetake,
  onDone,
}: {
  correct: number;
  total: number;
  earnedBadges: BadgeDef[];
  onRetake: () => void;
  onDone: () => void;
}) {
  const colors = useColors();
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const strong = pct >= 80;
  const fair = pct >= 50;
  const message = strong
    ? 'Strong — the fundamentals are landing.'
    : fair
      ? 'Solid start. A few topics left to firm up.'
      : 'Worth another pass through the lessons — then try again.';

  return (
    <View style={styles.resultWrap}>
    {/* A pass on the readiness check is a learning milestone — the one kind
        of moment the brand lets celebrate. Nothing like this ever fires on a
        trade. */}
    <Confetti play={strong} />
    <ScrollView contentContainerStyle={styles.resultBody} showsVerticalScrollIndicator={false}>
      <View style={[styles.scoreDisc, { backgroundColor: strong ? palette.emerald : palette.azure }]}>
        <Text variant="display" color={colors.paper}>
          {`${pct}%`}
        </Text>
      </View>
      <Text variant="h1" align="center">
        {`${correct} of ${total} correct`}
      </Text>
      <Text variant="body" color={colors.slate} align="center">
        {message}
      </Text>
      <Text variant="caption" color={colors.slateLight} align="center">
        Your Market Readiness keeps your best result — this attempt only helps it.
      </Text>

      {earnedBadges.length > 0 ? (
        <CardSurface style={styles.badgeUnlock}>
          <Text variant="label" color={palette.forestDeep} uppercase>
            {earnedBadges.length === 1 ? 'Badge unlocked' : 'Badges unlocked'}
          </Text>
          <View style={styles.badgeRow}>
            {earnedBadges.map((badge) => (
              <BadgeMedallion key={badge.id} badge={badge} earned size={52} showLabel celebrate />
            ))}
          </View>
        </CardSurface>
      ) : null}

      <View style={styles.introActions}>
        <PillButton label="Done" variant="dark" onPress={onDone} />
        <PillButton label="Retake" variant="ghost" onPress={onRetake} />
      </View>
    </ScrollView>
    </View>
  );
}

function Mark({ kind }: { kind: 'check' | 'cross' }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d={kind === 'check' ? 'M4.5 12.5l5 5 10-11' : 'M6 6l12 12M18 6L6 18'}
        stroke={kind === 'check' ? palette.emeraldDeep : palette.danger}
        strokeWidth={2.6}
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
  progressWrap: { paddingHorizontal: space.lg, gap: space.xs, paddingBottom: space.sm },
  progressTrack: {
    height: 7,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: palette.mint },
  body: { padding: space.lg, paddingBottom: space.xxl, gap: space.lg },
  topicTag: {
    alignSelf: 'flex-start',
    backgroundColor: palette.mintSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  options: { gap: space.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 2,
  },
  optionCorrect: { borderColor: palette.emerald, backgroundColor: 'rgba(74,222,128,0.12)' },
  optionWrong: { borderColor: palette.danger, backgroundColor: 'rgba(220,38,38,0.08)' },
  optionLabel: { flex: 1 },
  explanation: {},
  introBody: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  introNote: { padding: space.md, backgroundColor: palette.mintSoft },
  introActions: { gap: space.sm, marginTop: space.md },
  resultWrap: { flex: 1 },
  resultBody: {
    padding: space.lg,
    paddingBottom: space.xxl,
    gap: space.md,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  scoreDisc: {
    width: 132,
    height: 132,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeUnlock: { alignSelf: 'stretch', gap: space.sm, alignItems: 'center' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md },
});
