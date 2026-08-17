import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { listTerms } from '@/content/registry';
import { toPlainText } from '@/content/richtext';
import { CardSurface, Screen, Text } from '@/components/primitives';
import { radius, space, type as typeScale } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/**
 * The glossary — a reference layer over the curriculum.
 *
 * A flat, searchable A→Z list. It teaches nothing new; it lets a learner who
 * hit an unfamiliar word look it up in one tap and jump to the lesson that
 * actually teaches it.
 */
export default function Glossary() {
  const colors = useColors();
  const router = useRouter();
  const terms = listTerms();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return terms;
    return terms.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        (t.aliases ?? []).some((a) => a.toLowerCase().includes(q)) ||
        toPlainText(t.definition).toLowerCase().includes(q),
    );
  }, [query, terms]);

  return (
    <Screen tone="warm" edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/kb'))}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path
              d="M15 5l-7 7 7 7"
              stroke={colors.ink}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Pressable>
        <Text variant="h3">
          Glossary
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search terms"
          placeholderTextColor={colors.slateLight}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.search, { borderColor: colors.hairline, backgroundColor: colors.paper, color: colors.ink }]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <Text variant="body" color={colors.slate} align="center">
            No terms match "{query.trim()}".
          </Text>
        ) : (
          filtered.map((term) => (
            <Pressable
              key={term.id}
              onPress={() => router.push(`/kb/term/${term.id}` as never)}
              accessibilityRole="button"
              accessibilityLabel={term.term}
            >
              <CardSurface style={styles.row}>
                <Text variant="h3">
                  {term.term}
                </Text>
                <Text variant="caption" color={colors.slate} numberOfLines={2}>
                  {toPlainText(term.definition)}
                </Text>
              </CardSurface>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  searchWrap: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  search: {
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    ...typeScale.body,
  },
  body: { padding: space.lg, paddingTop: space.xs, paddingBottom: space.xxl, gap: space.sm },
  row: { gap: space.xxs },
});
