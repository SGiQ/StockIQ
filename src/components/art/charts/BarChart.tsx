import { G, Line, Rect, Text as SvgText } from 'react-native-svg';
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
  const { values, labels, highlightIndex, yLabel } = spec;
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const domain: Domain = { min, max: max === min ? max + 1 : max };
  const zeroY = yAt(0, domain);

  return (
    <G>
      <Line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x0} y2={PLOT.y1} stroke={theme.ink} strokeWidth={2.5} />
      <Line x1={PLOT.x0} y1={zeroY} x2={PLOT.x1} y2={zeroY} stroke={theme.ink} strokeWidth={2.5} />

      {values.map((value, i) => {
        const { centre, width } = bandAt(i, values.length);
        const barWidth = Math.max(8, Math.min(38, width * 0.6));
        const y = yAt(value, domain);
        const top = Math.min(y, zeroY);
        const height = Math.max(2, Math.abs(zeroY - y));
        const highlighted = highlightIndex === i;
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
              fill={highlighted ? theme.accent : theme.bg}
              stroke={theme.ink}
              strokeWidth={2.5}
            />
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
