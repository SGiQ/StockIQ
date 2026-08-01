import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as haptics from '@/lib/haptics';
import { getCourse, getLesson, getNextLesson } from '@/content/registry';
import { LessonPlayer } from '@/components/player/LessonPlayer';
import { Glyph } from '@/components/art/Glyph';
import { PillButton, Screen, Text } from '@/components/primitives';
import { StreakRow } from '@/components/StreakRow';
import { reportId, savedCardId } from '@/store';
import { useAppStore, type LessonCompletion } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';

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

  useEffect(() => {
    if (lesson) void startLesson(courseId, lessonId);
  }, [courseId, lesson, lessonId, startLesson]);

  const handleComplete = useCallback(async () => {
    haptics.success();
    setCompletion(await completeLesson(courseId, lessonId));
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

  if (completion) {
    return (
      <CompletionScreen
        completion={completion}
        courseId={courseId}
        lessonId={lessonId}
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
      onAnswered={(cardId, correct) =>
        void recordAttempt(courseId, lessonId, { cardId, correct, at: Date.now() })
      }
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
}: {
  completion: LessonCompletion;
  courseId: string;
  lessonId: string;
  onExit: () => void;
}) {
  const router = useRouter();
  const next = getNextLesson(courseId, lessonId);

  return (
    <Screen tone="paper">
      <View style={styles.completion}>
        <View style={styles.badge}>
          <Glyph
            name={completion.starred ? 'target' : 'check'}
            size={56}
            color={palette.paper}
            strokeWidth={2.4}
          />
        </View>

        <Text variant="display" color={palette.ink} align="center">
          {completion.starred ? 'Perfect run.' : 'Lesson complete.'}
        </Text>

        {completion.xpAwarded > 0 ? (
          <View style={styles.xpPill}>
            <Text variant="label" color={palette.forestDeep} uppercase>
              {`+${completion.xpAwarded} XP`}
            </Text>
          </View>
        ) : (
          <Text variant="caption" color={palette.slate} align="center">
            Reviewed — XP was already earned for this lesson.
          </Text>
        )}

        {/* Same component as the home screen, so the streak reads as one
            object the learner is maintaining rather than two widgets. */}
        <View style={styles.streakRow}>
          <StreakRow activeDays={completion.streak.activeDays} />
        </View>

        <Text variant="body" color={palette.slate} align="center">
          {completion.streak.currentStreak === 1
            ? 'Streak started. Come back tomorrow to keep it.'
            : `You're on a ${completion.streak.currentStreak}-day streak.`}
        </Text>

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
      </View>
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    padding: space.lg,
  },
  badge: {
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    backgroundColor: palette.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpPill: {
    backgroundColor: palette.mint,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  streakRow: {
    alignSelf: 'stretch',
    marginTop: space.sm,
  },
  actions: {
    alignSelf: 'stretch',
    gap: space.sm,
    marginTop: space.lg,
  },
});
