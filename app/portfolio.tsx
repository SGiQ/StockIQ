import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, TextInput, UIManager, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
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
  positionWeights,
  totalReturn,
  totalValue,
} from '@/features/paper';
import { getTrades, type PaperTrade } from '@/features/paper/tradeHistory';
import { getSnapshots, recordSnapshot, type ValueSnapshot } from '@/features/paper/valueHistory';
import { ASK_FREE_DAILY, asksRemaining, canAsk } from '@/features/advisor';
import { useAppStore, useEntitlement } from '@/store/slices/useAppStore';
import { toDayISO } from '@/lib/dates';
import type { Card } from '@/content/types';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const HOW_TO_STEPS = [
  {
    title: 'Pick a stock',
    body: 'Type any ticker symbol — AAPL, TSLA, MSFT, anything publicly traded.',
    icon: (color: string) => (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <G fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="10.5" cy="10.5" r="6.5" />
          <Line x1="15.5" y1="15.5" x2="20.5" y2="20.5" />
        </G>
      </Svg>
    ),
  },
  {
    title: 'Set your size',
    body: 'Enter how many shares. Start small — you have $10,000 in simulated cash.',
    icon: (color: string) => (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <G fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <Rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <Line x1="3.5" y1="10" x2="20.5" y2="10" />
          <Path d="M8 3v3.5M16 3v3.5" />
        </G>
      </Svg>
    ),
  },
  {
    title: 'Buy or sell',
    body: 'Orders fill instantly at the current delayed price. No waiting, no fees.',
    icon: (color: string) => (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <G fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 20h18" />
          <Path d="M5 16l4-4.5 3.2 3 5.3-7" />
          <Path d="M17.5 7.5H21V11" />
        </G>
      </Svg>
    ),
  },
  {
    title: 'Track your P&L',
    body: 'Watch how the market moves your positions. Green means gain, red means loss.',
    icon: (color: string) => (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <G fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z" />
          <Circle cx="12" cy="12" r="2.8" />
        </G>
      </Svg>
    ),
  },
];

function HowToSection({ defaultOpen }: { defaultOpen: boolean }) {
  const colors = useColors();
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  };

  return (
    <CardSurface style={htStyles.card}>
      <Pressable onPress={toggle} style={htStyles.toggle} accessibilityRole="button" accessibilityLabel={open ? 'Collapse how it works' : 'Expand how it works'}>
        <Text variant="label" color={palette.forestInk} uppercase>
          How it works
        </Text>
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path
            d={open ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
            stroke={palette.forestInk}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Pressable>
      {open && (
        <View style={htStyles.steps}>
          {HOW_TO_STEPS.map((step, i) => (
            <View key={i} style={htStyles.step}>
              <View style={htStyles.iconWrap}>
                {step.icon(palette.forestDeep)}
              </View>
              <View style={htStyles.stepText}>
                <Text variant="bodyEm">
                  {step.title}
                </Text>
                <Text variant="caption" color={colors.slate}>
                  {step.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </CardSurface>
  );
}

const htStyles = StyleSheet.create({
  card: {
    backgroundColor: palette.mintSoft + '30',
    borderWidth: 1,
    borderColor: palette.mintSoft + '60',
  },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  steps: { gap: space.md, marginTop: space.sm },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.mintSoft + '50',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepText: { flex: 1, gap: 2 },
});

const CHART_W = 280;
const CHART_H = 80;
const CHART_PAD = { x: 2, y: 8 };

function ValueChart({ snapshots, current }: { snapshots: ValueSnapshot[]; current: number }) {
  const raw = snapshots.length > 0 ? snapshots : [{ t: 0, v: STARTING_CASH }];
  const points = raw[0].v === STARTING_CASH ? raw : [{ t: 0, v: STARTING_CASH }, ...raw];
  const allValues = [...points.map((s) => s.v), current];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const plotW = CHART_W - CHART_PAD.x * 2;
  const plotH = CHART_H - CHART_PAD.y * 2;

  const toX = (i: number) => CHART_PAD.x + (i / Math.max(points.length, 1)) * plotW;
  const toY = (v: number) => CHART_PAD.y + plotH - ((v - min) / range) * plotH;

  const pathParts = points.map((s, i) => `${i === 0 ? 'M' : 'L'}${toX(i)} ${toY(s.v)}`);
  pathParts.push(`L${toX(points.length)} ${toY(current)}`);
  const d = pathParts.join(' ');

  const fillD = `${d} L${toX(points.length)} ${CHART_H} L${toX(0)} ${CHART_H} Z`;

  const gain = current >= STARTING_CASH;
  const lineColor = gain ? palette.mint : palette.flameSoft;
  const fillColor = gain ? palette.mint : palette.flameSoft;

  const startLabel = formatPrice(points[0].v);
  const endLabel = formatPrice(current);

  return (
    <View style={chartStyles.wrap}>
      <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none">
        <Path d={fillD} fill={fillColor} opacity={0.15} />
        <Path d={d} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={toX(points.length)} cy={toY(current)} r={3} fill={lineColor} />
      </Svg>
      <View style={chartStyles.labels}>
        <Text variant="caption" color={palette.mintSoft}>{startLabel}</Text>
        <Text variant="caption" color={palette.mintSoft}>{endLabel}</Text>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  wrap: { marginTop: space.xs },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
});

const ALLOC_COLORS = [
  palette.emeraldDeep,
  palette.violet,
  '#4A90E2',
  palette.flame,
  '#E0A82E',
  '#D9776A',
] as const;

function AllocationBar({
  weights,
  cashWeight,
}: {
  weights: { symbol: string; weight: number }[];
  cashWeight: number;
}) {
  const colors = useColors();
  const segments = [
    ...weights.map((w, i) => ({
      label: w.symbol,
      pct: w.weight,
      color: ALLOC_COLORS[i % ALLOC_COLORS.length],
    })),
    { label: 'Cash', pct: cashWeight, color: colors.slateLight },
  ].filter((s) => s.pct > 0);

  return (
    <View style={allocStyles.wrap}>
      <View style={allocStyles.bar}>
        {segments.map((s) => (
          <View
            key={s.label}
            style={[allocStyles.segment, { flex: s.pct, backgroundColor: s.color }]}
          />
        ))}
      </View>
      <View style={allocStyles.legend}>
        {segments.map((s) => (
          <View key={s.label} style={allocStyles.legendItem}>
            <View style={[allocStyles.dot, { backgroundColor: s.color }]} />
            <Text variant="caption" color={colors.slate}>
              {`${s.label} ${Math.round(s.pct)}%`}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const allocStyles = StyleSheet.create({
  wrap: { gap: space.xs },
  bar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  segment: { minWidth: 4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, rowGap: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

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

const toneColor = (n: number, slate: string) =>
  n > 0 ? palette.emeraldDeep : n < 0 ? palette.danger : slate;

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${formatPrice(Math.abs(n)).slice(1)}`;

export default function PortfolioScreen() {
  const colors = useColors();
  const router = useRouter();
  const portfolio = useAppStore((s) => s.portfolio);
  const watchlist = useAppStore((s) => s.watchlist);
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
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [snapshots, setSnapshots] = useState<ValueSnapshot[]>([]);
  const snapshotted = useRef(false);
  const runId = useRef(0);

  const unlimited = entitlement.unlimitedAsk;
  const remaining = asksRemaining(profile, toDayISO(), unlimited);

  const loadTrades = useCallback(() => { void getTrades().then(setTrades); }, []);
  useEffect(loadTrades, [loadTrades]);

  const loadSnapshots = useCallback(() => { void getSnapshots().then(setSnapshots); }, []);
  useEffect(loadSnapshots, [loadSnapshots]);

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

  const watchSymbols = useMemo(
    () => watchlist.map((w) => w.symbol).filter((s) => !held.includes(s)),
    [watchlist, held],
  );
  const watchKey = watchSymbols.join(',');

  useEffect(() => {
    if (watchSymbols.length === 0) return;
    void marketService.quotes(watchSymbols).then((qs) => {
      setQuotes((prev) => ({ ...prev, ...Object.fromEntries(qs.map((q) => [q.symbol, q])) }));
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchKey]);

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

  useEffect(() => {
    if (snapshotted.current) return;
    const allPriced = held.length === 0 || held.every((s) => quotes[s]?.valid);
    if (!allPriced) return;
    snapshotted.current = true;
    void recordSnapshot(value).then(loadSnapshots);
  }, [held, quotes, value, loadSnapshots]);
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
        else { setTradeShares(''); loadTrades(); loadSnapshots(); }
      } finally {
        setBusy(false);
      }
    },
    [buyShares, sellShares, loadTrades, loadSnapshots, quotes, sym, tradeShares],
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
            <Path d="M15 5l-7 7 7 7" stroke={colors.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Pressable>
        <Text variant="h2">
          Practice
        </Text>
      </View>

      <View style={styles.banner}>
        <Text variant="label" color={palette.violetInk} uppercase>
          Paper trading — simulated money, not real
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <HowToSection defaultOpen={portfolio.positions.length === 0} />

        <CardSurface tone="forestDeep" style={styles.summary}>
          <Text variant="label" color={palette.mintSoft} uppercase>
            Portfolio value
          </Text>
          <Text variant="display" color={colors.paper}>
            {formatPrice(value)}
          </Text>
          <Text variant="h3" color={ret.abs > 0 ? palette.mint : ret.abs < 0 ? palette.flame : palette.mintSoft}>
            {`${signed(ret.abs)} (${ret.pct > 0 ? '+' : ''}${ret.pct.toFixed(2)}%)`}
          </Text>
          <Text variant="caption" color={palette.mintSoft}>
            {`${formatPrice(portfolio.cash)} cash · started at ${formatPrice(STARTING_CASH)}`}
          </Text>
          {snapshots.length > 1 && <ValueChart snapshots={snapshots} current={value} />}
        </CardSurface>

        <CardSurface style={styles.tradeCard}>
          <View style={styles.tradeInputs}>
            <TextInput
              value={tradeSymbol}
              onChangeText={(t) => setTradeSymbol(t.toUpperCase())}
              placeholder="Symbol"
              placeholderTextColor={colors.slateLight}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[styles.input, styles.symInput, { backgroundColor: colors.paper, color: colors.ink, borderColor: colors.hairline }]}
            />
            <TextInput
              value={tradeShares}
              onChangeText={setTradeShares}
              placeholder="Shares"
              placeholderTextColor={colors.slateLight}
              keyboardType="number-pad"
              style={[styles.input, styles.sharesInput, { backgroundColor: colors.paper, color: colors.ink, borderColor: colors.hairline }]}
            />
          </View>
          {tradeQuote && tradeQuote.valid ? (
            <Text variant="caption" color={colors.slate}>
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

        {watchSymbols.length > 0 && (
          <View style={styles.positions}>
            <Text variant="label" color={colors.slate} uppercase>
              Watching
            </Text>
            {watchSymbols.map((ws) => {
              const q = quotes[ws];
              return (
                <CardSurface key={ws} style={styles.posRow}>
                  <View style={styles.posLeft}>
                    <Text variant="h3">
                      {ws}
                    </Text>
                    {q?.valid ? (
                      <Text variant="caption" color={toneColor(q.change, colors.slate)}>
                        {`${formatPrice(q.price)} · ${q.change >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%`}
                      </Text>
                    ) : (
                      <Text variant="caption" color={colors.slateLight}>loading</Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => setTradeSymbol(ws)}
                    hitSlop={8}
                    style={styles.quickBuy}
                    accessibilityRole="button"
                    accessibilityLabel={`Trade ${ws}`}
                  >
                    <Text variant="caption" color={palette.forestDeep}>Trade</Text>
                  </Pressable>
                </CardSurface>
              );
            })}
          </View>
        )}

        {portfolio.positions.length === 0 ? null : (
          <View style={styles.positions}>
            <Text variant="label" color={colors.slate} uppercase>
              Holdings
            </Text>
            {portfolio.positions.map((pos) => {
              const price = priceOf(pos.symbol) ?? pos.avgCost;
              const live = priceOf(pos.symbol) !== undefined;
              const pnl = positionPnL(pos, price);
              const pnlPct = positionPnLPercent(pos, price);
              return (
                <CardSurface key={pos.symbol} style={styles.posRow}>
                  <View style={styles.posLeft}>
                    <Text variant="h3">
                      {pos.symbol}
                    </Text>
                    <Text variant="caption" color={colors.slate}>
                      {`${pos.shares} @ ${formatPrice(pos.avgCost)}`}
                    </Text>
                  </View>
                  <View style={styles.posRight}>
                    <Text variant="bodyEm" color={live ? colors.ink : colors.slate}>
                      {formatPrice(positionValue(pos, price))}
                    </Text>
                    <Text variant="caption" color={live ? toneColor(pnl, colors.slate) : colors.slateLight}>
                      {live ? `${signed(pnl)} (${pnlPct > 0 ? '+' : ''}${pnlPct.toFixed(2)}%)` : 'at cost'}
                    </Text>
                  </View>
                </CardSurface>
              );
            })}
            <AllocationBar
              weights={positionWeights(portfolio, priceOf)}
              cashWeight={value > 0 ? Math.round((portfolio.cash * 100) / value) : 100}
            />
          </View>
        )}

        {portfolio.positions.length > 0 ? (
          coachText || coaching ? (
            <CardSurface style={styles.coachCard}>
              <Text variant="label" color={palette.violetInk} uppercase>
                Coach's read
              </Text>
              <Text variant="body">
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
                <Text variant="caption" color={colors.slateLight} align="center">
                  {`${remaining} of ${ASK_FREE_DAILY} free coaching + questions left today`}
                </Text>
              ) : null}
            </>
          )
        ) : null}

        {trades.length > 0 && (
          <View style={styles.positions}>
            <Text variant="label" color={colors.slate} uppercase>
              Trade history
            </Text>
            {trades.slice(0, 20).map((t) => (
              <CardSurface key={t.id} style={styles.posRow}>
                <View style={styles.posLeft}>
                  <View style={styles.tradeLine}>
                    <View style={[styles.sideBadge, t.side === 'buy' ? styles.buyBadge : styles.sellBadge]}>
                      <Text variant="caption" color={t.side === 'buy' ? palette.forestDeep : palette.danger}>
                        {t.side.toUpperCase()}
                      </Text>
                    </View>
                    <Text variant="h3">
                      {t.symbol}
                    </Text>
                  </View>
                  <Text variant="caption" color={colors.slate}>
                    {`${t.shares} @ ${formatPrice(t.price)} · ${new Date(t.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                  </Text>
                </View>
                <View style={styles.posRight}>
                  <Text variant="bodyEm" color={t.side === 'buy' ? colors.ink : palette.emeraldDeep}>
                    {formatPrice(t.total)}
                  </Text>
                </View>
              </CardSurface>
            ))}
            {trades.length > 20 && (
              <Text variant="caption" color={colors.slateLight} align="center">
                {`Showing 20 of ${trades.length} trades`}
              </Text>
            )}
          </View>
        )}

        <Pressable
          onPress={() => { void resetPortfolio(); setTrades([]); setSnapshots([]); }}
          accessibilityRole="button"
          accessibilityLabel="Reset portfolio"
          style={styles.resetRow}
        >
          <Text variant="bodySm" color={colors.slate}>
            Reset to {formatPrice(STARTING_CASH)}
          </Text>
        </Pressable>

        <Text variant="caption" color={colors.slateLight} align="center" style={styles.disclaimer}>
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
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    fontSize: 16,
    borderWidth: 1,
  },
  symInput: { flex: 1 },
  sharesInput: { width: 110 },
  tradeButtons: { flexDirection: 'row', gap: space.sm },
  empty: { marginTop: space.md },
  positions: { gap: space.sm },
  posRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  posLeft: { gap: 2 },
  posRight: { alignItems: 'flex-end', gap: 2 },
  quickBuy: {
    backgroundColor: palette.mintSoft + '40',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  tradeLine: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  sideBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  buyBadge: { backgroundColor: palette.emerald + '20' },
  sellBadge: { backgroundColor: palette.danger + '20' },
  resetRow: { alignItems: 'center', paddingVertical: space.md },
  disclaimer: { marginTop: space.xs },
});
