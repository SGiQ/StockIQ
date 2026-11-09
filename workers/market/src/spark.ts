/**
 * Turn a raw Finnhub /stock/candle payload into a small intraday series.
 *
 * Pure, so it is unit-tested from the repo root (tests/market.test.ts) like
 * quote.ts. A sparkline is decoration beside a price, not a chart someone
 * reads values off, so it is cut down hard: the last trading session only,
 * downsampled to a few dozen points. That keeps the payload for a 25-symbol
 * watchlist under a few kilobytes and makes it cacheable for a long time.
 */

/** Raw Finnhub /stock/candle fields we read. */
export interface FinnhubCandles {
  /** Close per bar. */
  c?: number[];
  /** Unix seconds per bar. */
  t?: number[];
  /** 'ok' or 'no_data'. */
  s?: string;
}

export interface Spark {
  symbol: string;
  /** Closes across the last session, oldest first. Empty when nothing usable came back. */
  points: number[];
  /** Unix ms of the first and last bar kept. */
  start?: number;
  end?: number;
}

/** Upper bound on points per symbol; see the file header for why so few. */
export const SPARK_POINTS = 32;

/**
 * Keep only the bars from the most recent session — the UTC calendar day of
 * the last bar. US regular hours (13:30–21:00 UTC) never straddle UTC midnight,
 * so a day boundary is a session boundary for this purpose.
 */
export function lastSessionBars(closes: number[], times: number[]): { c: number[]; t: number[] } {
  const n = Math.min(closes.length, times.length);
  if (n === 0) return { c: [], t: [] };
  const lastDay = Math.floor(times[n - 1]! / 86400);
  let start = n - 1;
  while (start > 0 && Math.floor(times[start - 1]! / 86400) === lastDay) start -= 1;
  return { c: closes.slice(start, n), t: times.slice(start, n) };
}

/**
 * Evenly thin a series to at most `max` points, always keeping the first and
 * last so the day's open-to-close shape and final print survive.
 */
export function downsample<T>(values: T[], max: number): T[] {
  if (values.length <= max || max < 2) return values.slice(0, Math.max(0, max === 1 ? 1 : values.length));
  const out: T[] = [];
  const step = (values.length - 1) / (max - 1);
  for (let i = 0; i < max; i += 1) out.push(values[Math.round(i * step)]!);
  return out;
}

export function normalizeSpark(symbol: string, raw: FinnhubCandles, max: number = SPARK_POINTS): Spark {
  if (raw.s !== 'ok' || !raw.c || !raw.t) return { symbol, points: [] };
  const session = lastSessionBars(
    raw.c.filter((v) => Number.isFinite(v)),
    raw.t,
  );
  if (session.c.length < 2) return { symbol, points: [] };
  const idx = downsample(session.c.map((_, i) => i), max);
  return {
    symbol,
    points: idx.map((i) => session.c[i]!),
    start: session.t[idx[0]!]! * 1000,
    end: session.t[idx[idx.length - 1]!]! * 1000,
  };
}
