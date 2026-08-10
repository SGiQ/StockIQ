import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getWeeklyNote } from '@/content/registry';
import { LessonPlayer } from '@/components/player/LessonPlayer';
import { PillButton, Screen, Text } from '@/components/primitives';
import { space } from '@/theme/tokens';

/**
 * A single This Week note, played through the standard card deck.
 *
 * Reuses `LessonPlayer` exactly like the book and strategy guides do — notes
 * are just cards. Hearts are off (this is not a graded lesson), there's no XP,
 * and completion simply exits.
 */
export default function WeeklyNoteScreen() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const router = useRouter();
  const note = getWeeklyNote(noteId);

  const exit = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/this-week' as never);
  }, [router]);

  if (!note) {
    return (
      <Screen tone="paper">
        <View style={styles.centre}>
          <Text variant="h2">Note not found</Text>
          <PillButton label="Back to This Week" variant="dark" fullWidth={false} onPress={exit} />
        </View>
      </Screen>
    );
  }

  return (
    <LessonPlayer
      cards={note.cards}
      onExit={exit}
      onComplete={exit}
      askContext={{ lessonTitle: note.title, courseTitle: 'This Week' }}
    />
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.lg },
});
