/**
 * Turn a raw Finnhub /quote payload into the shape the app consumes.
 *
 * Pure, so it is unit-tested from the repo root (tests/market.test.ts) without
 * a Worker runtime. The one rule that matters: a price that is really the
 * previous session's close is always FLAGGED as such. The app never renders a
 * tradable-looking number without saying how old it is.
 */

/** Raw Finnhub /quote fields we read. */
export interface FinnhubQuote {
  /** Current price. 0 when Finnhub has no data (or, on some payloads, no session). */
  c?: number;
  /** Absolute change on the day. */
  d?: number;
  /** Percent change on the day. */
  dp?: number;
  /** Previous close. */
  pc?: number;
  /** Unix seconds of the last trade. */
  t?: number;
}

export type QuoteAsOf = 'delayed' | 'last_close';

export interface Quote {
  symbol: string;
  /** Current price, or the last close when `asOf` is 'last_close'. */
  price: number;
  /** Absolute change on the day. */
  change: number;
  /** Percent change on the day. */
  changePercent: number;
  /** Previous close, for context. */
  previousClose: number;
  /** False when Finnhub has no data for the symbol (all-zero response). */
  valid: boolean;
  /** 'last_close' when the price is the previous session's close, not a live print. */
  asOf: QuoteAsOf;
  /** Unix ms of the last trade Finnhub reported, when known. */
  updatedAt?: number;
}

/**
 * A "current" price whose last trade is older than this is the last session's
 * close (weekend, holiday, overnight). Twelve hours clears any regular
 * session plus after-hours without flagging a mid-day print.
 */
export const STALE_AFTER_MS = 12 * 60 * 60 * 1000;

export function normalizeQuote(symbol: string, q: FinnhubQuote, now: number = Date.now()): Quote {
  const c = q.c ?? 0;
  const pc = q.pc ?? 0;
  const updatedAt = q.t && q.t > 0 ? q.t * 1000 : undefined;

  if (c > 0) {
    const stale = updatedAt !== undefined && now - updatedAt > STALE_AFTER_MS;
    return {
      symbol,
      price: c,
      change: q.d ?? 0,
      changePercent: q.dp ?? 0,
      previousClose: pc,
      valid: true,
      asOf: stale ? 'last_close' : 'delayed',
      updatedAt,
    };
  }

  if (pc > 0) {
    // No current price but a previous close: a closed-market or thin payload.
    // Serve the close so the screen has a number, flagged so nobody mistakes
    // it for a live print. The day's change is unknown here, hence zero.
    return {
      symbol,
      price: pc,
      change: 0,
      changePercent: 0,
      previousClose: pc,
      valid: true,
      asOf: 'last_close',
      updatedAt,
    };
  }

  // Finnhub returns all zeros for an unknown symbol.
  return { symbol, price: 0, change: 0, changePercent: 0, previousClose: 0, valid: false, asOf: 'delayed', updatedAt };
}
