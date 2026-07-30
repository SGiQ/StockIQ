/**
 * StockIQ ASK proxy.
 *
 * Exists for exactly one reason: an API key cannot be kept secret inside a
 * client app. Anyone can pull the bundle off a device and read it. So the key
 * lives here as a Cloudflare secret, the app calls this Worker, and the key
 * never ships.
 *
 * Two things live server-side on purpose:
 *
 * 1. The system prompt, including the "not a financial adviser" rules. In the
 *    bring-your-own-key path those rules sit in the app, where a modified
 *    client could simply drop them. Here they cannot be edited by the caller,
 *    and they can be corrected without shipping an app release.
 *
 * 2. Model, max_tokens, and effort. The request body carries only a question
 *    and card context, so a caller cannot ask this endpoint — spending the
 *    owner's money — to generate something expensive or unrelated.
 */

interface Env {
  ANTHROPIC_API_KEY: string;
  /** KV namespace used for per-caller rate limiting. See the note in `limit`. */
  RATE_LIMIT: KVNamespace;
  /** Optional override, mostly for testing. */
  DAILY_LIMIT?: string;
}

const MODEL = 'claude-opus-4-8';
const MAX_TOKENS = 1024;
const DEFAULT_DAILY_LIMIT = 100;

const SYSTEM_PROMPT = `You are the StockIQ tutor. A learner is part-way through a short card-based lesson on the stock market and has tapped ASK on the card described below.

Rules:
- Answer only about the concept on the current card and ideas directly adjacent to it. If the question is off-topic, say so in one sentence and point back to the card.
- 120 words maximum. Plain language. No headings, no markdown, at most three short bullets.
- Explain, do not quiz. The learner asked because something did not land.
- You are NOT a financial adviser. Never recommend a specific security, never suggest buying or selling anything, never give allocation or position-sizing advice for the learner personally, and never predict a price. If asked, say plainly that you teach concepts and cannot advise, then offer the underlying concept instead.
- Reply with the final answer only. No preamble, no restating the question, no meta-commentary about your process.`;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, x-owner-id',
  'access-control-allow-methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });

/**
 * Per-caller daily cap.
 *
 * This endpoint spends real money on every call and has no user accounts, so
 * an uncapped deployment is a bill waiting to happen. If the KV binding is
 * missing the Worker refuses to serve rather than silently running
 * unlimited — failing closed is the only safe default when the failure mode
 * is financial.
 */
async function withinLimit(env: Env, ownerId: string): Promise<boolean> {
  if (!env.RATE_LIMIT) return false;
  const limit = Number(env.DAILY_LIMIT ?? DEFAULT_DAILY_LIMIT);
  const day = new Date().toISOString().slice(0, 10);
  const key = `ask:${day}:${ownerId}`;

  const used = Number((await env.RATE_LIMIT.get(key)) ?? 0);
  if (used >= limit) return false;

  // Not atomic — KV has no counter primitive, so two simultaneous requests
  // can both read the same value. The drift is at most the concurrency of one
  // caller, which is acceptable for a cost guard; it is not a security
  // control. Durable Objects would be exact if that ever matters.
  await env.RATE_LIMIT.put(key, String(used + 1), { expirationTtl: 60 * 60 * 36 });
  return true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const url = new URL(request.url);
    if (url.pathname === '/health') return json(200, { ok: true });
    if (request.method !== 'POST' || url.pathname !== '/v1/ask') {
      return json(404, { error: 'not found' });
    }

    if (!env.ANTHROPIC_API_KEY) return json(500, { error: 'proxy is not configured' });

    const ownerId = (request.headers.get('x-owner-id') ?? '').trim();
    if (ownerId.length < 16 || ownerId.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(ownerId)) {
      return json(400, { error: 'X-Owner-Id header is required' });
    }

    let body: { question?: unknown; card?: unknown; lessonTitle?: unknown; courseTitle?: unknown };
    try {
      body = await request.json();
    } catch {
      return json(400, { error: 'body is not valid JSON' });
    }

    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const card = typeof body.card === 'string' ? body.card : '';
    if (!question || question.length > 2000) return json(400, { error: 'question is required' });
    if (!card || card.length > 8000) return json(400, { error: 'card context is required' });

    if (!(await withinLimit(env, ownerId))) {
      return json(429, { error: 'daily question limit reached' });
    }

    const lessonTitle = typeof body.lessonTitle === 'string' ? body.lessonTitle : '';
    const courseTitle = typeof body.courseTitle === 'string' ? body.courseTitle : '';

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        stream: true,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'low' },
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Course: ${courseTitle}\nLesson: ${lessonTitle}\n\nThe card on screen:\n${card}\n\nLearner's question: ${question}`,
          },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      // Upstream errors can quote the key's org and rate-limit details, so
      // they are logged rather than forwarded.
      console.error('anthropic error', upstream.status, await upstream.text().catch(() => ''));
      return json(upstream.status === 429 ? 429 : 502, { error: 'tutor is unavailable' });
    }

    // Pass the SSE stream straight through — the Worker has no reason to
    // buffer it, and buffering would defeat token-by-token streaming.
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
        ...CORS,
      },
    });
  },
};
