import { MarketError } from './types';

/** The Worker's error body: `{ error, upstream? }`. */
interface ProxyErrorBody {
  error?: string;
  upstream?: number;
}

/**
 * Map a non-2xx Worker response to a MarketError a screen can show.
 *
 * The Worker already reports failures precisely (500 no key, 502 key rejected,
 * 429 rate limit); this is where those stop being thrown away. The learner
 * sees a plain sentence; the Worker's own wording is kept on `detail` so the
 * person running the service can see exactly which hop failed.
 */
export function marketErrorFromResponse(status: number, body: unknown): MarketError {
  const b = (body ?? {}) as ProxyErrorBody;
  const detail = typeof b.error === 'string' ? b.error : undefined;

  if (status === 429) {
    return new MarketError('rate_limited', 'Too many quote requests — try again in a minute.', detail);
  }
  if (status === 500) {
    return new MarketError('not_configured', 'Market data is not set up on the server yet.', detail);
  }
  if (status === 502) {
    if (b.upstream === 401 || b.upstream === 403) {
      return new MarketError(
        'upstream',
        'The market data key was rejected — quotes are down until it is replaced.',
        detail,
      );
    }
    return new MarketError('upstream', 'Market data is unavailable right now.', detail);
  }
  if (status === 400) {
    return new MarketError('unknown', 'That quote request was not valid.', detail);
  }
  return new MarketError('unknown', 'Market data is unavailable.', detail);
}
