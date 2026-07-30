import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getBook } from '@/content/registry';
import { LessonPlayer } from '@/components/player/LessonPlayer';
import { PillButton, Screen, Text } from '@/components/primitives';
import { savedCardId } from '@/store';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, space } from '@/theme/tokens';

/**
 * A book's visual guide, played in the lesson player.
 *
 * This screen is short precisely because `Book.guideCards` is the same
 * `Card[]` union a lesson uses — the whole feature is a route and a couple
 * of callbacks rather than a second player.
 *
 * Guide cards are addressed with the reserved course id "book" (see
 * `findCard` in the registry) so they can be saved and shared through the
 * same storage path as lesson cards. They award no XP and do not touch the
 * streak: a guide is reference material, not a graded lesson.
 */
const BOOK_COURSE_ID = 'book';

export default function BookGuide() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const book = getBook(bookId);

  const toggleSavedCard = useAppStore((s) => s.toggleSavedCard);
  const savedCards = useAppStore((s) => s.saved);

  const exit = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(`/kb/book/${bookId}` as never);
  }, [bookId, router]);

  if (!book) {
    return (
      <Screen tone="paper">
        <View style={styles.centre}>
          <Text variant="h2">Guide not found</Text>
          <PillButton label="Go back" variant="dark" fullWidth={false} onPress={exit} />
        </View>
      </Screen>
    );
  }

  return (
    <LessonPlayer
      cards={book.guideCards}
      onExit={exit}
      onComplete={exit}
      isCardSaved={(cardId) =>
        savedCards.some((c) => c.id === savedCardId(BOOK_COURSE_ID, book.id, cardId))
      }
      onToggleSave={(cardId) => void toggleSavedCard(BOOK_COURSE_ID, book.id, cardId)}
      askContext={{ lessonTitle: book.title, courseTitle: 'Book guide' }}
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
