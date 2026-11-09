import { G, Line, Path, Text as SvgText } from 'react-native-svg';
import type { ChartSpec, OptionLeg } from '@/content/types';
import { palette, fontFamily } from '@/theme/tokens';
import { PLOT, domainOf, polylineLength, xAt, yAt } from './scale';
import type { ChartTheme } from './LineChart';

type PayoffSpec = Extract<ChartSpec, { type: 'payoff' }>;

/** Profit/loss of one leg at a given spot price, at expiry. */
function legPayoff(leg: OptionLeg, spot: number): number {
  const quantity = leg.quantity ?? 1;
  const premium = leg.premium ?? 0;
  const strike = leg.strike ?? 0;
  const direction = leg.side === 'long' ? 1 : -1;

  switch (leg.kind) {
    case 'stock':
      // `strike` doubles as the entry price for a stock leg.
      return direction * (spot - strike) * quantity;
    case 'call':
      return direction * (Math.max(0, spot - strike) - premium) * quantity;
    case 'put':
      return direction * (Math.max(0, strike - spot) - premium) * quantity;
  }
}

const totalPayoff = (legs: OptionLeg[], spot: number): number =>
  legs.reduce((sum, leg) => sum + legPayoff(leg, spot), 0);

/**
 * Expiry payoff diagram for covered calls, the wheel, and protective puts.
 *
 * Rendered as a polyline sampled across the spot range, with the profit and
 * loss halves filled in semantic green and red — the shape of the kink at
 * each strike is the entire lesson, and it falls out of the arithmetic.
 */
export function PayoffChart({ spec, theme, progress = 1 }: { spec: PayoffSpec; theme: ChartTheme; progress?: number }) {
  const { legs, spotRange } = spec;

  const strikes = legs.map((l) => l.strike ?? 0).filter((s) => s > 0);
  const centre = strikes.length ? strikes.reduce((a, b) => a + b, 0) / strikes.length : 100;
  const [lo, hi] = spotRange ?? [centre * 0.6, centre * 1.4];

  const SAMPLES = 80;
  const spots = Array.from({ length: SAMPLES }, (_, i) => lo + ((hi - lo) * i) / (SAMPLES - 1));
  const values = spots.map((spot) => totalPayoff(legs, spot));

  // Force zero into the domain so the break-even line is always on-screen.
  const domain = domainOf([...values, 0], 0.12);
  const zeroY = yAt(0, domain);

  const points = values.map((value, i) => ({ x: xAt(i, SAMPLES), y: yAt(value, domain) }));
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  // Entrance: the payoff line draws across the spot range, then the profit
  // and loss fills come up behind it so the kink reads before the colour.
  const drawing = progress < 1;
  const lineLength = polylineLength(points) + 2;
  const fillReveal = Math.max(0, Math.min(1, (progress - 0.5) / 0.5));

  // Fill between the payoff line and the zero line, clipped to each side by
  // splitting the polygon at the break-even crossings.
  const fillPath = (side: 'profit' | 'loss') => {
    const segments: string[] = [];
    let open: Array<{ x: number; y: number }> = [];

    const inSide = (v: number) => (side === 'profit' ? v > 0 : v < 0);

    values.forEach((value, i) => {
      if (inSide(value)) {
        open.push(points[i]);
      } else if (open.length) {
        segments.push(closeAgainstZero(open, zeroY));
        open = [];
      }
    });
    if (open.length) segments.push(closeAgainstZero(open, zeroY));
    return segments.join(' ');
  };

  return (
    <G>
      <Line x1={PLOT.x0} y1={PLOT.y0} x2={PLOT.x0} y2={PLOT.y1} stroke={theme.ink} strokeWidth={2.5} />

      <Path d={fillPath('profit')} fill={palette.emerald} opacity={0.35 * fillReveal} />
      <Path d={fillPath('loss')} fill={palette.danger} opacity={0.28 * fillReveal} />

      {/* break-even */}
      <Line
        x1={PLOT.x0}
        y1={zeroY}
        x2={PLOT.x1}
        y2={zeroY}
        stroke={theme.ink}
        strokeWidth={2}
        strokeDasharray="5 4"
      />
      <SvgText
        x={PLOT.x0 + 4}
        y={zeroY - 5}
        fill={theme.ink}
        fontSize={9}
        fontFamily={fontFamily.bodyBold}
      >
        BREAK EVEN
      </SvgText>

      {/* strike guides */}
      {strikes.map((strike, i) => {
        const t = (strike - lo) / (hi - lo);
        if (t < 0 || t > 1) return null;
        const x = PLOT.x0 + t * PLOT.width;
        return (
          <G key={`strike-${i}`}>
            <Line
              x1={x}
              y1={PLOT.y0}
              x2={x}
              y2={PLOT.y1}
              stroke={theme.ink}
              strokeWidth={1.25}
              strokeDasharray="3 4"
              opacity={0.45}
            />
            <SvgText
              x={x}
              y={PLOT.y1 + 15}
              fill={theme.ink}
              fontSize={9}
              fontFamily={fontFamily.bodyBold}
              textAnchor="middle"
            >
              {`$${Math.round(strike)}`}
            </SvgText>
          </G>
        );
      })}

      <Path
        d={line}
        fill="none"
        stroke={theme.ink}
        strokeWidth={3.5}
        strokeLinejoin="round"
        strokeDasharray={drawing ? lineLength : undefined}
        strokeDashoffset={drawing ? lineLength * (1 - Math.min(1, progress / 0.7)) : undefined}
      />

      <SvgText
        x={0}
        y={0}
        fill={theme.ink}
        fontSize={10}
        fontFamily={fontFamily.bodyBold}
        textAnchor="middle"
        transform={`translate(14, ${PLOT.y0 + PLOT.height / 2}) rotate(-90)`}
      >
        PROFIT / LOSS
      </SvgText>
      <SvgText
        x={PLOT.x0 + PLOT.width / 2}
        y={PLOT.y1 + 29}
        fill={theme.ink}
        fontSize={10}
        fontFamily={fontFamily.bodyBold}
        textAnchor="middle"
      >
        SHARE PRICE AT EXPIRY
      </SvgText>
    </G>
  );
}

/** Closes a run of same-sign points back along the zero line. */
function closeAgainstZero(run: Array<{ x: number; y: number }>, zeroY: number): string {
  const first = run[0];
  const last = run[run.length - 1];
  const body = run.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  return `${body} L${last.x} ${zeroY} L${first.x} ${zeroY} Z`;
}
