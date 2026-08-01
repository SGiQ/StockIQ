import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getStrategy } from '@/content/registry';
import { LessonPlayer } from '@/components/player/LessonPlayer';
import { PillButton, Screen, Text } from '@/components/primitives';
import { savedCardId } from '@/store';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, space } from '@/theme/tokens';

/**
 * A strategy's guide, played in the lesson player.
 *
 * The strategy page states the rules — entry, exit, risk management — which
 * are reference material. This is where the strategy is actually taught: the
 * claimed edge, its cost, and the conditions under which it stops working.
 *
 * Short for the same reason the book guide is: `guideCards` is the same
 * `Card[]` union a lesson uses, so this is a route and two callbacks rather
 * than a second player.
 *
 * Cards are addressed with the reserved course id "strategy" (see `findCard`)
 * so they save and share through the same storage path as lesson cards. Like
 * book guides they award no XP, but their quiz attempts and completion state
 * sync across devices just like lessons.
 */
const STRATEGY_COURSE_ID = 'strategy';

export default function StrategyGuide() {
  const { strategyId } = useLocalSearchParams<{ strategyId: string }>();
  const router = useRouter();
  const strategy = getStrategy(strategyId);

  const toggleSavedCard = useAppStore((s) => s.toggleSavedCard);
  const savedCards = useAppStore((s) => s.saved);
  const startLesson = useAppStore((s) => s.startLesson);
  const recordCardIndex = useAppStore((s) => s.recordCardIndex);
  const recordAttempt = useAppStore((s) => s.recordAttempt);
  const completeLesson = useAppStore((s) => s.completeLesson);
  const unlockedStrategies = useAppStore((s) => s.unlockedStrategies);

  useEffect(() => {
    if (strategy?.guideCards?.length && unlockedStrategies.includes(strategy.id)) {
      void startLesson(STRATEGY_COURSE_ID, strategy.id);
    }
  }, [startLesson, strategy, unlockedStrategies]);

  const exit = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(`/kb/strategy/${strategyId}` as never);
  }, [strategyId, router]);

  // `guideCards` is optional on the schema, so a strategy can ship its page
  // before its deck. Both absent-strategy and absent-guide land here rather
  // than rendering an empty player.
  if (!strategy?.guideCards?.length || !unlockedStrategies.includes(strategy.id)) {
    return (
      <Screen tone="paper">
        <View style={styles.centre}>
          <Text variant="h2">
            {!strategy?.guideCards?.length ? 'Guide not found' : 'Finish the prerequisites first'}
          </Text>
          <PillButton label="Go back" variant="dark" fullWidth={false} onPress={exit} />
        </View>
      </Screen>
    );
  }

  return (
    <LessonPlayer
      cards={strategy.guideCards}
      narrationDeckId={`strategy:${strategy.id}`}
      onExit={exit}
      onComplete={() => {
        void completeLesson(STRATEGY_COURSE_ID, strategy.id, strategy.guideCards).then(exit);
      }}
      onCardIndex={(index) => void recordCardIndex(STRATEGY_COURSE_ID, strategy.id, index)}
      onAnswered={(cardId, correct) =>
        void recordAttempt(STRATEGY_COURSE_ID, strategy.id, { cardId, correct, at: Date.now() })
      }
      isCardSaved={(cardId) =>
        savedCards.some((c) => c.id === savedCardId(STRATEGY_COURSE_ID, strategy.id, cardId))
      }
      onToggleSave={(cardId) => void toggleSavedCard(STRATEGY_COURSE_ID, strategy.id, cardId)}
      askContext={{ lessonTitle: strategy.name, courseTitle: 'Strategy guide' }}
    />
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    padding: space.lg,
    backgroundColor: palette.paper,
  },
});
