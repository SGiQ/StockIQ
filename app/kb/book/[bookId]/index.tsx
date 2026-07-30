import { Linking, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getBook } from '@/content/registry';
import type { EntityRef } from '@/content/types';
import { PillButton, RichTextView, Screen, Text } from '@/components/primitives';
import { EntityDetail } from '@/components/kb/EntityScaffold';
import { RefChips, strategyRefs, traderRefs } from '@/components/kb/RefChips';
import { palette, radius, space } from '@/theme/tokens';

export default function BookDetail() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const book = getBook(bookId);

  if (!book) {
    return (
      <Screen tone="warm">
        <View style={styles.centre}>
          <Text variant="h2">Book not found</Text>
        </View>
      </Screen>
    );
  }

  return (
    <EntityDetail
      eyebrow={`${book.author} · ${book.year}`}
      title={book.title}
      entityRef={`book:${book.id}` as EntityRef}
      hero={book.cover}
    >
      <RichTextView value={book.summary} variant="body" color={palette.inkSoft} linksEnabled />

      <View style={styles.actions}>
        <PillButton
          label={`Play the visual guide · ${book.guideCards.length} cards`}
          variant="dark"
          onPress={() => router.push(`/kb/book/${book.id}/guide` as never)}
        />
        {book.buyLinks.map((link) => (
          <PillButton
            key={link.url}
            label={link.label}
            variant="ghost"
            onPress={() => void Linking.openURL(link.url)}
          />
        ))}
      </View>

      <RefChips title="Related traders" refs={traderRefs(book.relatedTraders ?? [])} />
      <RefChips title="Related strategies" refs={strategyRefs(book.relatedStrategies ?? [])} />

      {/*
        Attribution is a required, non-empty schema field and is always shown.
        The guide is an original summary of the book's ideas — never its text —
        and saying so plainly on the page is part of keeping it that way.
      */}
      <View style={styles.attribution}>
        <Text variant="label" color={palette.slate} uppercase>
          About this guide
        </Text>
        <Text variant="caption" color={palette.slate}>
          {book.attribution}
        </Text>
        <Text variant="caption" color={palette.slateLight}>
          This is an original summary written for StockIQ. It is not an extract, and it is
          not a substitute for reading the book.
        </Text>
      </View>
    </EntityDetail>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    gap: space.sm,
  },
  attribution: {
    backgroundColor: palette.paper,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
});
