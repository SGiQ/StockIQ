/** A delayed quote for one symbol. Educational context, not a trading feed. */
export interface Quote {
  symbol: string;
  /** Current (delayed) price. */
  price: number;
  /** Absolute change on the day. */
  change: number;
  /** Percent change on the day. */
  changePercent: number;
  /** Previous close. */
  previousClose: number;
  /** False when the data source has no data for the symbol. */
  valid: boolean;
}

export type MarketFailure = 'not_configured' | 'offline' | 'rate_limited' | 'unknown';

export class MarketError extends Error {
  constructor(
    readonly kind: MarketFailure,
    message: string,
  ) {
    super(message);
    this.name = 'MarketError';
  }
}

export interface MarketService {
  /** Live quotes for the given symbols. Order is not guaranteed. */
  quotes(symbols: string[]): Promise<Quote[]>;
  /** True when backed by the real proxy (false = dev mock). */
  isLive(): boolean;
}
