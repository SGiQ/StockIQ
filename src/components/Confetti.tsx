import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { artPalettes, palette } from '@/theme/tokens';

/** How long a burst lasts, launch to last piece gone. */
const DURATION_MS = 1700;
/** Breath before launch, so the screen underneath has painted first. */
const LAUNCH_DELAY_MS = 260;

/** Brand colours only; the gold and pink come from the art palettes. */
const COLORS = [
  palette.emeraldDeep,
  palette.mint,
  palette.violet,
  palette.azure,
  palette.flame,
  artPalettes.butter.accent,
  artPalettes.blush.accent,
] as const;

/** Deterministic per-piece randomness, so a burst looks the same on every device. */
function rnd(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

interface Piece {
  /** Launch point, as fractions of the stage. */
  x0: number;
  y0: number;
  /** Horizontal travel over the burst, as a fraction of the stage width. */
  vx: number;
  /** Initial upward travel, as a fraction of the stage height (negative = up). */
  vy: number;
  /** Degrees of spin over the burst. */
  spin: number;
  /** Degrees of flutter (rotateX) over the burst. */
  flutter: number;
  /** Stagger of this piece's launch, 0..1 of the burst. */
  delay: number;
  w: number;
  h: number;
  round: boolean;
  color: string;
}

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => {
    const side = rnd(i + 1) - 0.5;
    return {
      x0: 0.5 + side * 0.25,
      y0: 0.28 + rnd(i + 11) * 0.08,
      vx: side * (1.4 + rnd(i + 21) * 0.8),
      vy: -(0.28 + rnd(i + 31) * 0.3),
      spin: (rnd(i + 41) - 0.5) * 900,
      flutter: 360 + rnd(i + 51) * 720,
      delay: rnd(i + 61) * 0.18,
      w: 6 + rnd(i + 71) * 4,
      h: 9 + rnd(i + 81) * 6,
      round: rnd(i + 91) > 0.7,
      color: COLORS[i % COLORS.length]!,
    };
  });
}

/**
 * A single burst of confetti over the screen, for learning moments only:
 * a passed readiness check, a perfect run, a streak milestone. Trading
 * surfaces never render this — the brand celebrates process, not fills.
 *
 * Every piece is one View moved by a shared 0..1 timeline in a worklet:
 * position is a parabola (launch up and out, then fall under gravity),
 * rotation and flutter spin with the timeline, and opacity fades over the
 * last quarter. Transform and opacity only, so even 40 pieces are cheap, and
 * nothing is rendered at all under reduced motion. Plays once when `play`
 * turns true; unmounts its pieces when the burst ends.
 */
export function Confetti({ play, count = 40 }: { play: boolean; count?: number }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const armed = play && !reduceMotion;
  const [live, setLive] = useState(armed);
  // Pieces mount in the same render that turns `play` on, not an effect later.
  const [prevArmed, setPrevArmed] = useState(armed);
  if (armed !== prevArmed) {
    setPrevArmed(armed);
    if (armed) setLive(true);
  }
  const pieces = useMemo(() => makePieces(count), [count]);

  useEffect(() => {
    if (!play || reduceMotion) return;
    progress.value = 0;
    progress.value = withDelay(
      LAUNCH_DELAY_MS,
      withTiming(1, { duration: DURATION_MS, easing: Easing.linear, reduceMotion: ReduceMotion.System }),
    );
    const t = setTimeout(() => setLive(false), LAUNCH_DELAY_MS + DURATION_MS + 50);
    return () => clearTimeout(t);
  }, [play, reduceMotion, progress]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== stage.w || height !== stage.h) setStage({ w: width, h: height });
  };

  return (
    <View style={styles.overlay} pointerEvents="none" aria-hidden onLayout={onLayout}>
      {live && stage.w > 0
        ? pieces.map((p, i) => <PieceView key={i} piece={p} progress={progress} w={stage.w} h={stage.h} />)
        : null}
    </View>
  );
}

function PieceView({ piece, progress, w, h }: { piece: Piece; progress: SharedValue<number>; w: number; h: number }) {
  const style = useAnimatedStyle(() => {
    // Each piece runs its own 0..1 after its stagger.
    const t = Math.max(0, Math.min(1, (progress.value - piece.delay) / (1 - piece.delay)));
    const x = piece.x0 * w + piece.vx * w * t;
    // Gravity chosen so every piece has left the bottom edge by t = 1.
    const g = 1.25 - piece.y0 - piece.vy;
    const y = (piece.y0 + piece.vy * t + g * t * t) * h;
    const fade = t > 0.72 ? 1 - (t - 0.72) / 0.28 : 1;
    return {
      opacity: t <= 0 ? 0 : fade,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${piece.spin * t}deg` },
        { rotateX: `${piece.flutter * t}deg` },
      ],
    };
  }, [w, h]);

  return (
    <Animated.View
      style={[
        styles.piece,
        { width: piece.w, height: piece.h, backgroundColor: piece.color, borderRadius: piece.round ? piece.w / 2 : 1.5 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, overflow: 'hidden', zIndex: 10 },
  piece: { position: 'absolute', left: 0, top: 0 },
});
