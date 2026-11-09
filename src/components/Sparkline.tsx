import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { useColors } from '@/theme/ThemeProvider';

export interface SparklineProps {
  /** Closes, oldest first. Fewer than two points draws nothing. */
  points: number[];
  /** Sign of the day's move picks the colour; the line itself is not re-based. */
  change: number;
  width?: number;
  height?: number;
}

/**
 * A tiny last-session price line beside a watchlist row.
 *
 * Plain SVG, no animation: it is glanced at, not read, and a static polyline
 * is the cheapest thing a row can carry. Colour follows the quote's own day
 * change — green up, rust down, slate flat — so the line and the number never
 * disagree about direction.
 */
export function Sparkline({ points, change, width = 56, height = 20 }: SparklineProps) {
  const colors = useColors();
  const path = useMemo(() => {
    if (points.length < 2) return '';
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const pad = 1.5;
    const w = width - pad * 2;
    const h = height - pad * 2;
    return points
      .map((v, i) => `${(pad + (i / (points.length - 1)) * w).toFixed(1)},${(pad + h - ((v - min) / range) * h).toFixed(1)}`)
      .join(' ');
  }, [points, width, height]);

  if (!path) return null;
  const stroke = change > 0 ? colors.emeraldDeep : change < 0 ? colors.terracotta : colors.slate;

  return (
    <View aria-hidden>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polyline points={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
