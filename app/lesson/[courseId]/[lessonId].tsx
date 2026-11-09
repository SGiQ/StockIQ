import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import * as haptics from '@/lib/haptics';
import { getCourse, getLesson, getNextLesson } from '@/content/registry';
import { LessonPlayer } from '@/components/player/LessonPlayer';
import { Glyph } from '@/components/art/Glyph';
import { BadgeMedallion } from '@/components/BadgeMedallion';
import { PillButton, Screen, Text } from '@/components/primitives';
import { StreakRow } from '@/components/StreakRow';
import { GemIcon } from '@/components/Currency';
import { SourceLinks } from '@/components/kb/SourceLinks';
import { progressId, reportId, savedCardId } from '@/store';
import { courseNodeStatuses, useAppStore, type LessonCompletion } from '@/store/slices/useAppStore';
import { clampResumeIndex, seedResumeStates } from '@/components/player/cardState';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';
import { trackTelemetry } from '@/services/telemetry';

export default function LessonScreen() {
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId: string }>();
  const router = useRouter();

  const lesson = getLesson(courseId, lessonId);

  const startLesson = useAppStore((s) => s.startLesson);
  const recordCardIndex = useAppStore((s) => s.recordCardIndex);
  const recordAttempt = useAppStore((s) => s.recordAttempt);
  const completeLesson = useAppStore((s) => s.completeLesson);
  const toggleSavedCard = useAppStore((s) => s.toggleSavedCard);
  /**
   * Subscribe to the saved *list*, not to the `isCardSaved` method.
   * The method reference is stable, so selecting it would never re-render
   * this screen and the heart would stay visually unsaved after a tap even
   * though the write had gone through.
   */
  const savedCards = useAppStore((s) => s.saved);
  const reports = useAppStore((s) => s.reports);
  const reportCard = useAppStore((s) => s.reportCard);
  const markTutorialSeen = useAppStore((s) => s.markTutorialSeen);
  const seenTutorial = useAppStore((s) => s.profile?.hasSeenPlayerTutorial ?? true);
  // Captured once so the overlay does not vanish mid-lesson the moment the
  // profile flag is written.
  const [showTutorial] = useState(!seenTutorial);

  const [completion, setCompletion] = useState<LessonCompletion | null>(null);
  /** The result could not be written; the learner can retry rather than lose it. */
  const [saveFailed, setSaveFailed] = useState(false);

  // The path gates lessons in order, but the route is reachable by URL. Derive
  // the same status the course screen shows and refuse a locked one here too.
  const progressMap = useAppStore((s) => s.progress);
  const locked = useMemo(
    () => courseNodeStatuses(progressMap, courseId)[lessonId] === 'locked',
    [progressMap, courseId, lessonId],
  );

  /**
   * Where to pick up. Captured once on mount from the store, so the writes
   * this screen makes as the learner moves on never feed back into the
   * deck's starting position. Only an open lesson resumes: a completed one
   * replays from the first card, and a fresh one has nothing to resume.
   */
  const [resume] = useState(() => {
    const existing = useAppStore.getState().progress[progressId(courseId, lessonId)];
    if (!lesson || existing?.status !== 'in_progress') return { index: 0, states: undefined };
    const index = clampResumeIndex(existing.lastCardIndex, lesson.cards.length);
    return { index, states: seedResumeStates(lesson.cards, existing.attempts, index) };
  });

  useEffect(() => {
    if (lesson && !locked) {
      void startLesson(courseId, lessonId);
      void trackTelemetry(
        'lesson_started',
        `${courseId}/${lessonId}`,
        resume.index > 0 ? `resumed:${resume.index}` : undefined,
      );
    }
  }, [courseId, lesson, lessonId, locked, resume.index, startLesson]);

  const handleComplete = useCallback(async () => {
    haptics.success();
    setSaveFailed(false);
    try {
      setCompletion(await completeLesson(courseId, lessonId));
      void trackTelemetry('lesson_completed', `${courseId}/${lessonId}`);
    } catch (error) {
      // A storage failure must not strand the learner on a finished deck with
      // no explanation: show it, offer a retry, and make sure we hear about it.
      Sentry.captureException(error, {
        tags: { context: 'lesson.complete' },
        extra: { courseId, lessonId },
      });
      setSaveFailed(true);
    }
  }, [completeLesson, courseId, lessonId]);

  const exit = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  if (!lesson) {
    return (
      <Screen tone="paper">
        <View style={styles.centre}>
          <Text variant="h2">Lesson not found</Text>
          <PillButton label="Go back" variant="dark" fullWidth={false} onPress={exit} />
        </View>
      </Screen>
    );
  }

  if (locked) {
    return (
      <Screen tone="paper">
        <View style={styles.centre}>
          <Glyph name="lock" size={48} color={palette.slate} strokeWidth={2} />
          <Text variant="h2" align="center">This lesson is locked</Text>
          <Text variant="body" color={palette.slate} align="center">
            Finish the lesson before it to unlock this one.
          </Text>
          <PillButton
            label="Back to course"
            variant="dark"
            fullWidth={false}
            onPress={() => router.replace(`/course/${courseId}` as never)}
          />
        </View>
      </Screen>
    );
  }

  if (saveFailed) {
    return (
      <Screen tone="paper">
        <View style={styles.centre} accessibilityRole="alert">
          <Text variant="h2" align="center">Couldn't save your result</Text>
          <Text variant="body" color={palette.slate} align="center">
            Your answers are still here. Try again to record the lesson.
          </Text>
          <PillButton label="Retry" variant="dark" fullWidth={false} onPress={() => void handleComplete()} />
          <PillButton label="Exit" variant="ghost" fullWidth={false} onPress={exit} />
        </View>
      </Screen>
    );
  }

  if (completion) {
    return (
      <CompletionScreen
        completion={completion}
        courseId={courseId}
        lessonId={lessonId}
        sources={lesson.sources}
        onExit={exit}
      />
    );
  }

  return (
    <LessonPlayer
      cards={lesson.cards}
      narrationDeckId={`lesson:${courseId}/${lessonId}`}
      onExit={exit}
      onComplete={handleComplete}
      onCardIndex={(index) => void recordCardIndex(courseId, lessonId, index)}
      initialIndex={resume.index}
      initialStates={resume.states}
      onAnswered={(cardId, correct) => {
        void recordAttempt(courseId, lessonId, { cardId, correct, at: Date.now() });
        void trackTelemetry('quiz_answered', `${courseId}/${lessonId}`, correct ? 'correct' : 'incorrect');
      }}
      isCardSaved={(cardId) =>
        savedCards.some((c) => c.id === savedCardId(courseId, lessonId, cardId))
      }
      onToggleSave={(cardId) => void toggleSavedCard(courseId, lessonId, cardId)}
      isCardReported={(cardId) =>
        reports.some((r) => r.id === reportId(courseId, lessonId, cardId))
      }
      onReport={(cardId, reason) => void reportCard(courseId, lessonId, cardId, reason)}
      askContext={{
        lessonTitle: lesson.title,
        courseTitle: getCourse(courseId)?.title ?? '',
      }}
      showTutorial={showTutorial}
      onTutorialDismissed={() => void markTutorialSeen()}
      enforceHearts
    />
  );
}

/**
 * The beat after the last card: XP, the streak row, and one obvious next
 * step. Worth its own screen rather than an alert — finishing should feel
 * like an event, which is most of why streaks work at all.
 */
function CompletionScreen({
  completion,
  courseId,
  lessonId,
  onExit,
  sources,
}: {
  completion: LessonCompletion;
  courseId: string;
  lessonId: string;
  onExit: () => void;
  sources: NonNullable<ReturnType<typeof getLesson>>['sources'];
}) {
  const router = useRouter();
  const colors = useColors();
  const next = getNextLesson(courseId, lessonId);

  return (
    <Screen tone="paper">
      <ScrollView contentContainerStyle={styles.completion} showsVerticalScrollIndicator={false}>
        <View style={styles.badge}>
          <Glyph
            name={completion.starred ? 'target' : 'check'}
            size={56}
            color={colors.paper}
            strokeWidth={2.4}
          />
        </View>

        <Text variant="display" align="center">
          {completion.starred ? 'Perfect run.' : 'Lesson complete.'}
        </Text>

        {completion.xpAwarded > 0 ? (
          <View style={styles.rewardRow}>
            <View style={styles.xpPill}>
              <Text variant="label" color={palette.forestDeep} uppercase>
                {`+${completion.xpAwarded} XP`}
              </Text>
            </View>
            {completion.gemsAwarded > 0 ? (
              <View style={styles.gemPill}>
                <GemIcon size={15} />
                <Text variant="label" color={palette.azure} uppercase>
                  {`+${completion.gemsAwarded}`}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <Text variant="caption" color={colors.slate} align="center">
            Reviewed — XP was already earned for this lesson.
          </Text>
        )}

        {/* Same component as the home screen, so the streak reads as one
            object the learner is maintaining rather than two widgets. */}
        <View style={styles.streakRow}>
          <StreakRow activeDays={completion.streak.activeDays} />
        </View>

        {completion.streakMilestone ? (
          <View style={styles.milestone}>
            <Text variant="label" color={palette.flame} uppercase>
              {`${completion.streakMilestone}-day streak!`}
            </Text>
            <Text variant="caption" color={colors.slate} align="center">
              A milestone. Keep the chain alive.
            </Text>
          </View>
        ) : (
          <Text variant="body" color={colors.slate} align="center">
            {completion.streak.currentStreak === 1
              ? 'Streak started. Come back tomorrow to keep it.'
              : `You're on a ${completion.streak.currentStreak}-day streak.`}
          </Text>
        )}

        {completion.newBadges.length > 0 ? (
          <View style={styles.badgesUnlocked}>
            <Text variant="label" color={palette.forestDeep} uppercase>
              {completion.newBadges.length === 1 ? 'Badge unlocked' : 'Badges unlocked'}
            </Text>
            <View style={styles.badgesUnlockedRow}>
              {completion.newBadges.map((badge) => (
                <BadgeMedallion key={badge.id} badge={badge} earned size={54} showLabel />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          {next ? (
            <PillButton
              label="Next lesson"
              variant="dark"
              onPress={() => router.replace(`/lesson/${courseId}/${next.id}` as never)}
            />
          ) : (
            <PillButton
              label="Back to course"
              variant="dark"
              onPress={() => router.replace(`/course/${courseId}` as never)}
            />
          )}
          <PillButton label="Done" variant="ghost" onPress={onExit} />
        </View>

        <SourceLinks sources={sources} compact />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    padding: space.lg,
  },
  completion: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    padding: space.lg,
    paddingBottom: space.xxl,
  },
  badge: {
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    backgroundColor: palette.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  xpPill: {
    backgroundColor: palette.mint,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  gemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs + 1,
    backgroundColor: palette.azureSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  milestone: {
    alignItems: 'center',
    gap: space.xxs,
    backgroundColor: palette.flameSoft,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  streakRow: {
    alignSelf: 'stretch',
    marginTop: space.sm,
  },
  badgesUnlocked: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
  },
  badgesUnlockedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.md,
  },
  actions: {
    alignSelf: 'stretch',
    gap: space.sm,
    marginTop: space.lg,
  },
});
