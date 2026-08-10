import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { CardSurface, PillButton, Screen, Text } from '@/components/primitives';
import { UnlimitedUpsellSheet } from '@/components/player/UnlimitedUpsellSheet';
import { formatPrice, marketService, quotesWithBackfill, type Quote } from '@/services/market';
import { AskError, askService, type AskContext } from '@/services/ask';
import {
  STARTING_CASH,
  portfolioCoachPrompt,
  positionPnL,
  positionPnLPercent,
  positionValue,
  totalReturn,
  totalValue,
} from '@/features/paper';
import { ASK_FREE_DAILY, asksRemaining, canAsk } from '@/features/advisor';
import { useAppStore, useEntitlement } from '@/store/slices/useAppStore';
import { toDayISO } from '@/lib/dates';
import type { Card } from '@/content/types';
import { palette, radius, space } from '@/theme/tokens';

const COACH_CONTEXT: AskContext = {
  card: {
    id: 'coach',
    type: 'concept',
    headline: 'Portfolio coaching',
    body: 'A learner wants educational feedback on a practice portfolio.',
  } as Card,
  lessonTitle: 'Practice',
  courseTitle: 'Market',
};

const toneColor = (n: number) =>
  n > 0 ? palette.emeraldDeep : n < 0 ? palette.danger : palette.slate;

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${formatPrice(Math.abs(n)).slice(1)}`;

export default function PortfolioScreen() {
  const router = useRouter();
  const portfolio = useAppStore((s) => s.portfolio);
  const buyShares = useAppStore((s) => s.buyShares);
  const sellShares = useAppStore((s) => s.sellShares);
  const resetPortfolio = useAppStore((s) => s.resetPortfolio);

  const recordAsk = useAppStore((s) => s.recordAsk);
  const profile = useAppStore((s) => s.profile);
  const entitlement = useEntitlement();

  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [tradeSymbol, setTradeSymbol] = useState('');
  const [tradeShares, setTradeShares] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [coachText, setCoachText] = useState('');
  const [coaching, setCoaching] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const runId = useRef(0);

  const unlimited = entitlement.unlimitedAsk;
  const remaining = asksRemaining(profile, toDayISO(), unlimited);

  const held = useMemo(() => portfolio.positions.map((p) => p.symbol), [portfolio.positions]);
  const heldKey = held.join(',');
  const sym = tradeSymbol.trim().toUpperCase();

  // Held positions fill in progressively (rate-limited free tier), guarded so a
  // slow retry can't clobber a newer holdings set.
  useEffect(() => {
    if (held.length === 0) return;
    const myRun = (runId.current += 1);
    void quotesWithBackfill(
      held,
      (bySymbol) => {
        if (runId.current === myRun) setQuotes((prev) => ({ ...prev, ...bySymbol }));
      },
      () => runId.current !== myRun,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heldKey]);

  // The trade symbol is a single quote, fetched once typing settles.
  useEffect(() => {
    if (!sym) return;
    const t = setTimeout(() => {
      void marketService.quotes([sym]).then((qs) => {
        setQuotes((prev) => ({ ...prev, ...Object.fromEntries(qs.map((q) => [q.symbol, q])) }));
      }).catch(() => {});
    }, 450);
    return () => clearTimeout(t);
  }, [sym]);

  const priceOf = useCallback((s: string) => (quotes[s]?.valid ? quotes[s]!.price : undefined), [quotes]);

  const value = totalValue(portfolio, priceOf);
  const ret = totalReturn(portfolio, priceOf);
  const tradeQuote = sym ? quotes[sym] : undefined;

  const coach = useCallback(async () => {
    if (coaching) return;
    if (!canAsk(profile, toDayISO(), unlimited)) {
      setUpsellOpen(true);
      return;
    }
    setCoaching(true);
    setCoachText('');
    setError(null);
    let full = '';
    try {
      full = await askService.ask(
        portfolioCoachPrompt(portfolio, priceOf),
        COACH_CONTEXT,
        (delta) => setCoachText((prev) => prev + delta),
      );
    } catch (e) {
      setError(e instanceof AskError ? e.message : 'Could not coach right now.');
      setCoaching(false);
      return;
    }
    setCoaching(false);
    if (full.trim()) await recordAsk('Coach my practice portfolio', full);
  }, [coaching, portfolio, priceOf, profile, recordAsk, unlimited]);

  const trade = useCallback(
    async (side: 'buy' | 'sell') => {
      setError(null);
      const shares = Number(tradeShares);
      if (!sym) return setError('Enter a symbol.');
      if (!Number.isFinite(shares) || shares <= 0) return setError('Enter how many shares.');
      setBusy(true);
      try {
        let q = quotes[sym];
        if (!q) {
          const [fetched] = await marketService.quotes([sym]);
          if (fetched) setQuotes((prev) => ({ ...prev, [sym]: fetched }));
          q = fetched;
        }
        if (!q || !q.valid) return setError(`No live price for ${sym}.`);
        const res = side === 'buy'
          ? await buyShares(sym, q.price, shares)
          : await sellShares(sym, q.price, shares);
        if (!res.ok) setError(res.reason);
        else setTradeShares('');
      } finally {
        setBusy(false);
      }
    },
    [buyShares, sellShares, quotes, sym, tradeShares],
  );

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
            <Path d="M15 5l-7 7 7 7" stroke={palette.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Pressable>
        <Text variant="h2" color={palette.ink}>
          Practice
        </Text>
      </View>

      <View style={styles.banner}>
        <Text variant="label" color={palette.violetInk} uppercase>
          Paper trading — simulated money, not real
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <CardSurface tone="forestDeep" style={styles.summary}>
          <Text variant="label" color={palette.mintSoft} uppercase>
            Portfolio value
          </Text>
          <Text variant="display" color={palette.paper}>
            {formatPrice(value)}
          </Text>
          <Text variant="h3" color={ret.abs > 0 ? palette.mint : ret.abs < 0 ? palette.flame : palette.mintSoft}>
            {`${signed(ret.abs)} (${ret.pct > 0 ? '+' : ''}${ret.pct.toFixed(2)}%)`}
          </Text>
          <Text variant="caption" color={palette.mintSoft}>
            {`${formatPrice(portfolio.cash)} cash · started at ${formatPrice(STARTING_CASH)}`}
          </Text>
        </CardSurface>

        <CardSurface style={styles.tradeCard}>
          <View style={styles.tradeInputs}>
            <TextInput
              value={tradeSymbol}
              onChangeText={(t) => setTradeSymbol(t.toUpperCase())}
              placeholder="Symbol"
              placeholderTextColor={palette.slateLight}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.input, styles.symInput]}
            />
            <TextInput
              value={tradeShares}
              onChangeText={setTradeShares}
              placeholder="Shares"
              placeholderTextColor={palette.slateLight}
              keyboardType="number-pad"
              style={[styles.input, styles.sharesInput]}
            />
          </View>
          {tradeQuote && tradeQuote.valid ? (
            <Text variant="caption" color={palette.slate}>
              {`${sym} at ${formatPrice(tradeQuote.price)}${tradeShares ? ` · ${formatPrice(tradeQuote.price * Number(tradeShares || 0))} total` : ''}`}
            </Text>
          ) : null}
          <View style={styles.tradeButtons}>
            <PillButton label="Buy" variant="primary" onPress={() => void trade('buy')} disabled={busy} />
            <PillButton label="Sell" variant="ghost" onPress={() => void trade('sell')} disabled={busy} />
          </View>
          {error ? (
            <Text variant="caption" color={palette.danger}>
              {error}
            </Text>
          ) : null}
        </CardSurface>

        {portfolio.positions.length === 0 ? (
          <Text variant="body" color={palette.slate} align="center" style={styles.empty}>
            No holdings yet. Buy a few shares to practice — with simulated cash.
          </Text>
        ) : (
          <View style={styles.positions}>
            <Text variant="label" color={palette.slate} uppercase>
              Holdings
            </Text>
            {portfolio.positions.map((pos) => {
              const price = priceOf(pos.symbol);
              const pnl = price !== undefined ? positionPnL(pos, price) : 0;
              const pnlPct = price !== undefined ? positionPnLPercent(pos, price) : 0;
              return (
                <CardSurface key={pos.symbol} style={styles.posRow}>
                  <View style={styles.posLeft}>
                    <Text variant="h3" color={palette.ink}>
                      {pos.symbol}
                    </Text>
                    <Text variant="caption" color={palette.slate}>
                      {`${pos.shares} @ ${formatPrice(pos.avgCost)}`}
                    </Text>
                  </View>
                  <View style={styles.posRight}>
                    <Text variant="bodyEm" color={palette.ink}>
                      {price !== undefined ? formatPrice(positionValue(pos, price)) : '—'}
                    </Text>
                    <Text variant="caption" color={toneColor(pnl)}>
                      {price !== undefined ? `${signed(pnl)} (${pnlPct > 0 ? '+' : ''}${pnlPct.toFixed(2)}%)` : ' '}
                    </Text>
                  </View>
                </CardSurface>
              );
            })}
          </View>
        )}

        {portfolio.positions.length > 0 ? (
          coachText || coaching ? (
            <CardSurface style={styles.coachCard}>
              <Text variant="label" color={palette.violetInk} uppercase>
                Coach's read
              </Text>
              <Text variant="body" color={palette.ink}>
                {coachText || 'Thinking…'}
              </Text>
              {!coaching ? (
                <PillButton label="Coach again" variant="ghost" onPress={() => void coach()} />
              ) : null}
            </CardSurface>
          ) : (
            <>
              <PillButton label="✦  Coach my portfolio" variant="primary" onPress={() => void coach()} />
              {!unlimited ? (
                <Text variant="caption" color={palette.slateLight} align="center">
                  {`${remaining} of ${ASK_FREE_DAILY} free coaching + questions left today`}
                </Text>
              ) : null}
            </>
          )
        ) : null}

        <Pressable
          onPress={() => void resetPortfolio()}
          accessibilityRole="button"
          accessibilityLabel="Reset portfolio"
          style={styles.resetRow}
        >
          <Text variant="bodySm" color={palette.slate}>
            Reset to {formatPrice(STARTING_CASH)}
          </Text>
        </Pressable>

        <Text variant="caption" color={palette.slateLight} align="center" style={styles.disclaimer}>
          A practice sandbox with delayed prices and simulated money. Not real trading, not advice.
        </Text>
      </ScrollView>

      <UnlimitedUpsellSheet visible={upsellOpen} onClose={() => setUpsellOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.sm },
  banner: {
    marginHorizontal: space.lg,
    marginTop: space.sm,
    backgroundColor: palette.violetSoft,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  body: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  summary: { alignItems: 'center', gap: space.xxs, paddingVertical: space.lg },
  tradeCard: { gap: space.sm },
  coachCard: { gap: space.sm },
  tradeInputs: { flexDirection: 'row', gap: space.sm },
  input: {
    backgroundColor: palette.paper,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    color: palette.ink,
    fontSize: 16,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  symInput: { flex: 1 },
  sharesInput: { width: 110 },
  tradeButtons: { flexDirection: 'row', gap: space.sm },
  empty: { marginTop: space.md },
  positions: { gap: space.sm },
  posRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  posLeft: { gap: 2 },
  posRight: { alignItems: 'flex-end', gap: 2 },
  resetRow: { alignItems: 'center', paddingVertical: space.md },
  disclaimer: { marginTop: space.xs },
});
