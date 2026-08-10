import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { CardSurface, PillButton, Screen, Text } from '@/components/primitives';
import {
  MarketError,
  changeTone,
  formatChange,
  formatPrice,
  isMarketLive,
  marketService,
  type Quote,
} from '@/services/market';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';

const toneColor = (t: ReturnType<typeof changeTone>) =>
  t === 'up' ? palette.emeraldDeep : t === 'down' ? palette.danger : palette.slate;

export default function WatchlistScreen() {
  const router = useRouter();
  const watchlist = useAppStore((s) => s.watchlist);
  const addToWatchlist = useAppStore((s) => s.addToWatchlist);
  const removeFromWatchlist = useAppStore((s) => s.removeFromWatchlist);

  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const symbols = useMemo(() => watchlist.map((w) => w.symbol), [watchlist]);
  const symbolsKey = symbols.join(',');

  const load = useCallback(async () => {
    if (symbols.length === 0) {
      setQuotes({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = await marketService.quotes(symbols);
      const map: Record<string, Quote> = {};
      for (const q of qs) map[q.symbol] = q;
      setQuotes(map);
    } catch (e) {
      setError(e instanceof MarketError ? e.message : 'Market data is unavailable.');
    } finally {
      setLoading(false);
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
          Watchlist
        </Text>
        <Pressable onPress={() => void load()} hitSlop={8} style={styles.refresh} accessibilityRole="button" accessibilityLabel="Refresh quotes">
          {loading ? (
            <ActivityIndicator size="small" color={palette.slate} />
          ) : (
            <Svg width={22} height={22} viewBox="0 0 24 24">
              <Path d="M20 11a8 8 0 10-.9 3.7M20 5v6h-6" fill="none" stroke={palette.slate} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          )}
        </Pressable>
      </View>

      <View style={styles.addBar}>
        <TextInput
          value={draft}
          onChangeText={(t) => setDraft(t.toUpperCase())}
          placeholder="Add a symbol — e.g. AAPL"
          placeholderTextColor={palette.slateLight}
          autoCapitalize="characters"
          autoCorrect={false}
          onSubmitEditing={() => void add()}
          returnKeyType="done"
          style={styles.input}
        />
        <Pressable
          onPress={() => void add()}
          disabled={!draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Add"
          style={[styles.addBtn, !draft.trim() && styles.addBtnDisabled]}
        >
          <Text variant="label" color={palette.paper} uppercase>
            Add
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {!isMarketLive() ? (
          <View style={styles.devBanner}>
            <Text variant="caption" color={palette.slate}>
              Showing placeholder prices — connect market data to go live.
            </Text>
          </View>
        ) : null}

        {error ? (
          <Text variant="caption" color={palette.danger}>
            {error}
          </Text>
        ) : null}

        {watchlist.length === 0 ? (
          <CardSurface style={styles.empty}>
            <Text variant="h3" color={palette.ink}>
              Follow a few tickers
            </Text>
            <Text variant="caption" color={palette.slate}>
              Add symbols you're curious about. StockIQ shows how they move and explains it in plain language — never a buy or sell call.
            </Text>
          </CardSurface>
        ) : (
          watchlist.map((w) => {
            const q = quotes[w.symbol];
            const tone = q ? changeTone(q.change) : 'flat';
            return (
              <CardSurface key={w.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text variant="h3" color={palette.ink}>
                    {w.symbol}
                  </Text>
                  {q && !q.valid ? (
                    <Text variant="caption" color={palette.slateLight}>
                      No data for this symbol
                    </Text>
                  ) : null}
                </View>
                <View style={styles.rowRight}>
                  {q && q.valid ? (
                    <>
                      <Text variant="bodyEm" color={palette.ink}>
                        {formatPrice(q.price)}
                      </Text>
                      <Text variant="caption" color={toneColor(tone)}>
                        {formatChange(q.change, q.changePercent)}
                      </Text>
                    </>
                  ) : (
                    <Text variant="caption" color={palette.slateLight}>
                      {loading ? '…' : '—'}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => void removeFromWatchlist(w.symbol)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${w.symbol}`}
                  style={styles.remove}
                >
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M6 6l12 12M18 6L6 18" stroke={palette.slateLight} strokeWidth={2} strokeLinecap="round" />
                  </Svg>
                </Pressable>
              </CardSurface>
            );
          })
        )}

        <Text variant="caption" color={palette.slateLight} align="center" style={styles.disclaimer}>
          Delayed, educational data. StockIQ does not provide financial advice.
        </Text>
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
    paddingTop: space.sm,
  },
  refresh: { marginLeft: 'auto', width: 28, alignItems: 'center' },
  addBar: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md },
  input: {
    flex: 1,
    backgroundColor: palette.paper,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    color: palette.ink,
    fontSize: 16,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  addBtn: {
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    backgroundColor: palette.violet,
    borderRadius: radius.pill,
  },
  addBtnDisabled: { backgroundColor: palette.slateLight },
  body: { padding: space.lg, gap: space.sm, paddingBottom: space.xxl },
  devBanner: {
    backgroundColor: palette.paperWarm,
    borderRadius: radius.md,
    padding: space.sm,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  empty: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowLeft: { flex: 1, gap: 2 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  remove: { paddingLeft: space.sm },
  disclaimer: { marginTop: space.lg },
});
