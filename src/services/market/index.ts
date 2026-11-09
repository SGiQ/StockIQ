/**
 * Market-data composition root — proxy when deployed, mock otherwise.
 *
 * Same one-ternary shape as the ASK root: no screen or component knows which
 * backend it got. The proxy keeps the Finnhub key off the device; the mock
 * keeps the watchlist demoable before the Worker exists.
 */
import { isMarketConfigured } from '@/config';
import { quotesWithBackfill as backfill } from './backfill';
import { MockMarketService } from './MockMarketService';
import { ProxyMarketService } from './ProxyMarketService';
import type { MarketService, Quote, Spark } from './types';

export const marketService: MarketService = isMarketConfigured()
  ? new ProxyMarketService()
  : new MockMarketService();

/** True when quotes are real; false when they're the dev placeholder. */
export const isMarketLive = (): boolean => marketService.isLive();

/**
 * Progressive, retrying quote fetch against the configured service. Rejects
 * when the run ends with no quotes at all — see `backfill.ts` for the rules.
 */
export const quotesWithBackfill = (
  symbols: string[],
  onUpdate: (bySymbol: Record<string, Quote>) => void,
  isCancelled: () => boolean = () => false,
): Promise<void> => backfill(marketService, symbols, onUpdate, isCancelled);

/**
 * Session cache of the last good sparkline per symbol. Sparklines are
 * decoration, so a failed refresh must never take one away or surface an
 * error: this returns what it has, merged with whatever just arrived, and
 * swallows every failure. One batched call per watchlist load.
 */
const sparkCache = new Map<string, Spark>();

export async function sparksCached(symbols: string[]): Promise<Record<string, Spark>> {
  if (symbols.length > 0) {
    try {
      for (const s of await marketService.sparks(symbols)) {
        if (s.points.length >= 2) sparkCache.set(s.symbol, s);
      }
    } catch {
      // Decoration only — see above.
    }
  }
  const out: Record<string, Spark> = {};
  for (const sym of symbols) {
    const s = sparkCache.get(sym);
    if (s) out[sym] = s;
  }
  return out;
}

export { MarketError, marketErrorMessage } from './types';
export type { Quote, QuoteAsOf, Spark, MarketService, MarketFailure } from './types';
export { formatPrice, formatChange, changeTone, asOfLabel } from './format';
export type { ChangeTone } from './format';
