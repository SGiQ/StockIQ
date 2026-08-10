import { MARKET_URL } from '@/config';
import { getDeviceId } from '@/lib/deviceId';
import { MarketError, type MarketService, type Quote } from './types';

/**
 * Quotes via the Cloudflare Worker. The Finnhub key lives on the Worker, so
 * nothing secret ships here — same shape as `ProxyAskService`.
 */
export class ProxyMarketService implements MarketService {
  constructor(private readonly baseUrl: string = MARKET_URL) {}

  isLive(): boolean {
    return this.baseUrl.length > 0;
  }

  async quotes(symbols: string[]): Promise<Quote[]> {
    if (!this.baseUrl) throw new MarketError('not_configured', 'No market proxy URL is configured.');
    if (symbols.length === 0) return [];

    const url = `${this.baseUrl}/v1/quotes?symbols=${encodeURIComponent(symbols.join(','))}`;
    let res: Response;
    try {
      res = await fetch(url, { headers: { 'x-device-id': await getDeviceId() } });
    } catch {
      throw new MarketError('offline', 'Could not reach market data.');
    }
    if (res.status === 429) throw new MarketError('rate_limited', 'Too many requests — try again shortly.');
    if (!res.ok) throw new MarketError('unknown', 'Market data is unavailable.');

    const body = (await res.json()) as { quotes?: Quote[] };
    return body.quotes ?? [];
  }
}
