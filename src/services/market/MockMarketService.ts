import type { MarketService, Quote } from './types';

/**
 * Deterministic placeholder quotes for when no market proxy is configured yet.
 *
 * Mirrors the ASK philosophy — an undeployed feature should not be a broken
 * screen. These are obviously not live data (stable per symbol, clearly
 * labelled in the UI via `isLive() === false`); they exist so the watchlist can
 * be built and demoed before the Worker is deployed, and vanish the moment
 * EXPO_PUBLIC_MARKET_URL is set.
 */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export class MockMarketService implements MarketService {
  isLive(): boolean {
    return false;
  }

  async quotes(symbols: string[]): Promise<Quote[]> {
    return symbols.map((symbol) => {
      const h = hash(symbol);
      const price = Number((20 + (h % 48000) / 100).toFixed(2));
      const changePercent = Number(((h % 1200) / 100 - 6).toFixed(2));
      const change = Number(((price * changePercent) / 100).toFixed(2));
      return {
        symbol,
        price,
        change,
        changePercent,
        previousClose: Number((price - change).toFixed(2)),
        valid: true,
        asOf: 'delayed',
      };
    });
  }
}
