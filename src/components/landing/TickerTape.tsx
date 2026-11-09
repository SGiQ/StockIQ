import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
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
import { Text } from '@/components/primitives';
import {
  changeTone,
  formatChange,
  formatPrice,
  isMarketLive,
  marketService,
  type Quote,
} from '@/services/market';
import { space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/** The marketing strip's symbols: large, familiar names plus three broad index funds. */
export const TAPE_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'SPY', 'QQQ', 'VTI'] as const;

/** Scroll speed. One full copy of the list passes in roughly 30 s. */
const PX_PER_SECOND = 40;
/** Quotes refresh while the page is open. */
const REFRESH_MS = 60_000;

/**
 * A horizontally scrolling strip of delayed quotes under the landing hero.
 *
 * Real quotes or nothing: when the market proxy is not configured, or the
 * fetch fails, or no symbol priced, the strip does not render — a marketing
 * page must never show made-up prices. The list is laid out twice and the
 * row translates by exactly one copy's width before snapping back, which
 * reads as an endless loop. Transform only, paused on hover and whenever the
 * tab is hidden, static under reduced motion.
 */
export function TickerTape() {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [copyWidth, setCopyWidth] = useState(0);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (!isMarketLive()) return;
    let cancelled = false;
    const load = async () => {
      try {
        const qs = await marketService.quotes([...TAPE_SYMBOLS]);
        const valid = qs.filter((q) => q.valid);
        if (!cancelled) setQuotes(valid.length > 0 ? valid : null);
      } catch {
        if (!cancelled) setQuotes(null);
      }
    };
    void load();
    const t = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // Hover (web) and a hidden tab both pause; the loop restarts from the
  // current offset on resume, so nothing jumps.
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setPaused(state !== 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!quotes || copyWidth <= 0 || reduceMotion) return;
    if (paused) {
      cancelAnimation(offset);
      return;
    }
    // First leg: from wherever the row is now to the end of the first copy
    // at constant speed. Then a clean repeating loop over one copy's width,
    // which is the seamless wrap.
    const remaining = copyWidth + offset.value; // offset is ≤ 0
    offset.value = withTiming(-copyWidth, {
      duration: (remaining / PX_PER_SECOND) * 1000,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.System,
    });
    const loop = setTimeout(() => {
      offset.value = 0;
      offset.value = withRepeat(
        withTiming(-copyWidth, {
          duration: (copyWidth / PX_PER_SECOND) * 1000,
          easing: Easing.linear,
          reduceMotion: ReduceMotion.System,
        }),
        -1,
        false,
      );
    }, (remaining / PX_PER_SECOND) * 1000);
    return () => {
      clearTimeout(loop);
      cancelAnimation(offset);
    };
  }, [quotes, copyWidth, reduceMotion, paused, offset]);

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  if (!quotes) return null;

  const items = quotes.map((q) => {
    const tone = changeTone(q.change);
    const color = tone === 'up' ? colors.emeraldDeep : tone === 'down' ? colors.terracotta : colors.slate;
    return (
      <View key={q.symbol} style={styles.item}>
        <Text variant="label" color={colors.ink}>
          {q.symbol}
        </Text>
        <Text variant="bodySm" color={colors.inkSoft}>
          {formatPrice(q.price)}
        </Text>
        <Text variant="caption" color={color}>
          {formatChange(q.change, q.changePercent)}
        </Text>
      </View>
    );
  });

  return (
    <View
      style={[styles.strip, { borderColor: colors.hairline, backgroundColor: colors.paper }]}
      accessibilityLabel="Delayed quotes for popular stocks and index funds"
      // Web only: hovering pauses the tape so a price can be read.
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <View style={styles.viewport}>
        <Animated.View style={[styles.row, rowStyle]}>
          <View style={styles.copy} onLayout={(e) => setCopyWidth(Math.round(e.nativeEvent.layout.width))}>
            {items}
          </View>
          {/* Second copy, so the wrap is seamless. Hidden from assistive tech. */}
          <View style={styles.copy} aria-hidden>
            {items}
          </View>
        </Animated.View>
      </View>
      <Text variant="caption" color={colors.slateLight} style={styles.note}>
        Delayed quotes
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: space.sm,
    overflow: 'hidden',
  },
  viewport: { overflow: 'hidden', width: '100%' },
  row: { flexDirection: 'row' },
  copy: { flexDirection: 'row' },
  item: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, paddingHorizontal: space.lg },
  note: { position: 'absolute', right: space.md, bottom: 1, fontSize: 10, lineHeight: 12 },
});
