import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { getTerm } from '@/content/registry';
import { RefChips } from '@/components/kb/RefChips';
import { CardSurface, PillButton, RichTextView, Screen, Text } from '@/components/primitives';
import type { EntityRef } from '@/content/types';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/**
 * A single glossary entry.
 *
 * Deliberately spare: the term, one short definition, and links out — a
 * backlink to the lesson that teaches it and a few related terms. It is a
 * glance, not a lesson, so there is intentionally nothing more here.
 */
export default function TermDetail() {
  const colors = useColors();
  const { termId } = useLocalSearchParams<{ termId: string }>();
  const router = useRouter();
  const term = getTerm(termId);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/kb/glossary' as never));

  if (!term) {
    return (
      <Screen tone="warm">
        <View style={styles.centre}>
          <Text variant="h2">
            Term not found
          </Text>
          <PillButton label="Back to glossary" variant="dark" fullWidth={false} onPress={close} />
        </View>
      </Screen>
    );
  }

  const related: EntityRef[] = term.related ?? [];

  return (
    <Screen tone="warm" edges={['top']}>
      <View style={styles.header}>
        <View style={[styles.grabber, { backgroundColor: colors.hairline }]} />
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path
              d="M6 6l12 12M18 6L6 18"
              stroke={colors.ink}
              strokeWidth={2.4}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text variant="label" color={palette.forestDeep} uppercase>
          Glossary
        </Text>
        <Text variant="display">
          {term.term}
        </Text>

        {term.aliases && term.aliases.length > 0 ? (
          <Text variant="caption" color={colors.slate}>
            {`Also: ${term.aliases.join(', ')}`}
          </Text>
        ) : null}

        <CardSurface style={{ backgroundColor: colors.paper }}>
          <RichTextView value={term.definition} variant="h3" color={colors.ink} linksEnabled />
        </CardSurface>

        {term.learnMore ? <RefChips title="Learn it in" refs={[term.learnMore]} /> : null}
        {related.length > 0 ? <RefChips title="Related" refs={related} /> : null}

        <Text variant="caption" color={colors.slateLight}>
          Educational only — not financial advice.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.lg },
  header: {
    alignItems: 'flex-end',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    marginBottom: space.sm,
  },
  body: { padding: space.lg, paddingTop: space.xs, paddingBottom: space.xxl, gap: space.md },
});
