import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { listBooks, listStrategies, listTerms, listTraders } from '@/content/registry';
import { ArtView } from '@/components/art/ArtView';
import { Glyph } from '@/components/art/Glyph';
import { CardSurface, Screen, Text } from '@/components/primitives';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/**
 * The knowledge-base hub.
 *
 * Deliberately three flat lists rather than a search box: at this size,
 * browsing beats querying, and seeing the whole set is part of the point.
 */
export default function KnowledgeBase() {
  const colors = useColors();
  const router = useRouter();
  const traders = listTraders();
  const strategies = listStrategies();
  const books = listBooks();
  const terms = listTerms();

  const unlocked = useAppStore((s) => s.unlockedStrategies);
  const lockedCount = useMemo(
    () => strategies.filter((s) => !unlocked.includes(s.id)).length,
    [strategies, unlocked],
  );

  return (
    <Screen tone="warm" edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="h1">
            Knowledge base
          </Text>
          <Text variant="body" color={colors.slate}>
            The people, the playbooks, and the books worth reading.
          </Text>
        </View>

        <Section
          title="Traders & Investors"
          count={traders.length}
          subtitle="How they actually thought"
        >
          {traders.map((trader) => (
            <Row
              key={trader.id}
              art={trader.portrait}
              title={trader.name}
              subtitle={trader.oneLiner}
              onPress={() => router.push(`/kb/trader/${trader.id}` as never)}
            />
          ))}
        </Section>

        <Section
          title="Strategies"
          count={strategies.length}
          subtitle={
            lockedCount > 0
              ? `${lockedCount} unlock as you finish lessons`
              : 'All unlocked'
          }
        >
          {strategies.map((strategy) => {
            const isUnlocked = unlocked.includes(strategy.id);
            return (
              <Row
                key={strategy.id}
                art={{ kind: 'glyph', name: 'target', bg: isUnlocked ? 'mint' : 'sky' }}
                title={strategy.name}
                subtitle={isUnlocked ? strategy.oneLiner : 'Locked'}
                locked={!isUnlocked}
                onPress={() => router.push(`/kb/strategy/${strategy.id}` as never)}
              />
            );
          })}
        </Section>

        <Section title="Books" count={books.length} subtitle="Original visual guides">
          {books.map((book) => (
            <Row
              key={book.id}
              art={book.cover}
              title={book.title}
              subtitle={`${book.author} · ${book.year}`}
              onPress={() => router.push(`/kb/book/${book.id}` as never)}
            />
          ))}
        </Section>

        <Section title="Glossary" count={terms.length} subtitle="Look up any term">
          <Row
            art={{ kind: 'glyph', name: 'magnifier', bg: 'sky' }}
            title="Browse all terms"
            subtitle="Plain-language definitions, linked back to the lessons that teach them"
            onPress={() => router.push('/kb/glossary' as never)}
          />
        </Section>

        <Text variant="caption" color={colors.slateLight} align="center">
          Educational content only. StockiQ does not provide financial advice.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Section({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text variant="h2">
          {title}
        </Text>
        <View style={styles.count}>
          <Text variant="label" color={palette.forestDeep}>
            {String(count)}
          </Text>
        </View>
      </View>
      <Text variant="caption" color={colors.slate}>
        {subtitle}
      </Text>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

function Row({
  art,
  title,
  subtitle,
  onPress,
  locked = false,
}: {
  art: Parameters<typeof ArtView>[0]['spec'];
  title: string;
  subtitle: string;
  onPress: () => void;
  locked?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <CardSurface style={styles.row}>
        <View style={styles.rowArt}>
          <ArtView spec={art} aspectRatio={1} glyphSize={26} />
        </View>
        <View style={styles.rowText}>
          <Text variant="h3" color={locked ? colors.slate : undefined} numberOfLines={2}>
            {title}
          </Text>
          <Text variant="caption" color={colors.slate} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        {locked && <Glyph name="lock" size={20} color={colors.slateLight} />}
      </CardSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.lg,
    gap: space.xl,
    paddingBottom: space.xxl,
  },
  header: {
    gap: space.xs,
    marginTop: space.sm,
  },
  section: {
    gap: space.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  count: {
    backgroundColor: palette.mint,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  rows: {
    gap: space.sm,
    marginTop: space.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  rowArt: {
    width: 48,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  rowText: {
    flex: 1,
    gap: space.xxs,
  },
});
