import { MarketError, type MarketService, type Quote } from './types';

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
 * A symbol the provider has no data for comes back with `valid: false`
 * (present, not missing), so it settles immediately and never retries forever.
 *
 * Failure is reported, not swallowed: if a pass throws a non-retryable
 * MarketError (no key, key rejected) the loop stops at once, and if the whole
 * run ends with NO quotes at all the last error is rethrown so the screen can
 * show it. A partial result (some symbols priced) resolves normally — the gaps
 * read as "—", not as an outage.
 *
 * The service is a parameter so this is testable without the composition root
 * (which reads build-time config). `index.ts` binds the real one.
 */
export async function quotesWithBackfill(
  service: MarketService,
  symbols: string[],
  onUpdate: (bySymbol: Record<string, Quote>) => void,
  isCancelled: () => boolean = () => false,
  opts: { maxPasses?: number; retryMs?: number } = {},
): Promise<void> {
  if (symbols.length === 0) {
    onUpdate({});
    return;
  }
  const maxPasses = opts.maxPasses ?? 4;
  const retryMs = opts.retryMs ?? 1500;
  const acc: Record<string, Quote> = {};
  let pending = [...symbols];
  let lastError: unknown;

  for (let pass = 0; pass < maxPasses && pending.length > 0; pass += 1) {
    if (pass > 0) await new Promise((r) => setTimeout(r, retryMs));
    if (isCancelled()) return;
    try {
      for (const q of await service.quotes(pending)) acc[q.symbol] = q;
      lastError = undefined;
    } catch (e) {
      lastError = e;
      if (e instanceof MarketError && !e.retryable) break;
    }
    if (isCancelled()) return;
    onUpdate({ ...acc });
    pending = pending.filter((s) => !acc[s]);
  }

  if (lastError !== undefined && Object.keys(acc).length === 0) throw lastError;
}
