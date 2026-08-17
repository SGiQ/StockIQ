import { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { ChartSpec } from '@/content/types';
import { palette, fontFamily } from '@/theme/tokens';
import {
  PLOT,
  domainOf,
  fitLabel,
  smoothPath,
  type Domain,
} from './scale';

type LineSpec = Extract<ChartSpec, { type: 'line' }>;

export interface ChartTheme {
  ink: string;
  accent: string;
  bg: string;
  /** Semantic highlight colours: good/kept/grown vs cost/loss/risk. */
  positive: string;
  negative: string;
}

const SMA_COLORS = ['#E0A82E', '#4A90E2', '#8B5CF6'] as const;

function straightPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
}

function computeSma(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    return sum / period;
  });
}

/**
 * When volume or sma data is present, switches to a "stock chart" layout
 * with price labels, volume bars, and SMA overlays.
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
    volume,
    sma,
  } = spec;

  const isStockMode = !!(volume?.length || sma?.length);
  const LABEL_W = isStockMode ? 30 : 0;
  const chartX1 = PLOT.x1 - LABEL_W;
  const chartWidth = chartX1 - PLOT.x0;

  const hasVolume = volume && volume.some((v) => v > 0);
  const volGap = 6;
  const volFraction = 0.22;
  const priceBottom = hasVolume
    ? PLOT.y0 + PLOT.height * (1 - volFraction - volGap / PLOT.height)
    : PLOT.y1;
  const priceHeight = priceBottom - PLOT.y0;
  const volTop = priceBottom + volGap;
  const volHeight = PLOT.y1 - volTop;

  const domain: Domain = domainOf(
    compareSeries ? [...series, ...compareSeries] : series,
  );

  const localX = (index: number, count: number): number => {
    if (count <= 1) return PLOT.x0 + chartWidth / 2;
    return PLOT.x0 + (index / (count - 1)) * chartWidth;
  };

  const localY = (value: number): number => {
    const t = (value - domain.min) / (domain.max - domain.min);
    return priceBottom - t * priceHeight;
  };

  const toPoints = (values: number[]) =>
    values.map((value, i) => ({ x: localX(i, values.length), y: localY(value) }));
  const points = toPoints(series);
  const lineFn = isStockMode ? straightPath : smoothPath;
  const path = lineFn(points);

  const shade = (() => {
    if (shadeFrom === undefined || shadeFrom >= series.length - 1) return null;
    const baseline = localY(series[shadeFrom]);
    const tail = points.slice(shadeFrom);
    const outline = lineFn(tail);
    const last = tail[tail.length - 1];
    const first = tail[0];
    return `${outline} L${last.x} ${baseline} L${first.x} ${baseline} Z`;
  })();

  const maxVol = hasVolume ? Math.max(...volume!, 1) : 1;

  return (
    <G>
      {/* Grid lines */}
      {isStockMode
        ? [0.25, 0.5, 0.75].map((f) => {
            const value = domain.min + (domain.max - domain.min) * f;
            const y = priceBottom - f * priceHeight;
            return (
              <G key={`grid-${f}`}>
                <Line
                  x1={PLOT.x0}
                  y1={y}
                  x2={chartX1}
                  y2={y}
                  stroke={theme.ink}
                  strokeWidth={0.5}
                  strokeDasharray="2 4"
                  opacity={0.2}
                />
                <SvgText
                  x={chartX1 + 4}
                  y={y + 3}
                  fill={theme.ink}
                  fontSize={7}
                  fontFamily={fontFamily.bodyRegular}
                  textAnchor="start"
                  opacity={0.5}
                >
                  {`$${Math.round(value)}`}
                </SvgText>
              </G>
            );
          })
        : [0.25, 0.5, 0.75].map((fraction) => (
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

      {/* Axes */}
      <Line
        x1={PLOT.x0}
        y1={PLOT.y0}
        x2={PLOT.x0}
        y2={priceBottom}
        stroke={theme.ink}
        strokeWidth={isStockMode ? 1.5 : 2.5}
        opacity={isStockMode ? 0.3 : 1}
      />
      <Line
        x1={PLOT.x0}
        y1={priceBottom}
        x2={chartX1}
        y2={priceBottom}
        stroke={theme.ink}
        strokeWidth={isStockMode ? 1.5 : 2.5}
        opacity={isStockMode ? 0.3 : 1}
      />

      {/* Volume bars */}
      {hasVolume &&
        volume!.map((v, i) => {
          if (v <= 0) return null;
          const x = localX(i, series.length);
          const barWidth = Math.max(2, Math.min(12, (chartWidth / series.length) * 0.5));
          const barTop = volTop + volHeight - (v / maxVol) * volHeight;
          const rising = i === 0 || series[i] >= series[i - 1];
          return (
            <Rect
              key={`vol-${i}`}
              x={x - barWidth / 2}
              y={barTop}
              width={barWidth}
              height={PLOT.y1 - barTop}
              fill={rising ? palette.emerald : palette.danger}
              opacity={0.25}
            />
          );
        })}

      {shade && <Path d={shade} fill={theme.accent} opacity={0.35} />}

      {/* Compare series */}
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
              x={chartX1 - 2}
              y={Math.min(
                localY(compareSeries[compareSeries.length - 1]) + 14,
                priceBottom - 3,
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

      {/* Main line */}
      <Path
        d={path}
        fill="none"
        stroke={theme.ink}
        strokeWidth={isStockMode ? 2 : 3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data point dots (non-stock mode only) */}
      {!isStockMode &&
        points.map((point, index) => {
          const last = index === points.length - 1;
          return (
            <Circle
              key={`point-${index}`}
              cx={point.x}
              cy={point.y}
              r={last ? 4.5 : 2.25}
              fill={last ? theme.accent : theme.bg}
              stroke={theme.ink}
              strokeWidth={last ? 2.25 : 1.5}
            />
          );
        })}

      {/* SMA overlay lines */}
      {sma?.map((period, si) => {
        const values = computeSma(series, period);
        const smaPoints = values
          .map((v, i) => {
            if (v == null) return null;
            return { x: localX(i, series.length), y: localY(v) };
          })
          .filter(Boolean) as Array<{ x: number; y: number }>;
        if (smaPoints.length < 2) return null;
        return (
          <Path
            key={`sma-${period}`}
            d={smoothPath(smaPoints)}
            stroke={SMA_COLORS[si % SMA_COLORS.length]}
            strokeWidth={1.5}
            fill="none"
            opacity={0.8}
          />
        );
      })}

      {/* Marker guides */}
      {markers?.map((marker, i) => {
        const index = Math.min(marker.at, series.length - 1);
        const x = localX(index, series.length);
        const y = localY(series[index]);
        return (
          <G key={`marker-${i}`}>
            {isStockMode ? (
              <>
                <Line
                  x1={x}
                  y1={y - 6}
                  x2={x}
                  y2={PLOT.y0 + 8}
                  stroke={theme.ink}
                  strokeWidth={1.5}
                />
                <SvgText
                  x={x}
                  y={PLOT.y0 + 2}
                  fill={theme.ink}
                  fontSize={9}
                  fontFamily={fontFamily.bodyBold}
                  textAnchor="middle"
                >
                  {marker.label.toUpperCase()}
                </SvgText>
              </>
            ) : (
              <>
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
              </>
            )}
          </G>
        );
      })}

      {/* Shade label */}
      {shade && shadeLabel && (
        <SvgText
          x={chartX1 - 4}
          y={PLOT.y0 + 12}
          fill={theme.ink}
          fontSize={10}
          fontFamily={fontFamily.bodyBold}
          textAnchor="end"
        >
          {shadeLabel.toUpperCase()}
        </SvgText>
      )}

      {/* x tick labels */}
      {!markers &&
        xLabels?.map((label, i) => {
          const fitted = fitLabel(label, chartWidth / xLabels.length - 2);
          return fitted.lines.map((line, lineIndex) => (
            <SvgText
              key={`x-${i}-${lineIndex}`}
              x={localX(i, xLabels.length)}
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
          transform={`translate(14, ${PLOT.y0 + priceHeight / 2}) rotate(-90)`}
        >
          {yLabel.toUpperCase()}
        </SvgText>
      )}

      {xLabel && (
        <SvgText
          x={PLOT.x0 + chartWidth / 2}
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
