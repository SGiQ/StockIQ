import { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import type { ChartSpec } from '@/content/types';
import { fontFamily } from '@/theme/tokens';
import {
  PLOT,
  domainOf,
  fitLabel,
  smoothPath,
  xAt,
  yAt,
  type Domain,
} from './scale';

type LineSpec = Extract<ChartSpec, { type: 'line' }>;

export interface ChartTheme {
  ink: string;
  accent: string;
  bg: string;
}

/**
 * The workhorse. Its shaded-region mode reproduces the "SHARE PRICE /
 * POTENTIAL PROFIT" card from the Imprint screenshots, which is itself a
 * computed chart rather than an illustration — the clearest evidence that
 * finance content does not need a drawn-art pipeline.
 */
export function LineChart({ spec, theme }: { spec: LineSpec; theme: ChartTheme }) {
  const {
    series,
    compareSeries,
    compareLabel,
    xLabels,
    xLabel,
    yLabel,
    shadeFrom,
    shadeLabel,
    markers,
  } = spec;

  // Both curves share one domain so the gap between them is readable as the
  // actual difference rather than an artefact of independent scaling. The
  // schema pins the two series to the same length, so they also share the x
  // positions index-for-index.
  const domain: Domain = domainOf(compareSeries ? [...series, ...compareSeries] : series);
  const toPoints = (values: number[]) =>
    values.map((value, i) => ({ x: xAt(i, values.length), y: yAt(value, domain) }));
  const points = toPoints(series);
  const path = smoothPath(points);

  // The shaded region runs from `shadeFrom` to the end, closed along the
  // horizontal at the shadeFrom value — that reads as "gain relative to
  // here" rather than "area under the curve".
  const shade = (() => {
    if (shadeFrom === undefined || shadeFrom >= series.length - 1) return null;
    const baseline = yAt(series[shadeFrom], domain);
    const tail = points.slice(shadeFrom);
    const outline = smoothPath(tail);
    const last = tail[tail.length - 1];
    const first = tail[0];
    return `${outline} L${last.x} ${baseline} L${first.x} ${baseline} Z`;
  })();

  return (
    <G>
      {/* axes */}
      <Line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x0} y2={PLOT.y1} stroke={theme.ink} strokeWidth={2.5} />
      <Line x1={PLOT.x0} y1={PLOT.y1} x2={PLOT.x1} y2={PLOT.y1} stroke={theme.ink} strokeWidth={2.5} />

      {shade && <Path d={shade} fill={theme.accent} opacity={0.35} />}

      {/* the contrast curve, drawn under the primary so the subject stays on top */}
      {compareSeries && (
        <>
          <Path
            d={smoothPath(toPoints(compareSeries))}
            fill="none"
            stroke={theme.ink}
            strokeWidth={2.5}
            strokeDasharray="6 5"
            opacity={0.45}
            strokeLinecap="round"
          />
          {compareLabel && (
            <SvgText
              x={PLOT.x1 - 2}
              // Clamped into the plot: unlike the compounding chart, this one
              // can have tick labels directly under the axis to collide with.
              y={Math.min(
                yAt(compareSeries[compareSeries.length - 1], domain) + 14,
                PLOT.y1 - 3,
              )}
              fill={theme.ink}
              fontSize={9}
              fontFamily={fontFamily.bodyBold}
              opacity={0.7}
              textAnchor="end"
            >
              {compareLabel.toUpperCase()}
            </SvgText>
          )}
        </>
      )}

      <Path
        d={path}
        fill="none"
        stroke={theme.ink}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* marker guides */}
      {markers?.map((marker, i) => {
        const index = Math.min(marker.at, series.length - 1);
        const x = xAt(index, series.length);
        const y = yAt(series[index], domain);
        return (
          <G key={`marker-${i}`}>
            <Line
              x1={x}
              y1={y}
              x2={x}
              y2={PLOT.y1}
              stroke={theme.ink}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.5}
            />
            <Circle
              cx={x}
              cy={y}
              r={marker.emphasis ? 6 : 4.5}
              fill={marker.emphasis ? theme.ink : theme.bg}
              stroke={theme.ink}
              strokeWidth={2.5}
            />
            <SvgText
              x={x}
              y={PLOT.y1 + 15}
              fill={theme.ink}
              fontSize={10}
              fontFamily={fontFamily.bodyBold}
              textAnchor="middle"
            >
              {marker.label.toUpperCase()}
            </SvgText>
          </G>
        );
      })}

      {/* the shaded region's own label, placed inside the region */}
      {shade && shadeLabel && (
        <SvgText
          x={PLOT.x1 - 4}
          y={PLOT.y0 + 12}
          fill={theme.ink}
          fontSize={10}
          fontFamily={fontFamily.bodyBold}
          textAnchor="end"
        >
          {shadeLabel.toUpperCase()}
        </SvgText>
      )}

      {/* x tick labels, only when no markers already label the axis */}
      {!markers &&
        xLabels?.map((label, i) => {
          // Same fitting as the bar chart so long tick labels wrap rather
          // than overrun their neighbours.
          const fitted = fitLabel(label, PLOT.width / xLabels.length - 2);
          return fitted.lines.map((line, lineIndex) => (
            <SvgText
              key={`x-${i}-${lineIndex}`}
              x={xAt(i, xLabels.length)}
              y={PLOT.y1 + 14 + lineIndex * (fitted.fontSize + 2)}
              fill={theme.ink}
              fontSize={fitted.fontSize}
              fontFamily={fontFamily.bodyBold}
              textAnchor="middle"
            >
              {line}
            </SvgText>
          ));
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

      {xLabel && (
        <SvgText
          x={PLOT.x0 + PLOT.width / 2}
          y={PLOT.y1 + 29}
          fill={theme.ink}
          fontSize={10}
          fontFamily={fontFamily.bodyBold}
          textAnchor="middle"
        >
          {xLabel.toUpperCase()}
        </SvgText>
      )}
    </G>
  );
}
