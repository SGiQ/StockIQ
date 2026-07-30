import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { findCard, getCourse, getLesson } from '@/content/registry';
import { toPlainText } from '@/content/richtext';
import type { KeyInsightCard } from '@/content/types';
import { KeyInsightPoster } from '@/components/cards/KeyInsightCardView';
import { ArtView } from '@/components/art/ArtView';
import { Chip, Screen, Text } from '@/components/primitives';
import { Glyph } from '@/components/art/Glyph';
import { useAppStore } from '@/store/slices/useAppStore';
import type { SavedCard } from '@/store';
import { palette, radius, shadow, space } from '@/theme/tokens';

type SortMode = 'recent' | 'title';

interface Resolved {
  saved: SavedCard;
  card: ReturnType<typeof findCard>;
  lessonTitle: string;
  courseTitle: string;
}

export default function SavedTab() {
  const router = useRouter();
  const saved = useAppStore((s) => s.saved);
  const [sort, setSort] = useState<SortMode>('recent');

  /**
   * Saved rows persist only coordinates (course / lesson / card id), never a
   * copy of the card body, so edits to content flow through to cards that
   * were saved before the edit. A card that no longer exists is dropped
   * rather than rendered as a hole.
   */
  const resolved = useMemo(() => {
    const items: Resolved[] = saved
      .map((entry) => ({
        saved: entry,
        card: findCard(entry.courseId, entry.lessonId, entry.cardId),
        lessonTitle: getLesson(entry.courseId, entry.lessonId)?.title ?? '',
        courseTitle: getCourse(entry.courseId)?.title ?? '',
      }))
      .filter((item): item is Resolved => item.card !== undefined);

    return sort === 'recent'
      ? items.sort((a, b) => b.saved.savedAt - a.saved.savedAt)
      : items.sort((a, b) => a.lessonTitle.localeCompare(b.lessonTitle));
  }, [saved, sort]);

  return (
    <Screen tone="warm" edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="h1" color={palette.ink}>
          Saved cards
        </Text>

        {resolved.length > 0 && (
          <View style={styles.sortRow}>
            <Chip
              label="Recent"
              selected={sort === 'recent'}
              onPress={() => setSort('recent')}
            />
            <Chip label="By title" selected={sort === 'title'} onPress={() => setSort('title')} />
          </View>
        )}

        {resolved.length === 0 ? (
          <Empty />
        ) : (
          <View style={styles.grid}>
            {resolved.map((item) => (
              <Pressable
                key={item.saved.id}
                onPress={() =>
                  router.push(
                    `/card/${item.saved.courseId}/${item.saved.lessonId}/${item.saved.cardId}` as never,
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={`Saved card from ${item.lessonTitle}`}
                style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
              >
                {item.card!.type === 'key_insight' ? (
                  <KeyInsightPoster card={item.card as KeyInsightCard} compact />
                ) : (
                  <FallbackTile item={item} />
                )}
                <Text variant="caption" color={palette.slate} numberOfLines={1}>
                  {item.lessonTitle}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

/**
 * Non-poster cards can be saved too. Only `key_insight` has a shareable
 * layout, so everything else gets a stand-in: its art if it has any, and
 * otherwise its own words rather than an empty grey box.
 */
function FallbackTile({ item }: { item: Resolved }) {
  const card = item.card!;
  const art = 'art' in card ? card.art : undefined;
  const excerpt =
    card.type === 'concept'
      ? toPlainText(card.headline)
      : card.type === 'diagram'
        ? toPlainText(card.caption)
        : card.type === 'main_idea'
          ? toPlainText(card.summary)
          : card.type.replace('_', ' ');

  return (
    <View style={styles.fallback}>
      {art ? (
        <ArtView spec={art} aspectRatio={1} rounded={false} glyphSize={48} />
      ) : (
        <View style={styles.fallbackBlank}>
          <Text variant="bodySm" color={palette.inkSoft} align="center" numberOfLines={4}>
            {excerpt}
          </Text>
        </View>
      )}
      <View style={styles.fallbackLabel}>
        <Text variant="label" color={palette.slate} uppercase numberOfLines={1}>
          {card.type.replace('_', ' ')}
        </Text>
      </View>
    </View>
  );
}

function Empty() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyBadge}>
        <Glyph name="bell" size={30} color={palette.slate} />
      </View>
      <Text variant="h3" color={palette.ink} align="center">
        Nothing saved yet
      </Text>
      <Text variant="body" color={palette.slate} align="center">
        Tap the heart on any card during a lesson to keep it here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.lg,
    gap: space.lg,
    paddingBottom: space.xxl,
  },
  sortRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // See the note in explore.tsx: space-between rather than a column gap.
    justifyContent: 'space-between',
    rowGap: space.lg,
  },
  tile: {
    width: '48%',
    gap: space.xs,
  },
  tilePressed: {
    opacity: 0.75,
  },
  fallback: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: palette.paper,
    ...shadow.card,
  },
  fallbackBlank: {
    aspectRatio: 1,
    backgroundColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.sm,
  },
  fallbackLabel: {
    padding: space.sm,
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
    backgroundColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
});
