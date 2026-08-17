import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { resolveRef, type ResolvedRef } from '@/content/registry';
import { Glyph } from '@/components/art/Glyph';
import { CardSurface, Screen, Text } from '@/components/primitives';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

const KIND_GLYPH = {
  trader: 'people',
  strategy: 'target',
  book: 'newspaper',
  term: 'lightbulb',
  lesson: 'lightbulb',
} as const;

const KIND_LABEL = {
  trader: 'Trader',
  strategy: 'Strategy',
  book: 'Book',
  term: 'Term',
  lesson: 'Lesson',
} as const;

/**
 * Liked entities across the app.
 *
 * Likes are stored as EntityRefs rather than per-type lists, so this screen
 * already handles traders, strategies, and books — they simply have no
 * content behind them until Phase 3.
 */
export default function LikedTab() {
  const colors = useColors();
  const router = useRouter();
  const liked = useAppStore((s) => s.liked);

  const items = useMemo(
    () =>
      liked
        .map((entry) => resolveRef(entry.ref))
        .filter((item): item is ResolvedRef => item !== undefined),
    [liked],
  );

  return (
    <Screen tone="warm" edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="h1">
          Liked
        </Text>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyBadge, { backgroundColor: colors.hairline }]}>
              <Glyph name="heart" size={30} color={colors.slate} />
            </View>
            <Text variant="h3" align="center">
              Nothing liked yet
            </Text>
            <Text variant="body" color={colors.slate} align="center">
              Lessons, traders, strategies, and books you like will collect here.
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <Pressable
              key={item.ref}
              onPress={() => router.push(item.href as never)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <CardSurface style={styles.row}>
                <View style={styles.icon}>
                  <Glyph name={KIND_GLYPH[item.kind]} size={22} color={palette.forestDeep} />
                </View>
                <View style={styles.rowText}>
                  <Text variant="label" color={colors.slate} uppercase>
                    {KIND_LABEL[item.kind]}
                  </Text>
                  <Text variant="h3" numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
              </CardSurface>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.lg,
    gap: space.md,
    paddingBottom: space.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: space.xxs,
  },
  empty: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
  },
  emptyBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
});
