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

export { MarketError } from './types';
export type { Quote, MarketService, MarketFailure } from './types';
export { formatPrice, formatChange, changeTone } from './format';
export type { ChangeTone } from './format';
