/**
 * StockIQ narration server.
 *
 * Serves the pre-rendered lesson audio out of the `stockiq-narration` R2
 * bucket. It exists so the app has a production-grade audio origin without
 * depending on the public `r2.dev` URL, which Cloudflare rate-limits and
 * documents as development-only. This Worker binds the bucket directly, runs
 * on the account's own `workers.dev` subdomain, and needs no custom domain —
 * so nothing about the sgiq.ai DNS has to change.
 *
 * It is deliberately read-only and narrow: it can only hand back objects whose
 * key is `{male,female}/{16-hex}.mp3`, which is exactly the shape
 * generate-speech.ts writes. It cannot list the bucket, cannot write, and
 * cannot be steered to any other key.
 */

interface Env {
  /** The stockiq-narration R2 bucket. See wrangler.toml. */
  BUCKET: R2Bucket;
}

/**
 * The only keys this Worker will serve. Content-addressed hashes are 16 lower
 * hex chars (see generate-speech.ts `hashFor`). Anchoring both ends stops path
 * traversal and blind enumeration of anything but audio.
 */
const KEY = /^(male|female)\/[0-9a-f]{16}\.mp3$/;

/**
 * Audio is fetched cross-origin from the web app (a different origin than this
 * Worker), and on web `expo-audio` can route a clip through the Web Audio
 * graph, which reads the bytes and therefore requires CORS. `*` is safe here:
 * the bucket holds only public lesson narration, there are no credentials, and
 * every object is world-readable by design.
 */
const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, OPTIONS',
  'access-control-allow-headers': 'range, if-none-match, if-range',
  // Without this the client cannot read the length/range of a 206, which some
  // media stacks need to drive seeking.
  'access-control-expose-headers': 'content-length, content-range, accept-ranges, etag',
  // Preflights are identical for every clip; let the browser cache them a day.
  'access-control-max-age': '86400',
};

/** One year, immutable — the filename is a content hash, so bytes never change. */
const CACHE = 'public, max-age=31536000, immutable';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('method not allowed', {
        status: 405,
        headers: { ...CORS, allow: 'GET, HEAD, OPTIONS' },
      });
    }

    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json', ...CORS },
      });
    }

    // Strip the leading slash to form the R2 key, then hard-validate its shape.
    const key = decodeURIComponent(url.pathname.replace(/^\//, ''));
    if (!KEY.test(key)) {
      return new Response('not found', { status: 404, headers: CORS });
    }

    // HEAD only needs metadata, and avoids streaming a body the client discards.
    if (request.method === 'HEAD') {
      const head = await env.BUCKET.head(key);
      if (!head) return new Response('not found', { status: 404, headers: CORS });
      const headers = new Headers(CORS);
      head.writeHttpMetadata(headers);
      headers.set('etag', head.httpEtag);
      headers.set('content-length', String(head.size));
      headers.set('accept-ranges', 'bytes');
      headers.set('cache-control', CACHE);
      if (!headers.has('content-type')) headers.set('content-type', 'audio/mpeg');
      return new Response(null, { status: 200, headers });
    }

    // Hand R2 the request headers so it resolves Range and the conditional
    // (If-None-Match / If-Range) itself — that keeps 206 and 304 exactly
    // consistent with what the object actually is.
    const object = await env.BUCKET.get(key, {
      range: request.headers,
      onlyIf: request.headers,
    });

    if (object === null) {
      return new Response('not found', { status: 404, headers: CORS });
    }

    const headers = new Headers(CORS);
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('accept-ranges', 'bytes');
    headers.set('cache-control', CACHE);
    // The bucket was uploaded with audio/mpeg, but fall back defensively so a
    // clip is never served as octet-stream and silently refused by a player.
    if (!headers.has('content-type')) headers.set('content-type', 'audio/mpeg');

    // Three outcomes, distinguished the way R2's own docs prescribe:
    //   - no body                       -> the conditional matched (304)
    //   - body + the REQUEST had a Range -> a partial read (206)
    //   - body, no Range on the request  -> the whole object (200)
    //
    // The status keys off the request's Range header, NOT `object.range`: R2
    // populates `object.range` (offset 0, full length) even for an unranged
    // GET, so keying off it would return 206 for a plain request — technically
    // delivering all the bytes, but a 206 with no client Range confuses edge
    // caches and is simply the wrong status.
    const hasBody = 'body' in object && object.body !== null;
    if (!hasBody) {
      return new Response(null, { status: 304, headers });
    }

    const body = (object as R2ObjectBody).body;
    const range = (object as R2ObjectBody).range;
    const rangeRequested = request.headers.get('range') !== null;

    if (
      rangeRequested &&
      range &&
      'offset' in range &&
      typeof range.offset === 'number' &&
      typeof range.length === 'number'
    ) {
      const start = range.offset;
      const end = start + range.length - 1;
      headers.set('content-range', `bytes ${start}-${end}/${object.size}`);
      headers.set('content-length', String(range.length));
      return new Response(body, { status: 206, headers });
    }

    headers.set('content-length', String(object.size));
    return new Response(body, { status: 200, headers });
  },
};
