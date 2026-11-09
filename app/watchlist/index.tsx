import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { CardSurface, Screen, Skeleton, SkeletonSwap, Text, useDelayedPending } from '@/components/primitives';
import { Sparkline } from '@/components/Sparkline';
import { easeOutQuad } from '@/lib/easing';
import {
  asOfLabel,
  changeTone,
  formatChange,
  formatPrice,
  isMarketLive,
  marketErrorMessage,
  quotesWithBackfill,
  sparksCached,
  type Quote,
  type Spark,
} from '@/services/market';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

const toneColor = (t: ReturnType<typeof changeTone>, slate: string) =>
  t === 'up' ? palette.emeraldDeep : t === 'down' ? palette.danger : slate;

/** How long a price-change flash takes to fade. */
const FLASH_MS = 600;

/** Light / dark tint behind a ticker's monogram. */
const monogramBg = (symbol: string, soft: { violetSoft: string; azureSoft: string; successSoft: string; flameSoft: string }) => {
  const options = [soft.violetSoft, soft.azureSoft, soft.successSoft, soft.flameSoft];
  let h = 0;
  for (let i = 0; i < symbol.length; i += 1) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
  return options[h % options.length]!;
};

export default function WatchlistScreen() {
  const colors = useColors();
  const router = useRouter();
  const watchlist = useAppStore((s) => s.watchlist);
  const addToWatchlist = useAppStore((s) => s.addToWatchlist);
  const removeFromWatchlist = useAppStore((s) => s.removeFromWatchlist);

  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [sparks, setSparks] = useState<Record<string, Spark>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);
  const [draft, setDraft] = useState('');

  const symbols = useMemo(() => watchlist.map((w) => w.symbol), [watchlist]);
  const symbolsKey = symbols.join(',');

  const load = useCallback(async () => {
    if (symbols.length === 0) {
      setQuotes({});
      return;
    }
    // A run id invalidates an in-flight backfill when the watchlist changes, so
    // a slow retry can't overwrite fresher state.
    const myRun = (runId.current += 1);
    setLoading(true);
    setError(null);
    // Sparklines ride alongside, never gating the prices: one batched call,
    // failures swallowed, last good series kept for the session.
    void sparksCached(symbols).then((bySymbol) => {
      if (runId.current === myRun) setSparks(bySymbol);
    });
    try {
      await quotesWithBackfill(
        symbols,
        (bySymbol) => {
          if (runId.current === myRun) setQuotes(bySymbol);
        },
        () => runId.current !== myRun,
      );
    } catch (e) {
      if (runId.current === myRun) {
        setError(marketErrorMessage(e));
      }
    } finally {
      if (runId.current === myRun) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = useCallback(async () => {
    const s = draft.trim().toUpperCase();
    if (!s) return;
    setDraft('');
    await addToWatchlist(s);
  }, [draft, addToWatchlist]);

  // Market status, read off the quotes themselves rather than a clock: a
  // last-close print anywhere in the list means the market is shut.
  const shown = useMemo(() => symbols.map((s) => quotes[s]).filter((q): q is Quote => Boolean(q?.valid)), [symbols, quotes]);
  const marketStatus: 'open' | 'closed' | null =
    shown.length === 0 ? null : shown.some((q) => q.asOf === 'last_close') ? 'closed' : 'open';

  // Whole-list skeleton only while nothing at all has priced yet; after that
  // each row handles its own price block.
  const firstLoad = loading && Object.keys(quotes).length === 0;
  const showListSkeleton = useDelayedPending(firstLoad && watchlist.length > 0);

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
          Watchlist
        </Text>
        <Pressable onPress={() => void load()} hitSlop={8} style={styles.refresh} accessibilityRole="button" accessibilityLabel="Refresh quotes">
          {loading ? (
            <ActivityIndicator size="small" color={colors.slate} />
          ) : (
            <Svg width={22} height={22} viewBox="0 0 24 24">
              <Path d="M20 11a8 8 0 10-.9 3.7M20 5v6h-6" fill="none" stroke={colors.slate} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          )}
        </Pressable>
      </View>

      <View style={styles.addBar}>
        <TextInput
          value={draft}
          onChangeText={(t) => setDraft(t.toUpperCase())}
          placeholder="Add a symbol — e.g. AAPL"
          placeholderTextColor={colors.slateLight}
          autoCapitalize="characters"
          autoCorrect={false}
          onSubmitEditing={() => void add()}
          returnKeyType="done"
          style={[styles.input, { backgroundColor: colors.paper, color: colors.ink, borderColor: colors.hairline }]}
        />
        <Pressable
          onPress={() => void add()}
          disabled={!draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Add"
          style={[styles.addBtn, !draft.trim() && { backgroundColor: colors.slateLight }]}
        >
          <Text variant="label" color={colors.paper} uppercase>
            Add
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {!isMarketLive() ? (
          <View style={[styles.devBanner, { backgroundColor: colors.paperWarm, borderColor: colors.hairline }]}>
            <Text variant="caption" color={colors.slate}>
              Showing placeholder prices — connect market data to go live.
            </Text>
          </View>
        ) : null}

        {error ? (
          <Text variant="caption" color={palette.danger}>
            {error}
          </Text>
        ) : null}

        {marketStatus ? <MarketStatusPill status={marketStatus} /> : null}

        {watchlist.length === 0 ? (
          <CardSurface style={styles.empty}>
            <Text variant="h3">
              Follow a few tickers
            </Text>
            <Text variant="caption" color={colors.slate}>
              Add symbols you're curious about. StockiQ shows how they move and explains it in plain language — never a buy or sell call.
            </Text>
          </CardSurface>
        ) : showListSkeleton ? (
          watchlist.map((w) => (
            <CardSurface key={w.id} style={styles.row}>
              <RowSkeleton />
            </CardSurface>
          ))
        ) : (
          watchlist.map((w) => (
            <CardSurface key={w.id} style={styles.row}>
              <Pressable
                style={styles.rowMain}
                onPress={() => router.push(`/watchlist/${w.symbol}` as never)}
                accessibilityRole="button"
                accessibilityLabel={`${w.symbol} details`}
              >
                <View style={[styles.avatar, { backgroundColor: monogramBg(w.symbol, colors) }]}>
                  <Text variant="label" color={colors.ink}>
                    {w.symbol.slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.rowLeft}>
                  <Text variant="h3">
                    {w.symbol}
                  </Text>
                  {quotes[w.symbol] && !quotes[w.symbol]!.valid ? (
                    <Text variant="caption" color={colors.slateLight}>
                      No data for this symbol
                    </Text>
                  ) : quotes[w.symbol] ? (
                    <Text variant="caption" color={colors.slateLight}>
                      {asOfLabel(quotes[w.symbol]!.asOf) ?? 'Delayed'}
                    </Text>
                  ) : null}
                </View>
                {quotes[w.symbol]?.valid && sparks[w.symbol] ? (
                  <Sparkline points={sparks[w.symbol]!.points} change={quotes[w.symbol]!.change} />
                ) : null}
                <PriceCell quote={quotes[w.symbol]} pending={loading && !quotes[w.symbol]} />
              </Pressable>
              <Pressable
                onPress={() => void removeFromWatchlist(w.symbol)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${w.symbol}`}
                style={styles.remove}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path d="M6 6l12 12M18 6L6 18" stroke={colors.slateLight} strokeWidth={2} strokeLinecap="round" />
                </Svg>
              </Pressable>
            </CardSurface>
          ))
        )}

        <Text variant="caption" color={colors.slateLight} align="center" style={styles.disclaimer}>
          Delayed, educational data. StockiQ does not provide financial advice.
        </Text>
      </ScrollView>
    </Screen>
  );
}

/** Avatar block, two text lines, price block — the shape of a priced row. */
function RowSkeleton() {
  return (
    <View style={styles.rowMain}>
      <Skeleton width={40} height={40} radius={20} />
      <View style={[styles.rowLeft, { gap: space.sm }]}>
        <Skeleton width={64} height={16} />
        <Skeleton width={48} height={10} />
      </View>
      <View style={[styles.rowRight, { gap: space.sm }]}>
        <Skeleton width={76} height={16} />
        <Skeleton width={92} height={10} />
      </View>
    </View>
  );
}

/**
 * The price block. Flashes its background once when the price changes
 * between refreshes — green up, rust down — and fades over FLASH_MS. The
 * flash is a tinted layer whose opacity animates, so nothing re-lays-out.
 * First arrival never flashes: there is no previous price to compare.
 */
function PriceCell({ quote, pending }: { quote: Quote | undefined; pending: boolean }) {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const prevPrice = useRef<number | undefined>(undefined);
  // Two tinted layers, one per direction, each driven by its own shared
  // value: the colour and the fade then start on the same UI frame, where a
  // React state flag for the tone would land one frame behind the opacity.
  const flashUp = useSharedValue(0);
  const flashDown = useSharedValue(0);
  const price = quote?.valid ? quote.price : undefined;

  useEffect(() => {
    const prev = prevPrice.current;
    prevPrice.current = price;
    if (price === undefined || prev === undefined || prev === price || reduceMotion) return;
    const layer = price > prev ? flashUp : flashDown;
    layer.value = 0.35;
    layer.value = withTiming(0, { duration: FLASH_MS, easing: easeOutQuad, reduceMotion: ReduceMotion.System });
  }, [price, flashUp, flashDown, reduceMotion]);

  const upStyle = useAnimatedStyle(() => ({ opacity: flashUp.value }));
  const downStyle = useAnimatedStyle(() => ({ opacity: flashDown.value }));
  const tone = quote ? changeTone(quote.change) : 'flat';

  return (
    <SkeletonSwap
      pending={pending}
      style={styles.rowRight}
      skeleton={
        <View style={[styles.rowRight, { gap: space.sm }]}>
          <Skeleton width={76} height={16} />
          <Skeleton width={92} height={10} />
        </View>
      }
    >
      <View style={styles.priceCell}>
        <Animated.View testID="price-flash" pointerEvents="none" style={[styles.flash, { backgroundColor: colors.emeraldDeep }, upStyle]} />
        <Animated.View testID="price-flash" pointerEvents="none" style={[styles.flash, { backgroundColor: colors.terracotta }, downStyle]} />
        {quote && quote.valid ? (
          <>
            <Text variant="bodyEm">
              {formatPrice(quote.price)}
            </Text>
            <Text variant="caption" color={toneColor(tone, colors.slate)}>
              {formatChange(quote.change, quote.changePercent)}
            </Text>
          </>
        ) : (
          <Text variant="caption" color={colors.slateLight}>
            —
          </Text>
        )}
      </View>
    </SkeletonSwap>
  );
}

/**
 * "Market open · delayed prices" with a breathing dot, or "Market closed ·
 * last close" with a still one. Driven by the quotes on screen, not a clock,
 * so it is right on holidays too.
 */
function MarketStatusPill({ status }: { status: 'open' | 'closed' }) {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  const open = status === 'open';

  useEffect(() => {
    if (!open || reduceMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [open, pulse, reduceMotion]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={[styles.statusPill, { backgroundColor: colors.paper, borderColor: colors.hairline }]} accessibilityRole="text">
      <Animated.View style={[styles.statusDot, { backgroundColor: open ? colors.emeraldDeep : colors.slateLight }, dotStyle]} />
      <Text variant="caption" color={colors.slate}>
        {open ? 'Market open · delayed prices' : 'Market closed · last close'}
      </Text>
    </View>
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
  refresh: { marginLeft: 'auto', width: 28, alignItems: 'center' },
  addBar: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md },
  input: {
    flex: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    fontSize: 16,
    borderWidth: 1,
  },
  addBtn: {
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    backgroundColor: palette.violet,
    borderRadius: radius.pill,
  },
  body: { padding: space.lg, gap: space.sm, paddingBottom: space.xxl },
  devBanner: {
    borderRadius: radius.md,
    padding: space.sm,
    borderWidth: 1,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 1,
    marginBottom: space.xs,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  empty: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowLeft: { flex: 1, gap: 2 },
  rowRight: { alignItems: 'flex-end', gap: 2, minWidth: 92 },
  priceCell: { alignItems: 'flex-end', gap: 2, paddingHorizontal: space.xs, paddingVertical: 2 },
  flash: { ...StyleSheet.absoluteFill, borderRadius: radius.sm },
  remove: { paddingLeft: space.sm },
  disclaimer: { marginTop: space.lg },
});
