import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import type { PoolClient } from 'pg';
import { isUndeliverableRecipient } from './mailer.ts';
import { ProtocolError } from './protocol.ts';

/**
 * Passwordless email sign-in.
 *
 * Chosen over a password because there is then nothing to store, leak, reuse
 * across sites, or ask a person to remember — and because it works on every
 * platform, which Sign in with Apple does not.
 *
 * ── Why a code and not only a clickable link ──────────────────────────────
 * People routinely open email on a different device from the one they are
 * signing in on: request on the phone, read on the laptop. A pure magic link
 * dead-ends there, because tapping it authenticates the wrong device. A code
 * the person carries across works from anywhere, so the code is the primary
 * mechanism and the link in the email is a same-device convenience.
 *
 * ── What defends a 6-digit code ───────────────────────────────────────────
 * Six digits is only a million possibilities, which is nothing on its own.
 * Four things together make it safe, and removing any one breaks it:
 *   1. it expires in 10 minutes,
 *   2. it is single-use,
 *   3. guesses against a challenge are capped, and
 *   4. requests per address are rate limited, so an attacker cannot mint
 *      fresh challenges to spread guesses across.
 */

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** Requests per address per window, so an inbox cannot be flooded. */
const REQUEST_LIMIT = 5;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;

/**
 * Addresses are lowercased and trimmed, and nothing more.
 *
 * It is tempting to also strip Gmail's dots and +tags so `a.b+x@gmail.com`
 * and `ab@gmail.com` resolve to one account. That is provider-specific
 * folklore, it is wrong for most other hosts, and getting it wrong merges two
 * genuinely different people's accounts. Treating the address as opaque is
 * the safe reading.
 */
export function normaliseEmail(raw: unknown): string {
  if (typeof raw !== 'string') throw new ProtocolError('email is required');
  const value = raw.trim().toLowerCase();
  // Deliberately permissive: the real proof an address exists and belongs to
  // the caller is that they receive the code. Elaborate regexes reject valid
  // addresses far more often than they catch anything useful.
  if (value.length < 3 || value.length > 254 || !/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(value)) {
    throw new ProtocolError('that email address is not valid');
  }
  // Syntactically valid but undeliverable: reserved documentation/testing
  // domains (example.com, *.test, ...). These pass the regex but no provider
  // will ever accept them, so reject here rather than failing at send time.
  if (isUndeliverableRecipient(value)) {
    throw new ProtocolError('that email address is not valid');
  }
  return value;
}

const hash = (code: string): string => createHash('sha256').update(code).digest('hex');

/** Uniform over 0..999999, zero-padded. `randomInt` is rejection-sampled. */
const generateCode = (): string => String(randomInt(1_000_000)).padStart(6, '0');

export interface Challenge {
  code: string;
  expiresAt: number;
}

/**
 * Creates a challenge, or throws if the address has been asked too often.
 *
 * The caller must NOT surface that difference — see the route handler. This
 * function returns the plaintext code exactly once, for the email; only its
 * hash is stored.
 */
export async function createEmailChallenge(
  client: PoolClient,
  email: string,
): Promise<Challenge> {
  const now = Date.now();

  const recent = await client.query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM email_challenges WHERE email = $1 AND created_at > $2',
    [email, now - REQUEST_WINDOW_MS],
  );
  if (Number(recent.rows[0]?.count ?? 0) >= REQUEST_LIMIT) {
    throw new ProtocolError('too many sign-in requests; wait a few minutes');
  }

  // Older live challenges for this address are retired. Several valid codes
  // at once multiplies the guessing surface for no benefit.
  await client.query(
    'UPDATE email_challenges SET consumed_at = $2 WHERE email = $1 AND consumed_at IS NULL',
    [email, now],
  );

  const code = generateCode();
  await client.query(
    `INSERT INTO email_challenges (token_hash, email, created_at, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [hash(code), email, now, now + CODE_TTL_MS],
  );

  return { code, expiresAt: now + CODE_TTL_MS };
}

export type VerifyResult = { ok: true; email: string } | { ok: false };

/**
 * Consumes a code and returns the address it proves.
 *
 * Deliberately NOT bound to the device that requested it: the whole point of
 * a code over a link is that it survives being carried to another device.
 * What binds it is the address — the person had to receive it.
 *
 * ── Why this RETURNS failure instead of throwing ──────────────────────────
 * A wrong guess has to increment `attempts`, and that increment has to
 * survive. Every route here runs in a transaction that rolls back on a thrown
 * error, so an earlier version that threw silently discarded the increment on
 * its way out — the cap never applied, and a six-digit code was brute-forcible
 * inside its ten-minute window. Returning lets the caller commit the
 * increment and *then* answer 400.
 *
 * Incrementing on a separate connection instead would deadlock: the
 * `FOR UPDATE` below holds the row for the life of this transaction.
 */
export async function verifyEmailCode(
  client: PoolClient,
  email: string,
  rawCode: unknown,
): Promise<VerifyResult> {
  if (typeof rawCode !== 'string') return { ok: false };
  const code = rawCode.trim().replace(/\D/g, '');
  if (code.length !== 6) return { ok: false };

  const now = Date.now();

  // Locked to the live challenge for this address. `FOR UPDATE` holds it for
  // the duration of the transaction so two concurrent guesses cannot both
  // read attempts=4 and both be allowed.
  const found = await client.query<{
    token_hash: string;
    attempts: number;
  }>(
    `SELECT token_hash, attempts FROM email_challenges
      WHERE email = $1 AND consumed_at IS NULL AND expires_at > $2
      ORDER BY created_at DESC LIMIT 1
      FOR UPDATE`,
    [email, now],
  );

  const challenge = found.rows[0];
  // No live challenge, expired, or already used — all reported identically,
  // because saying which would tell an attacker whether an address is even in
  // play.
  if (!challenge) return { ok: false };

  if (challenge.attempts >= MAX_ATTEMPTS) {
    // Burn it rather than leaving a locked-out row that still occupies the
    // "live challenge" slot for this address. Even the correct code is
    // refused now — that is the point of a cap.
    await client.query('UPDATE email_challenges SET consumed_at = $2 WHERE token_hash = $1', [
      challenge.token_hash,
      now,
    ]);
    return { ok: false };
  }

  const submitted = Buffer.from(hash(code), 'hex');
  const stored = Buffer.from(challenge.token_hash, 'hex');
  // Both are fixed-length SHA-256 digests, so a constant-time compare is
  // meaningful here rather than theatre.
  const ok = submitted.length === stored.length && timingSafeEqual(submitted, stored);

  if (!ok) {
    await client.query(
      'UPDATE email_challenges SET attempts = attempts + 1 WHERE token_hash = $1',
      [challenge.token_hash],
    );
    return { ok: false };
  }

  await client.query('UPDATE email_challenges SET consumed_at = $2 WHERE token_hash = $1', [
    challenge.token_hash,
    now,
  ]);

  return { ok: true, email };
}
