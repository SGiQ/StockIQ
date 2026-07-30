import { G, Line, Path, Text as SvgText } from 'react-native-svg';
import type { ChartSpec } from '@/content/types';
import { fontFamily } from '@/theme/tokens';
import {
  PLOT,
  domainOf,
  formatMoney,
  smoothPath,
  xAt,
  yAt,
} from './scale';
import type { ChartTheme } from './LineChart';

type CompoundingSpec = Extract<ChartSpec, { type: 'compounding' }>;

/**
 * Compound growth, computed rather than drawn.
 *
 * This is the clearest case for the parametric-art strategy: an author
 * writes `{principal: 10000, rate: 0.08, years: 30}` and gets a curve that
 * is *arithmetically correct*. A hand-drawn "compounding curve" would only
 * ever be a gesture at the shape, and would quietly teach the wrong slope.
 */
function project(principal: number, rate: number, years: number, contribution = 0): number[] {
  const out: number[] = [];
  let balance = principal;
  for (let year = 0; year <= years; year++) {
    out.push(balance);
    balance = balance * (1 + rate) + contribution;
  }
  return out;
}

export function CompoundingChart({
  spec,
  theme,
}: {
  spec: CompoundingSpec;
  theme: ChartTheme;
}) {
  const { principal, rate, years, contribution, compareRate } = spec;

  const main = project(principal, rate, years, contribution);
  const compare =
    compareRate !== undefined ? project(principal, compareRate, years, contribution) : null;

  // Both curves share one domain so the gap between them is readable as the
  // actual difference rather than an artefact of independent scaling.
  const domain = domainOf([0, ...main, ...(compare ?? [])], 0.05);
  const toPoints = (series: number[]) =>
    series.map((value, i) => ({ x: xAt(i, series.length), y: yAt(value, domain) }));

  return (
    <G>
      <Line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x0} y2={PLOT.y1} stroke={theme.ink} strokeWidth={2.5} />
      <Line x1={PLOT.x0} y1={PLOT.y1} x2={PLOT.x1} y2={PLOT.y1} stroke={theme.ink} strokeWidth={2.5} />

      {compare && (
        <>
          <Path
            d={smoothPath(toPoints(compare))}
            fill="none"
            stroke={theme.ink}
            strokeWidth={2.5}
            strokeDasharray="6 5"
            opacity={0.45}
            strokeLinecap="round"
          />
          <SvgText
            x={PLOT.x1 - 2}
            y={yAt(compare[compare.length - 1], domain) + 14}
            fill={theme.ink}
            fontSize={9}
            fontFamily={fontFamily.bodyBold}
            opacity={0.7}
            textAnchor="end"
          >
            {`${Math.round(compareRate! * 100)}% · ${formatMoney(compare[compare.length - 1])}`}
          </SvgText>
        </>
      )}

      <Path
        d={smoothPath(toPoints(main))}
        fill="none"
        stroke={theme.ink}
        strokeWidth={3.5}
        strokeLinecap="round"
      />

      <SvgText
        x={PLOT.x1 - 2}
        y={yAt(main[main.length - 1], domain) - 8}
        fill={theme.ink}
        fontSize={11}
        fontFamily={fontFamily.bodyBold}
        textAnchor="end"
      >
        {`${Math.round(rate * 100)}% · ${formatMoney(main[main.length - 1])}`}
      </SvgText>

      <SvgText
        x={PLOT.x0}
        y={PLOT.y1 + 15}
        fill={theme.ink}
        fontSize={10}
        fontFamily={fontFamily.bodyBold}
        textAnchor="start"
      >
        YEAR 0
      </SvgText>
      <SvgText
        x={PLOT.x1}
        y={PLOT.y1 + 15}
        fill={theme.ink}
        fontSize={10}
        fontFamily={fontFamily.bodyBold}
        textAnchor="end"
      >
        {`YEAR ${years}`}
      </SvgText>
      <SvgText
        x={0}
        y={0}
        fill={theme.ink}
        fontSize={10}
        fontFamily={fontFamily.bodyBold}
        textAnchor="middle"
        transform={`translate(14, ${PLOT.y0 + PLOT.height / 2}) rotate(-90)`}
      >
        BALANCE
      </SvgText>
    </G>
  );
}
