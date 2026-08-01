import { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import type { ChartSpec } from '@/content/types';
import { palette, fontFamily } from '@/theme/tokens';
import { PLOT, bandAt, domainOf, yAt } from './scale';
import type { ChartTheme } from './LineChart';

type CandleSpec = Extract<ChartSpec, { type: 'candles' }>;

/**
 * Candlesticks for the chart-reading course. Up/down colouring is fixed to
 * the semantic green/red rather than the card's art palette, because the
 * colour carries meaning here — recolouring it per card would teach the
 * wrong thing.
 */
export function CandleChart({ spec, theme }: { spec: CandleSpec; theme: ChartTheme }) {
  const { candles, annotations, levels } = spec;
  const domain = domainOf(candles.flatMap((c) => [c.h, c.l]), 0.08);

  return (
    <G>
      {[0.25, 0.5, 0.75].map((fraction) => (
        <Line
          key={`grid-${fraction}`}
          x1={PLOT.x0}
          y1={PLOT.y0 + PLOT.height * fraction}
          x2={PLOT.x1}
          y2={PLOT.y0 + PLOT.height * fraction}
          stroke={theme.ink}
          strokeWidth={1}
          strokeDasharray="3 6"
          opacity={0.16}
        />
      ))}
      <Line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x0} y2={PLOT.y1} stroke={theme.ink} strokeWidth={2.5} />
      <Line x1={PLOT.x0} y1={PLOT.y1} x2={PLOT.x1} y2={PLOT.y1} stroke={theme.ink} strokeWidth={2.5} />

      {/* support / resistance lines sit behind the candles */}
      {levels?.map((level, i) => {
        const y = yAt(level.value, domain);
        return (
          <G key={`level-${i}`}>
            <Line
              x1={PLOT.x0}
              y1={y}
              x2={PLOT.x1}
              y2={y}
              stroke={theme.ink}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              opacity={0.55}
            />
            <SvgText
              x={PLOT.x1}
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

      {candles.map((candle, i) => {
        const { centre, width } = bandAt(i, candles.length);
        const bodyWidth = Math.max(3, Math.min(14, width * 0.55));
        const rising = candle.c >= candle.o;

        const yHigh = yAt(candle.h, domain);
        const yLow = yAt(candle.l, domain);
        const yOpen = yAt(candle.o, domain);
        const yClose = yAt(candle.c, domain);
        const bodyTop = Math.min(yOpen, yClose);
        // A doji would otherwise render as an invisible zero-height rect.
        const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

        return (
          <G key={`candle-${i}`}>
            <Line
              x1={centre}
              y1={yHigh}
              x2={centre}
              y2={yLow}
              stroke={theme.ink}
              strokeWidth={1.75}
            />
            <Rect
              x={centre - bodyWidth / 2}
              y={bodyTop}
              width={bodyWidth}
              height={bodyHeight}
              rx={1.5}
              fill={rising ? palette.emerald : palette.danger}
              stroke={theme.ink}
              strokeWidth={1.75}
            />
          </G>
        );
      })}

      {annotations?.map((annotation, i) => {
        const index = Math.min(annotation.at, candles.length - 1);
        const { centre } = bandAt(index, candles.length);
        const y = yAt(candles[index].h, domain);
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
