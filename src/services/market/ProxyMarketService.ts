import { MARKET_URL } from '@/config';
import { getDeviceId } from '@/lib/deviceId';
import { marketErrorFromResponse } from './proxyErrors';
import { MarketError, type MarketService, type Quote, type Spark } from './types';

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
    const body = await this.get<{ quotes?: Quote[] }>('/v1/quotes', symbols);
    return body?.quotes ?? [];
  }

  async sparks(symbols: string[]): Promise<Spark[]> {
    const body = await this.get<{ sparks?: Spark[] }>('/v1/spark', symbols);
    return body?.sparks ?? [];
  }

  /** One batched GET against the Worker; null for an empty symbol list. */
  private async get<T>(path: string, symbols: string[]): Promise<T | null> {
    if (!this.baseUrl) throw new MarketError('not_configured', 'No market proxy URL is configured.');
    if (symbols.length === 0) return null;

    const url = `${this.baseUrl}${path}?symbols=${encodeURIComponent(symbols.join(','))}`;
    let res: Response;
    try {
      res = await fetch(url, { headers: { 'x-device-id': await getDeviceId() } });
    } catch {
      throw new MarketError('offline', 'Could not reach market data.');
    }

    if (!res.ok) {
      const body: unknown = await res.json().catch(() => undefined);
      const err = marketErrorFromResponse(res.status, body);
      // Keep the Worker's own wording visible to whoever is debugging a live
      // outage, without putting it in front of a learner.
      if (err.detail) console.warn(`[market] ${res.status}: ${err.detail}`);
      throw err;
    }

    return (await res.json()) as T;
  }
}
