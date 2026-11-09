import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { CardSurface, PillButton, Screen, Text } from '@/components/primitives';
import { UnlimitedUpsellSheet } from '@/components/player/UnlimitedUpsellSheet';
import { type AskContext } from '@/services/ask';
import { asOfLabel, changeTone, formatChange, formatPrice, marketErrorMessage, marketService, type Quote } from '@/services/market';
import { ASK_FREE_DAILY, moveExplanationPrompt } from '@/features/advisor';
import { useAsk } from '@/features/advisor/useAsk';
import { useAppStore } from '@/store/slices/useAppStore';
import type { Card } from '@/content/types';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

const GENERAL_CONTEXT: AskContext = {
  card: {
    id: 'market',
    type: 'concept',
    headline: 'Market move',
    body: "A learner is asking about a stock's price move in educational terms.",
  } as Card,
  lessonTitle: 'Watchlist',
  courseTitle: 'Market',
};

const toneColor = (t: ReturnType<typeof changeTone>, slate: string) =>
  t === 'up' ? palette.emeraldDeep : t === 'down' ? palette.danger : slate;

export default function TickerScreen() {
  const colors = useColors();
  const { symbol: raw } = useLocalSearchParams<{ symbol: string }>();
  const symbol = (raw ?? '').toUpperCase();
  const router = useRouter();
  const removeFromWatchlist = useAppStore((s) => s.removeFromWatchlist);
  const advisor = useAsk();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { unlimited, remaining, upsellOpen, closeUpsell } = advisor;

  useEffect(() => {
    let cancelled = false;
    setLoadingQuote(true);
    marketService
      .quotes([symbol])
      .then((qs) => {
        if (!cancelled) setQuote(qs[0] ?? null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(marketErrorMessage(e, 'Could not load this quote.'));
      })
      .finally(() => {
        if (!cancelled) setLoadingQuote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const explain = useCallback(async () => {
    if (!quote || explaining) return;
    const outcome = await advisor.ask({
      question: moveExplanationPrompt(symbol, quote.changePercent),
      historyQuestion: `What's behind ${symbol}'s move today?`,
      context: GENERAL_CONTEXT,
      onDelta: (delta) => setExplanation((prev) => prev + delta),
      fallbackMessage: 'Could not explain right now.',
      onStart: () => {
        setExplaining(true);
        setExplanation('');
        setError(null);
      },
    });
    setExplaining(false);
    if (outcome.status === 'failed') setError(outcome.error.message);
  }, [advisor, explaining, quote, symbol]);

  const tone = quote ? changeTone(quote.change) : 'flat';

  return (
    <Screen tone="warm" edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/watchlist'))}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path d="M15 5l-7 7 7 7" stroke={colors.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Pressable>
        <Text variant="h2">
          {symbol}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <CardSurface style={styles.quoteCard}>
          {loadingQuote ? (
            <ActivityIndicator color={colors.slate} />
          ) : quote && quote.valid ? (
            <>
              <Text variant="display">
                {formatPrice(quote.price)}
              </Text>
              <Text variant="h3" color={toneColor(tone, colors.slate)}>
                {formatChange(quote.change, quote.changePercent)}
              </Text>
              {asOfLabel(quote.asOf) ? (
                <Text variant="caption" color={colors.slateLight}>
                  {asOfLabel(quote.asOf)}
                </Text>
              ) : null}
            </>
          ) : error ? (
            <Text variant="body" color={colors.slate}>
              Could not load a price for {symbol} — see below.
            </Text>
          ) : (
            <Text variant="body" color={colors.slate}>
              No market data for {symbol}.
            </Text>
          )}
        </CardSurface>

        {quote && quote.valid ? (
          <>
            {explanation || explaining ? (
              <CardSurface style={styles.explainCard}>
                <Text variant="label" color={palette.violetInk} uppercase>
                  What's behind the move
                </Text>
                <Text variant="body">
                  {explanation || 'Thinking…'}
                </Text>
              </CardSurface>
            ) : (
              <PillButton
                label="✦  Explain this move"
                variant="primary"
                onPress={() => void explain()}
              />
            )}
            {!explaining && explanation ? (
              <PillButton label="Explain again" variant="ghost" onPress={() => void explain()} />
            ) : null}
            {!unlimited ? (
              <Text variant="caption" color={colors.slateLight} align="center">
                {`${remaining} of ${ASK_FREE_DAILY} free explanations left today`}
              </Text>
            ) : null}
          </>
        ) : null}

        {error ? (
          <Text variant="caption" color={palette.danger}>
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={async () => {
            await removeFromWatchlist(symbol);
            router.replace('/watchlist');
          }}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${symbol} from watchlist`}
          style={styles.removeRow}
        >
          <Text variant="bodySm" color={palette.danger}>
            Remove from watchlist
          </Text>
        </Pressable>

        <Text variant="caption" color={colors.slateLight} align="center" style={styles.disclaimer}>
          Educational explanation of a delayed price move — not a buy, sell, or hold call, and not a prediction.
        </Text>
      </ScrollView>

      <UnlimitedUpsellSheet visible={upsellOpen} onClose={closeUpsell} />
    </Screen>
  );
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
  quoteCard: { alignItems: 'center', gap: space.xs, paddingVertical: space.lg },
  explainCard: { gap: space.sm },
  removeRow: { alignItems: 'center', paddingVertical: space.md },
  disclaimer: { marginTop: space.sm },
});
