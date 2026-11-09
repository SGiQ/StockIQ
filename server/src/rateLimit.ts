/**
 * Per-IP and global rate limits, backed by the `rate_limits` table.
 *
 * ── Why this exists alongside the per-address and per-device limits ───────
 * `createEmailChallenge` caps requests per ADDRESS and `claimLinkCode` caps
 * guesses per DEVICE. Both keys are chosen by the caller: a script can rotate
 * `X-Device-Id` on every request and spread sends across thousands of
 * addresses, turning `/v1/auth/email/request` into a mail cannon that bills
 * Resend, burns the sending domain's reputation and fills `accounts` with
 * ghost rows. The source IP is the one key the caller does not pick, so the
 * limits here are keyed by it, plus one global cap as the last line.
 *
 * ── Why the counter is committed outside the request transaction ──────────
 * Every authenticated route runs inside a transaction that ROLLS BACK when
 * the handler throws. A limiter that incremented inside that transaction and
 * then threw "too many requests" would discard its own increment on the way
 * out — the same trap `verifyEmailCode` documents for the attempt counter.
 * So `enforce` takes the pool (autocommit), never the route's client.
 *
 * Fixed windows, not sliding: a caller can get up to 2× the limit across a
 * window boundary. That is fine for an abuse brake, and it keeps the write to
 * one UPSERT with no history to scan.
 */
import type { IncomingHttpHeaders } from 'node:http';

/** The smallest surface the limiter needs; `pg.Pool` satisfies it. */
export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

export interface LimitRule {
  /** Namespace for the counter, e.g. `email-request`. */
  name: string;
  limit: number;
  windowMs: number;
}

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/** Sends of a sign-in email, per source IP. Two windows: burst and daily. */
export const EMAIL_REQUEST_HOURLY: LimitRule = { name: 'email-request:1h', limit: 10, windowMs: HOUR_MS };
export const EMAIL_REQUEST_DAILY: LimitRule = { name: 'email-request:1d', limit: 100, windowMs: DAY_MS };
/** Code guesses per source IP; the per-challenge cap is 5, so this bounds spraying. */
export const EMAIL_VERIFY_HOURLY: LimitRule = { name: 'email-verify:1h', limit: 30, windowMs: HOUR_MS };
/** Pairing-code guesses per source IP, complementing the per-device cap. */
export const LINK_CLAIM_10MIN: LimitRule = { name: 'link-claim:10m', limit: 30, windowMs: 10 * 60 * 1000 };

/**
 * Total sign-in emails per day across every caller. Protects the Resend bill
 * and the domain's reputation when per-IP limits are being worked around
 * (botnets, rotating proxies). Override with EMAIL_DAILY_CAP.
 */
export const DEFAULT_EMAIL_DAILY_CAP = 2000;
export function emailDailyCap(env: NodeJS.ProcessEnv = process.env): LimitRule {
  const raw = Number(env.EMAIL_DAILY_CAP);
  const limit = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_EMAIL_DAILY_CAP;
  return { name: 'email-global:1d', limit, windowMs: DAY_MS };
}

export class RateLimitError extends Error {
  constructor(readonly rule: LimitRule) {
    super('too many requests; try again later');
    this.name = 'RateLimitError';
  }
}

/**
 * The caller's address.
 *
 * Railway terminates TLS at its edge and appends the client to
 * `x-forwarded-for`; the FIRST entry is the original client. This is only
 * trustworthy because every request to this service arrives through that
 * edge — a deployment that exposed the Node port directly would let a caller
 * forge the header, so `TRUST_PROXY=false` falls back to the socket address.
 */
export function clientIp(
  headers: IncomingHttpHeaders,
  socketAddress: string | undefined,
  trustProxy: boolean = process.env.TRUST_PROXY !== 'false',
): string {
  if (trustProxy) {
    const raw = headers['x-forwarded-for'];
    const first = (Array.isArray(raw) ? raw[0] : raw)?.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return (socketAddress ?? 'unknown').slice(0, 64);
}

/** Pure: is `count` (after this request) over the rule? Exported for tests. */
export function overLimit(count: number, rule: LimitRule): boolean {
  return count > rule.limit;
}

/** Pure: the fixed window a timestamp belongs to. */
export function windowStart(now: number, windowMs: number): number {
  return now - (now % windowMs);
}

/**
 * Count this request against `rule` for `subject` and throw when over.
 *
 * One UPSERT does the read-and-increment atomically, so concurrent requests
 * cannot both see `limit - 1` and both pass.
 */
export async function enforce(
  db: Queryable,
  rule: LimitRule,
  subject: string,
  now: number = Date.now(),
): Promise<void> {
  const key = `${rule.name}:${subject}`;
  const { rows } = await db.query(
    `INSERT INTO rate_limits (key, window_start, count) VALUES ($1, $2, 1)
       ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
       RETURNING count`,
    [key, windowStart(now, rule.windowMs)],
  );
  const count = Number(rows[0]?.count ?? 0);
  if (overLimit(count, rule)) throw new RateLimitError(rule);

  // Opportunistic purge of windows older than the longest rule, so the table
  // stays at a handful of rows per active caller without a cron job.
  if (Math.random() < 0.01) {
    await db.query('DELETE FROM rate_limits WHERE window_start < $1', [now - 2 * DAY_MS]);
  }
}

/** Convenience: several rules against the same subject, first failure wins. */
export async function enforceAll(
  db: Queryable,
  rules: LimitRule[],
  subject: string,
  now: number = Date.now(),
): Promise<void> {
  for (const rule of rules) await enforce(db, rule, subject, now);
}
