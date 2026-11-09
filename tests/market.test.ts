import assert from 'node:assert/strict';
import test from 'node:test';
import { changeTone, formatChange, formatPrice } from '../src/services/market/format';
import { MockMarketService } from '../src/services/market/MockMarketService';

test('formatPrice: two decimals with thousands separators', () => {
  assert.equal(formatPrice(1234.5), '$1,234.50');
  assert.equal(formatPrice(9.1), '$9.10');
  assert.equal(formatPrice(0), '$0.00');
});

test('changeTone: sign decides direction, zero and NaN are flat', () => {
  assert.equal(changeTone(1.2), 'up');
  assert.equal(changeTone(-0.01), 'down');
  assert.equal(changeTone(0), 'flat');
  assert.equal(changeTone(Number.NaN), 'flat');
});

test('formatChange: signed absolute value and percent', () => {
  assert.equal(formatChange(1.23, 0.98), '+1.23 (+0.98%)');
  assert.equal(formatChange(-0.5, -0.4), '-0.50 (-0.40%)');
  assert.equal(formatChange(0, 0), '0.00 (0.00%)');
});

test('MockMarketService: deterministic per symbol, marked not-live', async () => {
  const svc = new MockMarketService();
  assert.equal(svc.isLive(), false);
  const a = await svc.quotes(['AAPL', 'MSFT']);
  const b = await svc.quotes(['AAPL', 'MSFT']);
  assert.deepEqual(a, b, 'same symbols yield the same quotes');
  assert.equal(a.length, 2);
  assert.equal(a[0]!.symbol, 'AAPL');
  assert.ok(a[0]!.price > 0 && a[0]!.valid);
  // change is internally consistent with price and percent
  const q = a[0]!;
  assert.ok(Math.abs(q.change - (q.price * q.changePercent) / 100) < 0.01);
});

// ── Error surfacing + backfill ───────────────────────────────────────────────

import { quotesWithBackfill } from '../src/services/market/backfill';
import { marketErrorFromResponse } from '../src/services/market/proxyErrors';
import { MarketError, marketErrorMessage, type MarketService, type Quote } from '../src/services/market/types';
import { asOfLabel } from '../src/services/market/format';
import { normalizeQuote, STALE_AFTER_MS } from '../workers/market/src/quote';
import { downsample, lastSessionBars, normalizeSpark, SPARK_POINTS } from '../workers/market/src/spark';

const q = (symbol: string, over: Partial<Quote> = {}): Quote => ({
  symbol, price: 100, change: 1, changePercent: 1, previousClose: 99, valid: true, asOf: 'delayed', ...over,
});

const service = (impl: (symbols: string[]) => Promise<Quote[]>): MarketService => ({
  quotes: impl,
  sparks: async () => [],
  isLive: () => true,
});

test('marketErrorFromResponse: maps each Worker status to a kind and keeps the detail', () => {
  const noKey = marketErrorFromResponse(500, { error: 'proxy is not configured' });
  assert.equal(noKey.kind, 'not_configured');
  assert.equal(noKey.detail, 'proxy is not configured');
  assert.equal(noKey.retryable, false);

  const rejected = marketErrorFromResponse(502, { error: 'market key rejected by Finnhub', upstream: 401 });
  assert.equal(rejected.kind, 'upstream');
  assert.match(rejected.message, /key was rejected/);
  assert.equal(rejected.retryable, false);

  const outage = marketErrorFromResponse(502, { error: 'market data is unavailable' });
  assert.equal(outage.kind, 'upstream');
  assert.match(outage.message, /unavailable/);

  const limited = marketErrorFromResponse(429, { error: 'Finnhub rate limit reached' });
  assert.equal(limited.kind, 'rate_limited');
  assert.equal(limited.retryable, true);

  // A non-JSON or empty body still yields a usable error.
  const bare = marketErrorFromResponse(503, undefined);
  assert.equal(bare.kind, 'unknown');
  assert.equal(bare.detail, undefined);
});

test('marketErrorMessage: MarketError message passes through, anything else gets the fallback', () => {
  assert.equal(marketErrorMessage(new MarketError('offline', 'Could not reach market data.')), 'Could not reach market data.');
  assert.equal(marketErrorMessage(new TypeError('boom')), 'Market data is unavailable.');
  assert.equal(marketErrorMessage(null, 'Custom.'), 'Custom.');
});

test('quotesWithBackfill: rethrows when every pass fails and nothing was priced', async () => {
  let calls = 0;
  const svc = service(async () => {
    calls += 1;
    throw new MarketError('rate_limited', 'Too many.');
  });
  const updates: Record<string, Quote>[] = [];
  await assert.rejects(
    quotesWithBackfill(svc, ['AAPL'], (u) => updates.push(u), () => false, { maxPasses: 3, retryMs: 1 }),
    (e: unknown) => e instanceof MarketError && e.kind === 'rate_limited',
  );
  assert.equal(calls, 3, 'a retryable failure is retried every pass');
  assert.ok(updates.every((u) => Object.keys(u).length === 0));
});

test('quotesWithBackfill: stops after one pass on a non-retryable failure', async () => {
  let calls = 0;
  const svc = service(async () => {
    calls += 1;
    throw new MarketError('upstream', 'Key rejected.');
  });
  await assert.rejects(
    quotesWithBackfill(svc, ['AAPL', 'MSFT'], () => {}, () => false, { maxPasses: 4, retryMs: 1 }),
    (e: unknown) => e instanceof MarketError && e.kind === 'upstream',
  );
  assert.equal(calls, 1, 'no point retrying a dead key');
});

test('quotesWithBackfill: a partial first pass is filled in, and a later failure does not undo it', async () => {
  let calls = 0;
  const svc = service(async (symbols) => {
    calls += 1;
    if (calls === 1) return [q('AAPL')];
    if (calls === 2) throw new MarketError('rate_limited', 'Too many.');
    return symbols.map((s) => q(s));
  });
  const updates: Record<string, Quote>[] = [];
  await quotesWithBackfill(svc, ['AAPL', 'MSFT'], (u) => updates.push(u), () => false, { maxPasses: 4, retryMs: 1 });
  assert.deepEqual(Object.keys(updates[0]!), ['AAPL']);
  assert.deepEqual(Object.keys(updates.at(-1)!).sort(), ['AAPL', 'MSFT']);
  assert.equal(calls, 3, 'stops once every symbol is priced');
});

test('quotesWithBackfill: an invalid symbol settles immediately and is not retried', async () => {
  let calls = 0;
  const svc = service(async (symbols) => {
    calls += 1;
    return symbols.map((s) => q(s, { valid: false, price: 0 }));
  });
  await quotesWithBackfill(svc, ['ZZZZQQ'], () => {}, () => false, { maxPasses: 4, retryMs: 1 });
  assert.equal(calls, 1);
});

test('normalizeQuote: a fresh print is delayed, unlabelled', () => {
  const now = 1_700_000_000_000;
  const out = normalizeQuote('AAPL', { c: 189.5, d: 1.2, dp: 0.64, pc: 188.3, t: now / 1000 - 60 }, now);
  assert.equal(out.valid, true);
  assert.equal(out.asOf, 'delayed');
  assert.equal(out.price, 189.5);
  assert.equal(asOfLabel(out.asOf), null);
});

test('normalizeQuote: a weekend-old print is flagged as last close', () => {
  const now = 1_700_000_000_000;
  const out = normalizeQuote('AAPL', { c: 189.5, d: 1.2, dp: 0.64, pc: 188.3, t: (now - STALE_AFTER_MS - 1000) / 1000 }, now);
  assert.equal(out.valid, true);
  assert.equal(out.asOf, 'last_close');
  assert.equal(out.price, 189.5, 'the price is still the real last trade');
  assert.equal(asOfLabel(out.asOf), 'as of last close');
});

test('normalizeQuote: c=0 with a previous close serves the close, flagged', () => {
  const out = normalizeQuote('AAPL', { c: 0, d: 0, dp: 0, pc: 188.3, t: 0 }, 1_700_000_000_000);
  assert.equal(out.valid, true);
  assert.equal(out.asOf, 'last_close');
  assert.equal(out.price, 188.3);
  assert.equal(out.change, 0);
  assert.equal(out.updatedAt, undefined);
});

test('normalizeQuote: all zeros is an unknown symbol', () => {
  const out = normalizeQuote('ZZZZQQ', { c: 0, d: 0, dp: 0, pc: 0, t: 0 });
  assert.equal(out.valid, false);
  assert.equal(out.price, 0);
});

// ── Sparklines ───────────────────────────────────────────────────────────────

test('MockMarketService.sparks: deterministic, ends on the quote price, agrees on direction', async () => {
  const svc = new MockMarketService();
  const [a] = await svc.sparks(['AAPL']);
  const [b] = await svc.sparks(['AAPL']);
  assert.deepEqual(a, b);
  const [q] = await svc.quotes(['AAPL']);
  assert.equal(a!.symbol, 'AAPL');
  assert.ok(a!.points.length >= 2);
  assert.equal(a!.points.at(-1), q!.price, 'the line ends on the price shown beside it');
  const dir = Math.sign(a!.points.at(-1)! - a!.points[0]!);
  assert.equal(dir, Math.sign(q!.change), 'line direction matches the day change');
});

test('lastSessionBars: keeps only the bars from the most recent UTC day', () => {
  const day = 86400;
  const t = [10 * day + 50000, 10 * day + 51000, 11 * day + 50000, 11 * day + 51000, 11 * day + 52000];
  const c = [1, 2, 3, 4, 5];
  assert.deepEqual(lastSessionBars(c, t), { c: [3, 4, 5], t: t.slice(2) });
  assert.deepEqual(lastSessionBars([], []), { c: [], t: [] });
});

test('downsample: thins evenly, keeps first and last, leaves short series alone', () => {
  const series = Array.from({ length: 78 }, (_, i) => i);
  const out = downsample(series, 32);
  assert.equal(out.length, 32);
  assert.equal(out[0], 0);
  assert.equal(out.at(-1), 77);
  assert.deepEqual(downsample([1, 2, 3], 32), [1, 2, 3]);
});

test('normalizeSpark: ok payload becomes a capped series with a time range', () => {
  const day = 86400;
  const t = Array.from({ length: 78 }, (_, i) => 20 * day + 48600 + i * 300);
  const c = t.map((_, i) => 100 + Math.sin(i / 5));
  const out = normalizeSpark('AAPL', { s: 'ok', c, t });
  assert.equal(out.symbol, 'AAPL');
  assert.equal(out.points.length, SPARK_POINTS);
  assert.equal(out.start, t[0]! * 1000);
  assert.equal(out.end, t.at(-1)! * 1000);
  assert.equal(out.points.at(-1), c.at(-1));
});

test('normalizeSpark: no_data, missing arrays, or a single bar yield an empty series', () => {
  assert.deepEqual(normalizeSpark('ZZZZQQ', { s: 'no_data' }), { symbol: 'ZZZZQQ', points: [] });
  assert.deepEqual(normalizeSpark('AAPL', { s: 'ok' }), { symbol: 'AAPL', points: [] });
  assert.deepEqual(normalizeSpark('AAPL', { s: 'ok', c: [1], t: [1] }), { symbol: 'AAPL', points: [] });
});
