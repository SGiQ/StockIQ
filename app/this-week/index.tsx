import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { listWeeklyNotes } from '@/content/registry';
import { CardSurface, Screen, Text } from '@/components/primitives';
import { useAppStore } from '@/store/slices/useAppStore';
import { radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/** Short, dated market reads that tie a moment back to a concept. */
export default function ThisWeekScreen() {
  const colors = useColors();
  const router = useRouter();
  const notes = listWeeklyNotes();
  const markSeen = useAppStore((s) => s.markWeeklyNotesSeen);

  // Opening the feed clears the "new" badge.
  useEffect(() => {
    void markSeen();
  }, [markSeen]);

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
            <Path d="M15 5l-7 7 7 7" stroke={colors.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Pressable>
        <Text variant="h2">
          This Week
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text variant="body" color={colors.slate}>
          Short, timely reads that connect a market moment to a concept you've learned.
        </Text>

        {notes.length === 0 ? (
          <Text variant="body" color={colors.slateLight}>Nothing yet — check back soon.</Text>
        ) : (
          notes.map((note) => (
            <Pressable
              key={note.id}
              onPress={() => router.push(`/this-week/${note.id}` as never)}
              accessibilityRole="button"
              accessibilityLabel={note.title}
            >
              <CardSurface style={styles.card}>
                <Text variant="label" color={colors.slateLight} uppercase>
                  {formatDate(note.publishedOn)}
                </Text>
                <Text variant="h3">
                  {note.title}
                </Text>
                <Text variant="caption" color={colors.slate}>
                  {note.summary}
                </Text>
              </CardSurface>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  card: { gap: space.xs, borderRadius: radius.lg },
});
