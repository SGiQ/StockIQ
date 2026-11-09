/** How current a quote's price is. */
export type QuoteAsOf = 'delayed' | 'last_close';

/** A delayed quote for one symbol. Educational context, not a trading feed. */
export interface Quote {
  symbol: string;
  /** Current (delayed) price, or the last close when `asOf` is 'last_close'. */
  price: number;
  /** Absolute change on the day. */
  change: number;
  /** Percent change on the day. */
  changePercent: number;
  /** Previous close. */
  previousClose: number;
  /** False when the data source has no data for the symbol. */
  valid: boolean;
  /**
   * 'last_close' when the price is the previous session's close rather than a
   * live print (weekend, holiday, overnight). Optional only so an older Worker
   * build without the field still parses; absent reads as 'delayed'.
   */
  asOf?: QuoteAsOf;
  /** Unix ms of the last trade, when the source reports it. */
  updatedAt?: number;
}

export type MarketFailure =
  /** No EXPO_PUBLIC_MARKET_URL, or the Worker has no provider key. */
  | 'not_configured'
  /** The Worker could not be reached at all. */
  | 'offline'
  /** Worker or provider rate limit. */
  | 'rate_limited'
  /** The provider rejected the Worker's key or is down. */
  | 'upstream'
  | 'unknown';

export class MarketError extends Error {
  constructor(
    readonly kind: MarketFailure,
    message: string,
    /** Operator-facing detail from the Worker, e.g. "market key rejected by Finnhub". */
    readonly detail?: string,
  ) {
    super(message);
    this.name = 'MarketError';
  }

  /**
   * False when retrying the same request cannot help (no key, key rejected).
   * The backfill loop stops early on these instead of hammering a dead proxy.
   */
  get retryable(): boolean {
    return this.kind !== 'not_configured' && this.kind !== 'upstream';
  }
}

/** The message to show a learner for any thrown value from the market layer. */
export const marketErrorMessage = (e: unknown, fallback = 'Market data is unavailable.'): string =>
  e instanceof MarketError ? e.message : fallback;

export interface MarketService {
  /** Live quotes for the given symbols. Order is not guaranteed. */
  quotes(symbols: string[]): Promise<Quote[]>;
  /** True when backed by the real proxy (false = dev mock). */
  isLive(): boolean;
}
