/**
 * Market-data composition root — proxy when deployed, mock otherwise.
 *
 * Same one-ternary shape as the ASK root: no screen or component knows which
 * backend it got. The proxy keeps the Finnhub key off the device; the mock
 * keeps the watchlist demoable before the Worker exists.
 */
import { isMarketConfigured } from '@/config';
import { MockMarketService } from './MockMarketService';
import { ProxyMarketService } from './ProxyMarketService';
import type { MarketService } from './types';

export const marketService: MarketService = isMarketConfigured()
  ? new ProxyMarketService()
  : new MockMarketService();

/** True when quotes are real; false when they're the dev placeholder. */
export const isMarketLive = (): boolean => marketService.isLive();

/**
 * Fetch quotes resiliently against a rate-limited free tier.
 *
 * Finnhub's free tier throttles bursts, so a cold multi-symbol load often
 * returns only some symbols (the rest are omitted). Rather than show gaps, this
 * accumulates what arrives and re-requests only the still-missing symbols a few
 * times, spaced out. The Worker caches each success ~60s, so retries mostly hit
 * cache and the list converges to complete within a few seconds. `onUpdate`
 * fires after each pass so the UI fills in progressively.
 *
 * A symbol Finnhub has no data for comes back with `valid: false` (present, not
 * missing), so it settles immediately and never retries forever.
 */
export async function quotesWithBackfill(
  symbols: string[],
  onUpdate: (bySymbol: Record<string, import('./types').Quote>) => void,
  isCancelled: () => boolean = () => false,
): Promise<void> {
  if (symbols.length === 0) {
    onUpdate({});
    return;
  }
  const acc: Record<string, import('./types').Quote> = {};
  let pending = [...symbols];
  const MAX_PASSES = 4;
  const RETRY_MS = 1500;

  for (let pass = 0; pass < MAX_PASSES && pending.length > 0; pass += 1) {
    if (pass > 0) await new Promise((r) => setTimeout(r, RETRY_MS));
    if (isCancelled()) return;
    try {
      for (const q of await marketService.quotes(pending)) acc[q.symbol] = q;
    } catch {
      // whole pass failed (e.g. all rate-limited) — keep pending and retry
    }
    if (isCancelled()) return;
    onUpdate({ ...acc });
    pending = pending.filter((s) => !acc[s]);
  }
}

export { MarketError } from './types';
export type { Quote, MarketService, MarketFailure } from './types';
export { formatPrice, formatChange, changeTone } from './format';
export type { ChangeTone } from './format';
