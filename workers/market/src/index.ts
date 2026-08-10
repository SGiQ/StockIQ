/**
 * StockIQ market-data proxy.
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

interface Env {
  FINNHUB_API_KEY: string;
  /** Optional KV namespace for a per-caller daily cap. */
  RATE_LIMIT?: KVNamespace;
  DAILY_LIMIT?: string;
}

const DEFAULT_DAILY_LIMIT = 2000;
const MAX_SYMBOLS = 25;
/** Edge-cache each upstream quote briefly so a refreshing client can't hammer Finnhub. */
const QUOTE_TTL_SECONDS = 15;

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

interface Quote {
  symbol: string;
  /** Current price. */
  price: number;
  /** Absolute change on the day. */
  change: number;
  /** Percent change on the day. */
  changePercent: number;
  /** Previous close, for context. */
  previousClose: number;
  /** False when Finnhub has no data for the symbol (all-zero response). */
  valid: boolean;
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
  const q = (await res.json()) as { c?: number; d?: number; dp?: number; pc?: number };
  const price = q.c ?? 0;
  // Finnhub returns all zeros for an unknown symbol.
  const valid = price > 0;
  return {
    symbol,
    price,
    change: q.d ?? 0,
    changePercent: q.dp ?? 0,
    previousClose: q.pc ?? 0,
    valid,
  };
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
    if (request.method !== 'GET' || url.pathname !== '/v1/quotes') {
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

    try {
      const quotes = await Promise.all(symbols.map((s) => fetchQuote(s, env.FINNHUB_API_KEY)));
      return json(200, { quotes });
    } catch (error) {
      const upstream = error instanceof UpstreamError ? error.status : 0;
      console.error('finnhub error', upstream, String(error));
      if (upstream === 401 || upstream === 403) {
        return json(502, { error: 'market key rejected by Finnhub — check the FINNHUB_API_KEY secret', upstream });
      }
      if (upstream === 429) return json(429, { error: 'Finnhub rate limit reached', upstream });
      return json(502, { error: 'market data is unavailable', upstream: upstream || undefined });
    }
  },
};
