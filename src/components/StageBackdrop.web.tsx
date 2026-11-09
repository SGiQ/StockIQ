import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polyline, Text as SvgText } from 'react-native-svg';
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
import { fontFamily, palette } from '@/theme/tokens';
import { useColors, useIsDark } from '@/theme/ThemeProvider';

/** One tile of the drift pattern; it repeats horizontally. */
const TILE_W = 960;
const TILE_H = 1200;
/** One tile passes in this long. */
const LOOP_MS = 40_000;
/** The whole drift layer's opacity — "barely there" is the brief. */
const LAYER_OPACITY = 0.06;

const SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'SPY', 'VTI', 'AMZN', 'QQQ', 'META', 'GOOGL', 'TSLA'];

/** Deterministic pseudo-random so the pattern is identical on every load. */
function rnd(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** A gentle chart-like line, `n` points wide, in tile coordinates. */
function lineAt(seed: number, x0: number, y0: number, w: number, h: number): string {
  const n = 9;
  const pts: string[] = [];
  let y = y0 + h * 0.5;
  for (let i = 0; i < n; i += 1) {
    y += (rnd(seed * 7 + i) - 0.45) * h * 0.35;
    y = Math.max(y0, Math.min(y0 + h, y));
    pts.push(`${(x0 + (i / (n - 1)) * w).toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

function Tile({ ink }: { ink: string }) {
  const glyphs = [];
  for (let i = 0; i < 14; i += 1) {
    const x = rnd(i + 1) * (TILE_W - 120) + 20;
    const y = rnd(i + 101) * (TILE_H - 80) + 40;
    glyphs.push(
      <SvgText key={`s-${i}`} x={x} y={y} fill={ink} fontSize={14 + rnd(i + 201) * 12} fontFamily={fontFamily.bodyBold}>
        {SYMBOLS[i % SYMBOLS.length]}
      </SvgText>,
    );
  }
  for (let i = 0; i < 7; i += 1) {
    const x = rnd(i + 301) * (TILE_W - 260);
    const y = rnd(i + 401) * (TILE_H - 120);
    glyphs.push(
      <Polyline
        key={`l-${i}`}
        points={lineAt(i + 1, x, y, 180 + rnd(i + 501) * 120, 70)}
        fill="none"
        stroke={ink}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />,
    );
  }
  return (
    <Svg width={TILE_W} height={TILE_H} viewBox={`0 0 ${TILE_W} ${TILE_H}`}>
      {glyphs}
    </Svg>
  );
}

/**
 * The ambient backdrop behind the desktop phone frame: a deep token-green
 * gradient with a very faint layer of ticker symbols and chart lines
 * drifting across it. The drift is one translateX loop of a repeating tile
 * (transform only, ~40 s per tile), held still under reduced motion. The
 * layer never takes pointer events; the frame above is untouched.
 */
export function StageBackdrop() {
  const colors = useColors();
  const isDark = useIsDark();
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      drift.value = 0;
      return;
    }
    drift.value = 0;
    drift.value = withRepeat(
      withTiming(-TILE_W, { duration: LOOP_MS, easing: Easing.linear, reduceMotion: ReduceMotion.System }),
      -1,
      false,
    );
    return () => cancelAnimation(drift);
  }, [drift, reduceMotion]);

  const driftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: drift.value }] }));

  // The deep greens are the brand's own; in dark mode the far stop settles
  // into the dark paper so the frame's shadow still has something to fall on.
  const stops = isDark
    ? ([palette.forestInk, colors.paperWarm] as const)
    : ([palette.forestDeep, palette.forestInk] as const);
  const ink = isDark ? colors.mintSoft : colors.paper;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden>
      <LinearGradient colors={stops} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.clip]}>
        <Animated.View style={[styles.drift, { opacity: LAYER_OPACITY }, driftStyle]}>
          <Tile ink={ink} />
          <Tile ink={ink} />
          <Tile ink={ink} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  drift: { position: 'absolute', left: 0, top: 0, flexDirection: 'row', width: TILE_W * 3, height: TILE_H },
});
