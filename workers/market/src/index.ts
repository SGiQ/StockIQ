/**
 * StockiQ market-data proxy.
 *
 * Same reason as the ASK worker: a vendor API key cannot be kept secret inside
 * a client app. The Finnhub key lives here as a Cloudflare secret, the app
 * calls this Worker, and the key never ships in the bundle.
 *
 * This endpoint returns delayed quotes for a learner's watchlist. It is
 * educational, not a trading feed — delayed data is fine, and nothing here
 * advises buying or selling.
 *
 * Unlike ASK, the rate limiter fails OPEN: quotes are free/cheap rather than
 * LLM spend, so a missing KV binding runs uncapped rather than refusing to
 * serve. The cap, when configured, only protects the Finnhub free-tier quota.
 */

import { normalizeQuote, type FinnhubQuote, type Quote } from './quote';
import { normalizeSpark, type FinnhubCandles, type Spark } from './spark';

interface Env {
  FINNHUB_API_KEY: string;
  /** Optional KV namespace for a per-caller daily cap. */
  RATE_LIMIT?: KVNamespace;
  DAILY_LIMIT?: string;
}

const DEFAULT_DAILY_LIMIT = 2000;
const MAX_SYMBOLS = 25;
/**
 * Edge-cache each upstream quote so a refreshing client rarely re-hits Finnhub.
 * 60s is plenty for delayed, educational quotes and keeps well under the free
 * tier's per-minute budget.
 */
const QUOTE_TTL_SECONDS = 60;
/**
 * Delay between upstream calls. Finnhub's free tier throttles bursts hard — five
 * simultaneous calls returns roughly one — so symbols are fetched one at a time,
 * spaced out. With the 60s cache a watchlist only pays this on a cold load.
 */
const STAGGER_MS = 500;
/**
 * Intraday sparklines change slowly and are decoration, so they cache for far
 * longer than quotes. The upstream request window is rounded to this step too
 * (see sparkWindow) so the URL — and therefore the cache key — is stable for
 * the whole TTL instead of changing every second.
 */
const SPARK_TTL_SECONDS = 300;
/** Candle resolution in minutes. */
const SPARK_RESOLUTION = '5';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, x-device-id',
  'access-control-allow-methods': 'GET, OPTIONS',
};

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });

/** Finnhub symbols: letters, digits, dot, dash. Upper-cased, deduped, capped. */
function parseSymbols(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    const s = part.trim().toUpperCase();
    if (s && /^[A-Z0-9.\-]{1,12}$/.test(s)) seen.add(s);
    if (seen.size >= MAX_SYMBOLS) break;
  }
  return [...seen];
}

class UpstreamError extends Error {
  constructor(readonly status: number) {
    super(`finnhub ${status}`);
  }
}

async function fetchQuote(symbol: string, key: string): Promise<Quote> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`;
  const res = await fetch(url, { cf: { cacheTtl: QUOTE_TTL_SECONDS, cacheEverything: true } });
  if (!res.ok) throw new UpstreamError(res.status);
  // Closed-market payloads and the "as of last close" flag are handled in
  // normalizeQuote; see quote.ts.
  return normalizeQuote(symbol, (await res.json()) as FinnhubQuote);
}

/**
 * The candle window: the last five days (so a Monday morning still finds
 * Friday's session) ending at `now` rounded down to the cache TTL.
 */
export function sparkWindow(nowMs: number = Date.now()): { from: number; to: number } {
  const to = Math.floor(nowMs / 1000 / SPARK_TTL_SECONDS) * SPARK_TTL_SECONDS;
  return { from: to - 5 * 86400, to };
}

async function fetchSpark(symbol: string, key: string): Promise<Spark> {
  const { from, to } = sparkWindow();
  const url =
    `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}` +
    `&resolution=${SPARK_RESOLUTION}&from=${from}&to=${to}&token=${key}`;
  const res = await fetch(url, { cf: { cacheTtl: SPARK_TTL_SECONDS, cacheEverything: true } });
  if (!res.ok) throw new UpstreamError(res.status);
  return normalizeSpark(symbol, (await res.json()) as FinnhubCandles);
}

/** Fetch one at a time, spaced by STAGGER_MS, so a batch never bursts. */
async function fetchStaggered<T>(
  symbols: string[],
  fetchOne: (symbol: string) => Promise<T>,
): Promise<PromiseSettledResult<T>[]> {
  const out: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < symbols.length; i += 1) {
    if (i > 0) await new Promise((r) => setTimeout(r, STAGGER_MS));
    try {
      out.push({ status: 'fulfilled', value: await fetchOne(symbols[i]!) });
    } catch (reason) {
      out.push({ status: 'rejected', reason });
    }
  }
  return out;
}

/**
 * When nothing at all came back, say why in a way the app can map to a
 * message: 401/403 is a dead key, 429 the provider's limit, anything else an
 * outage. Shared by both routes so they stay diagnosable the same way.
 */
function allFailed(settled: PromiseSettledResult<unknown>[], what: string): Response {
  const firstErr = settled.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
  const upstream = firstErr?.reason instanceof UpstreamError ? firstErr.reason.status : 0;
  console.error(`finnhub error (${what})`, upstream, String(firstErr?.reason));
  if (upstream === 401 || upstream === 403) {
    return json(502, { error: 'market key rejected by Finnhub — check the FINNHUB_API_KEY secret', upstream });
  }
  if (upstream === 429) return json(429, { error: 'Finnhub rate limit reached', upstream });
  return json(502, { error: 'market data is unavailable', upstream: upstream || undefined });
}

async function withinLimit(env: Env, deviceId: string): Promise<boolean> {
  if (!env.RATE_LIMIT) return true; // fail open — see the file header
  const limit = Number(env.DAILY_LIMIT ?? DEFAULT_DAILY_LIMIT);
  const day = new Date().toISOString().slice(0, 10);
  const key = `mkt:${day}:${deviceId}`;
  const used = Number((await env.RATE_LIMIT.get(key)) ?? 0);
  if (used >= limit) return false;
  await env.RATE_LIMIT.put(key, String(used + 1), { expirationTtl: 60 * 60 * 36 });
  return true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const url = new URL(request.url);
    if (url.pathname === '/health') return json(200, { ok: true });
    const route = url.pathname === '/v1/quotes' ? 'quotes' : url.pathname === '/v1/spark' ? 'spark' : null;
    if (request.method !== 'GET' || !route) {
      return json(404, { error: 'not found' });
    }

    if (!env.FINNHUB_API_KEY) return json(500, { error: 'proxy is not configured' });

    const deviceId = (request.headers.get('x-device-id') ?? '').trim();
    if (deviceId.length < 16 || deviceId.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(deviceId)) {
      return json(400, { error: 'X-Device-Id header is required' });
    }

    const symbols = parseSymbols(url.searchParams.get('symbols'));
    if (symbols.length === 0) return json(400, { error: 'symbols is required' });

    if (!(await withinLimit(env, deviceId))) {
      return json(429, { error: 'daily quote limit reached' });
    }

    const key = env.FINNHUB_API_KEY;

    if (route === 'spark') {
      // Sparklines are decoration: a symbol with no candles (or a plan that
      // does not include candles) is simply omitted, and the client draws the
      // row without one. Only a total failure is reported, same as quotes.
      const settled = await fetchStaggered(symbols, (s) => fetchSpark(s, key));
      const sparks = settled.flatMap((r) => (r.status === 'fulfilled' && r.value.points.length > 0 ? [r.value] : []));
      if (sparks.length === 0 && settled.every((r) => r.status === 'rejected')) {
        return allFailed(settled, 'spark');
      }
      return new Response(JSON.stringify({ sparks }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'cache-control': `public, max-age=${SPARK_TTL_SECONDS}`,
          ...CORS,
        },
      });
    }

    // Per-symbol, not all-or-nothing: one symbol hitting a rate limit or a
    // transient error must not blank the whole watchlist. Settle each, return
    // what succeeded, and only fail the request when EVERY symbol failed (a
    // real problem — bad key, or a full outage) so that case stays diagnosable.
    const settled = await fetchStaggered(symbols, (s) => fetchQuote(s, key));
    const quotes = settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));

    if (quotes.length === 0) return allFailed(settled, 'quotes');
    return json(200, { quotes });
  },
};
