import { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { ChartSpec } from '@/content/types';
import { fontFamily } from '@/theme/tokens';
import { PLOT, bandAt, fitLabel, yAt, type Domain } from './scale';
import type { ChartTheme } from './LineChart';

type BarSpec = Extract<ChartSpec, { type: 'bars' }>;

/**
 * Comparison bars — position sizing, drawdown-vs-recovery, sector weights.
 * The domain is anchored at zero because a bar chart that does not start at
 * zero misrepresents proportion, and this app is teaching people to read
 * charts honestly.
 */
export function BarChart({ spec, theme }: { spec: BarSpec; theme: ChartTheme }) {
  const { values, labels, highlightIndex, highlightTone, targetIndex, yLabel } = spec;
  // The highlighted bar carries meaning when a tone is set (green = good/kept,
  // rust = cost/loss/risk); otherwise it just marks focus in the neutral accent.
  const highlightFill =
    highlightTone === 'positive'
      ? theme.positive
      : highlightTone === 'negative'
        ? theme.negative
        : theme.accent;
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const domain: Domain = { min, max: max === min ? max + 1 : max };
  const zeroY = yAt(0, domain);

  // Result-vs-forecast: when the highlighted bar came in below a dashed target,
  // a rust marker points out the shortfall (a taller target sits at a smaller y).
  const showMiss =
    targetIndex !== undefined &&
    highlightIndex !== undefined &&
    yAt(values[targetIndex], domain) < yAt(values[highlightIndex], domain);
  let miss: { targetY: number; hlY: number; ax: number; x1: number; x2: number } | null = null;
  if (showMiss) {
    const targetY = yAt(values[targetIndex!], domain);
    const hlY = yAt(values[highlightIndex!], domain);
    const band = bandAt(highlightIndex!, values.length);
    const bw = Math.max(8, Math.min(38, band.width * 0.6));
    const ax = band.centre + bw / 2 + 7;
    miss = { targetY, hlY, ax, x1: band.centre - bw / 2 - 4, x2: ax + 6 };
  }

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
          opacity={0.14}
        />
      ))}
      <Line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x0} y2={PLOT.y1} stroke={theme.ink} strokeWidth={2.5} />
      <Line x1={PLOT.x0} y1={zeroY} x2={PLOT.x1} y2={zeroY} stroke={theme.ink} strokeWidth={2.5} />

      {values.map((value, i) => {
        const { centre, width } = bandAt(i, values.length);
        const barWidth = Math.max(8, Math.min(38, width * 0.6));
        const y = yAt(value, domain);
        const top = Math.min(y, zeroY);
        const height = Math.max(2, Math.abs(zeroY - y));
        const highlighted = highlightIndex === i;
        const isTarget = targetIndex === i;
        // Labels are fitted to their own band, so multi-word categories wrap
        // and shrink instead of colliding with their neighbours.
        const label = fitLabel(labels[i] ?? '', width - 2);

        return (
          <G key={`bar-${i}`}>
            <Rect
              x={centre - barWidth / 2}
              y={top}
              width={barWidth}
              height={height}
              rx={4}
              fill={isTarget ? 'none' : highlighted ? highlightFill : theme.bg}
              stroke={theme.ink}
              strokeWidth={2.5}
              strokeDasharray={isTarget ? '5 4' : undefined}
            />
            {values.length <= 4 ? (
              <SvgText
                x={centre}
                y={Math.max(PLOT.y0 + 10, top - 7)}
                fill={theme.ink}
                fontSize={10}
                fontFamily={fontFamily.bodyBold}
                textAnchor="middle"
              >
                {Number.isInteger(value) ? value : value.toFixed(1)}
              </SvgText>
            ) : null}
            {label.lines.map((line, lineIndex) => (
              <SvgText
                key={lineIndex}
                x={centre}
                y={PLOT.y1 + 14 + lineIndex * (label.fontSize + 2)}
                fill={theme.ink}
                fontSize={label.fontSize}
                fontFamily={fontFamily.bodyBold}
                textAnchor="middle"
              >
                {line}
              </SvgText>
            ))}
          </G>
        );
      })}

      {miss && (
        <G>
          {/* The forecast level, carried across to the shortfall. */}
          <Line
            x1={miss.x1}
            y1={miss.targetY}
            x2={miss.x2}
            y2={miss.targetY}
            stroke={theme.negative}
            strokeWidth={1.5}
            strokeDasharray="2 4"
          />
          {/* How far the result fell short. */}
          <Line x1={miss.ax} y1={miss.targetY + 1} x2={miss.ax} y2={miss.hlY - 3} stroke={theme.negative} strokeWidth={2} />
          <Path d={`M${miss.ax - 4} ${miss.hlY - 5} L${miss.ax + 4} ${miss.hlY - 5} L${miss.ax} ${miss.hlY + 1} Z`} fill={theme.negative} />
        </G>
      )}

      {yLabel && (
        <SvgText
          x={0}
          y={0}
          fill={theme.ink}
          fontSize={10}
          fontFamily={fontFamily.bodyBold}
          textAnchor="middle"
          transform={`translate(14, ${PLOT.y0 + PLOT.height / 2}) rotate(-90)`}
        >
          {yLabel.toUpperCase()}
        </SvgText>
      )}
    </G>
  );
}
