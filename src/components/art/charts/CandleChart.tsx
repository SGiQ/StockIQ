import { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { ChartSpec } from '@/content/types';
import { palette, fontFamily } from '@/theme/tokens';
import { PLOT, domainOf, revealAt, smoothPath } from './scale';
import type { ChartTheme } from './LineChart';

type CandleSpec = Extract<ChartSpec, { type: 'candles' }>;

const SMA_COLORS = ['#E0A82E', '#4A90E2', '#8B5CF6'] as const;

function computeSma(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    return sum / period;
  });
}

/**
 * Candlesticks for the chart-reading course. Up/down colouring is fixed to
 * the semantic green/red rather than the card's art palette, because the
 * colour carries meaning here — recolouring it per card would teach the
 * wrong thing.
 *
 * When candles carry volume data the plot splits: candles in the top ~72%,
 * volume bars in the bottom ~22%, with a gap between.
 */
export function CandleChart({ spec, theme, progress = 1 }: { spec: CandleSpec; theme: ChartTheme; progress?: number }) {
  const { candles, annotations, levels, sma } = spec;
  const hasVolume = candles.some((c) => c.v != null);

  const LABEL_W = 30;
  const chartX1 = PLOT.x1 - LABEL_W;
  const chartWidth = chartX1 - PLOT.x0;

  const volGap = 6;
  const volFraction = 0.22;
  const priceBottom = hasVolume ? PLOT.y0 + PLOT.height * (1 - volFraction - volGap / PLOT.height) : PLOT.y1;
  const priceHeight = priceBottom - PLOT.y0;
  const volTop = priceBottom + volGap;
  const volHeight = PLOT.y1 - volTop;

  const priceDomain = domainOf(candles.flatMap((c) => [c.h, c.l]), 0.08);

  const yPrice = (value: number) => {
    const t = (value - priceDomain.min) / (priceDomain.max - priceDomain.min);
    return priceBottom - t * priceHeight;
  };

  const bandAtLocal = (index: number, count: number) => {
    const slot = chartWidth / count;
    return { centre: PLOT.x0 + slot * (index + 0.5), width: slot };
  };

  const volumes = candles.map((c) => c.v ?? 0);
  const maxVol = Math.max(...volumes, 1);
  const yVol = (v: number) => volTop + volHeight - (v / maxVol) * volHeight;

  const priceTicks = [0.25, 0.5, 0.75].map((f) => {
    const value = priceDomain.min + (priceDomain.max - priceDomain.min) * f;
    return { y: priceBottom - f * priceHeight, label: `$${Math.round(value)}` };
  });

  return (
    <G>
      {/* Price grid lines */}
      {priceTicks.map((tick) => (
        <G key={`grid-${tick.label}`}>
          <Line
            x1={PLOT.x0}
            y1={tick.y}
            x2={chartX1}
            y2={tick.y}
            stroke={theme.ink}
            strokeWidth={0.5}
            strokeDasharray="2 4"
            opacity={0.2}
          />
          <SvgText
            x={chartX1 + 4}
            y={tick.y + 3}
            fill={theme.ink}
            fontSize={7}
            fontFamily={fontFamily.bodyRegular}
            textAnchor="start"
            opacity={0.5}
          >
            {tick.label}
          </SvgText>
        </G>
      ))}

      {/* Price axes */}
      <Line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x0} y2={priceBottom} stroke={theme.ink} strokeWidth={1.5} opacity={0.3} />
      <Line x1={PLOT.x0} y1={priceBottom} x2={chartX1} y2={priceBottom} stroke={theme.ink} strokeWidth={1.5} opacity={0.3} />

      {/* Support / resistance lines */}
      {levels?.map((level, i) => {
        const y = yPrice(level.value);
        return (
          <G key={`level-${i}`}>
            <Line
              x1={PLOT.x0}
              y1={y}
              x2={chartX1}
              y2={y}
              stroke={theme.ink}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              opacity={0.55}
            />
            <SvgText
              x={chartX1}
              y={y - 5}
              fill={theme.ink}
              fontSize={9}
              fontFamily={fontFamily.bodyBold}
              textAnchor="end"
            >
              {level.label.toUpperCase()}
            </SvgText>
          </G>
        );
      })}

      {/* Volume bars */}
      {hasVolume &&
        candles.map((candle, i) => {
          const v = candle.v ?? 0;
          if (v <= 0) return null;
          const { centre, width } = bandAtLocal(i, candles.length);
          const barWidth = Math.max(2, Math.min(12, width * 0.5));
          const rising = candle.c >= candle.o;
          const barTop = yVol(v);
          const r = revealAt(progress, i, candles.length);
          return (
            <Rect
              key={`vol-${i}`}
              x={centre - barWidth / 2}
              y={barTop}
              width={barWidth}
              height={PLOT.y1 - barTop}
              fill={rising ? palette.emerald : palette.danger}
              opacity={0.3 * r}
            />
          );
        })}

      {/* Candle bodies and wicks */}
      {candles.map((candle, i) => {
        const { centre, width } = bandAtLocal(i, candles.length);
        const bodyWidth = Math.max(3, Math.min(14, width * 0.55));
        const rising = candle.c >= candle.o;

        const yHigh = yPrice(candle.h);
        const yLow = yPrice(candle.l);
        const yOpen = yPrice(candle.o);
        const yClose = yPrice(candle.c);
        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
        // Entrance: candles print one after another, left to right, the way
        // a session unfolds — each fading in and scaling up about its centre.
        const r = revealAt(progress, i, candles.length);
        const cy = (yHigh + yLow) / 2;

        return (
          <G
            key={`candle-${i}`}
            opacity={r}
            transform={r < 1 ? `translate(${centre} ${cy}) scale(${0.6 + 0.4 * r}) translate(${-centre} ${-cy})` : undefined}
          >
            <Line
              x1={centre}
              y1={yHigh}
              x2={centre}
              y2={yLow}
              stroke={rising ? palette.emerald : palette.danger}
              strokeWidth={1.25}
            />
            <Rect
              x={centre - bodyWidth / 2}
              y={bodyTop}
              width={bodyWidth}
              height={bodyHeight}
              rx={1}
              fill={rising ? palette.emerald : palette.danger}
            />
          </G>
        );
      })}

      {/* SMA overlay lines */}
      {sma?.map((period, si) => {
        const closes = candles.map((c) => c.c);
        const values = computeSma(closes, period);
        const points = values
          .map((v, i) => {
            if (v == null) return null;
            const { centre } = bandAtLocal(i, candles.length);
            return { x: centre, y: yPrice(v) };
          })
          .filter(Boolean) as Array<{ x: number; y: number }>;
        if (points.length < 2) return null;
        return (
          <Path
            key={`sma-${period}`}
            d={smoothPath(points)}
            stroke={SMA_COLORS[si % SMA_COLORS.length]}
            strokeWidth={1.5}
            fill="none"
            opacity={0.8}
          />
        );
      })}

      {/* Annotations */}
      {annotations?.map((annotation, i) => {
        const index = Math.min(annotation.at, candles.length - 1);
        const { centre } = bandAtLocal(index, candles.length);
        const y = yPrice(candles[index].h);
        return (
          <G key={`note-${i}`}>
            <Line
              x1={centre}
              y1={y - 6}
              x2={centre}
              y2={PLOT.y0 + 8}
              stroke={theme.ink}
              strokeWidth={1.5}
            />
            <SvgText
              x={centre}
              y={PLOT.y0 + 2}
              fill={theme.ink}
              fontSize={9}
              fontFamily={fontFamily.bodyBold}
              textAnchor="middle"
            >
              {annotation.label.toUpperCase()}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
}
