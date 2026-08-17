import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { CardSurface, PillButton, Screen, Text } from '@/components/primitives';
import { UnlimitedUpsellSheet } from '@/components/player/UnlimitedUpsellSheet';
import { AskError, askService, type AskContext } from '@/services/ask';
import { changeTone, formatChange, formatPrice, marketService, type Quote } from '@/services/market';
import { ASK_FREE_DAILY, asksRemaining, canAsk, moveExplanationPrompt } from '@/features/advisor';
import { useAppStore, useEntitlement } from '@/store/slices/useAppStore';
import { toDayISO } from '@/lib/dates';
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
  const profile = useAppStore((s) => s.profile);
  const recordAsk = useAppStore((s) => s.recordAsk);
  const removeFromWatchlist = useAppStore((s) => s.removeFromWatchlist);
  const entitlement = useEntitlement();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const unlimited = entitlement.unlimitedAsk;
  const remaining = asksRemaining(profile, toDayISO(), unlimited);
  const allowed = canAsk(profile, toDayISO(), unlimited);

  useEffect(() => {
    let cancelled = false;
    setLoadingQuote(true);
    marketService
      .quotes([symbol])
      .then((qs) => {
        if (!cancelled) setQuote(qs[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this quote.');
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
    if (!allowed) {
      setUpsellOpen(true);
      return;
    }
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setExplaining(true);
    setExplanation('');
    setError(null);
    let full = '';
    try {
      full = await askService.ask(
        moveExplanationPrompt(symbol, quote.changePercent),
        GENERAL_CONTEXT,
        (delta) => setExplanation((prev) => prev + delta),
        next.signal,
      );
    } catch (e) {
      setError(e instanceof AskError ? e.message : 'Could not explain right now.');
      setExplaining(false);
      return;
    }
    setExplaining(false);
    if (full.trim()) await recordAsk(`What's behind ${symbol}'s move today?`, full);
  }, [allowed, explaining, quote, recordAsk, symbol]);

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
            </>
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

      <UnlimitedUpsellSheet visible={upsellOpen} onClose={() => setUpsellOpen(false)} />
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
