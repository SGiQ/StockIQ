import { randomBytes, randomInt } from 'node:crypto';
import type { PoolClient } from 'pg';
import { ProtocolError } from './protocol.ts';

/**
 * Device identity, account resolution, and pairing.
 */

/** How long a pairing code is valid. Short, because the code is short. */
const CODE_TTL_MS = 5 * 60 * 1000;

/**
 * Crockford base32 without I, L, O, U — the characters people misread when
 * copying a code off one screen onto another, and U so the alphabet cannot
 * spell anything unfortunate.
 */
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 8;

/**
 * Claim attempts allowed per device per window.
 *
 * An 8-character code from a 32-symbol alphabet is 40 bits, which is plenty
 * against online guessing ONLY while guessing is rate limited. Without this,
 * the short TTL alone would not save a code from being brute-forced by a
 * determined caller.
 */
const CLAIM_ATTEMPT_LIMIT = 10;
const CLAIM_WINDOW_MS = 10 * 60 * 1000;

const attempts = new Map<string, { count: number; resetAt: number }>();

function tooManyAttempts(deviceId: string, now: number): boolean {
  const entry = attempts.get(deviceId);
  if (!entry || now > entry.resetAt) {
    attempts.set(deviceId, { count: 1, resetAt: now + CLAIM_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > CLAIM_ATTEMPT_LIMIT;
}

/**
 * In-process, so it resets on deploy and is per-instance rather than global.
 * That is a deliberate limit, not an oversight: it raises the cost of
 * guessing without adding a datastore, and the code's five-minute life is the
 * primary defence. If this ever runs multi-instance at scale, move the
 * counter to Postgres or Redis.
 */
export function resetAttemptLimiter(): void {
  attempts.clear();
}

function generateCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    // randomInt is rejection-sampled and unbiased; Math.random would be
    // predictable and this value is a credential for joining an account.
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

/** Codes are compared case-insensitively and without separators. */
export function normaliseCode(raw: unknown): string {
  if (typeof raw !== 'string') throw new ProtocolError('code is required');
  const value = raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (value.length !== CODE_LENGTH) throw new ProtocolError('code is malformed');
  return value;
}

/**
 * Resolves a device to its account, creating both on first contact.
 *
 * A device that has never been seen gets a brand-new account of its own, so a
 * fresh install simply works with no signup step. Pairing later moves it onto
 * someone else's account.
 */
export async function resolveAccount(
  client: PoolClient,
  deviceId: string,
  label: string | null,
): Promise<string> {
  const now = Date.now();

  const existing = await client.query<{ account_id: string }>(
    'SELECT account_id FROM devices WHERE id = $1',
    [deviceId],
  );

  if (existing.rows.length) {
    await client.query('UPDATE devices SET last_seen_at = $2 WHERE id = $1', [deviceId, now]);
    return existing.rows[0]!.account_id;
  }

  // New device: its own account. The account id is deliberately NOT the
  // device id — they are different things, and reusing the value would make
  // it impossible to tell a device secret from an account reference later.
  const accountId = `acct_${randomBytes(12).toString('hex')}`;
  await client.query('INSERT INTO accounts (id, created_at) VALUES ($1, $2)', [accountId, now]);
  await client.query(
    `INSERT INTO devices (id, account_id, label, created_at, last_seen_at)
     VALUES ($1, $2, $3, $4, $4)`,
    [deviceId, accountId, label, now],
  );
  return accountId;
}

export async function createLinkCode(
  client: PoolClient,
  accountId: string,
): Promise<{ code: string; expiresAt: number }> {
  const now = Date.now();

  // Any earlier unused codes for this account are retired. Two live codes for
  // one account doubles the guessing surface for no benefit.
  await client.query(
    'UPDATE link_codes SET used_at = $2 WHERE account_id = $1 AND used_at IS NULL',
    [accountId, now],
  );

  const code = generateCode();
  const expiresAt = now + CODE_TTL_MS;
  await client.query(
    `INSERT INTO link_codes (code, account_id, created_at, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [code, accountId, now, expiresAt],
  );
  return { code, expiresAt };
}

export interface ClaimResult {
  accountId: string;
  previousAccountId: string;
}

/**
 * Attaches a device to the account that issued `code`.
 *
 * The UPDATE that consumes the code carries its own `used_at IS NULL AND
 * expires_at > now` predicate, so validity is decided by the database in the
 * same statement that spends it. Checking first and updating after would let
 * two devices racing on one code both pass the check.
 */
export async function claimLinkCode(
  client: PoolClient,
  deviceId: string,
  label: string | null,
  code: string,
): Promise<ClaimResult> {
  const now = Date.now();

  if (tooManyAttempts(deviceId, now)) {
    throw new ProtocolError('too many attempts; wait a few minutes');
  }

  const consumed = await client.query<{ account_id: string }>(
    `UPDATE link_codes SET used_at = $2
      WHERE code = $1 AND used_at IS NULL AND expires_at > $2
      RETURNING account_id`,
    [code, now],
  );

  if (!consumed.rows.length) {
    // Expired, already used, and never existed are all reported identically.
    // Distinguishing them would tell an attacker which guesses were real
    // codes, which is exactly the signal that makes brute forcing cheap.
    throw new ProtocolError('that code is not valid');
  }

  const target = consumed.rows[0]!.account_id;
  const previous = await resolveAccount(client, deviceId, label);

  if (previous === target) return { accountId: target, previousAccountId: previous };

  await client.query('UPDATE devices SET account_id = $2, last_seen_at = $3 WHERE id = $1', [
    deviceId,
    target,
    now,
  ]);

  // The old account and its records are left exactly where they are.
  //
  // It is tempting to move them onto the target account so the joining
  // device's history "comes with it". That would be wrong: the old account
  // may still have other devices attached, and moving its rows would silently
  // take their data away from them.
  //
  // Instead the joining CLIENT re-pushes its own local records after a
  // successful claim (see SyncingRepository.joinAccount). The client already
  // holds that data, so it can contribute it to the new account without the
  // server ever reaching across an account boundary. `resetCursor` in the
  // response is what tells it to do so.
  return { accountId: target, previousAccountId: previous };
}

export type IdentityProvider = 'apple' | 'email';

export interface SignInResult {
  accountId: string;
  /**
   * Whether the client should contribute its local records to the account it
   * just landed on. True in the ordinary cases; false when the device is
   * moving to a *different person's* account (see below), where merging would
   * copy one person's progress into another's.
   */
  merge: boolean;
  /**
   * Whether this is the first time this identity has been used.
   */
  isNewIdentity: boolean;
}

/**
 * Signs a device in with a VERIFIED identity.
 *
 * Provider-agnostic on purpose. Whether the caller proved themselves with an
 * Apple token or an emailed code, what happens to the data afterwards is
 * identical — and the third case below is subtle enough that having one copy
 * of it, rather than one per provider, is what stops the two drifting apart.
 *
 * This function assumes verification already happened. It must never be
 * called with a subject the caller merely claimed.
 *
 * Signing in is the same "join an account" operation as pairing, just
 * authenticated differently, so it deliberately reuses the same merge
 * semantics. Three cases:
 *
 * 1. **Known `sub`** — the person has signed in before, possibly on another
 *    phone. The device joins that account and merges its local work, exactly
 *    as pairing does. This is what makes recovery on a new phone work.
 *
 * 2. **New `sub`, device's account unclaimed** — the ordinary first sign-in:
 *    someone used the app offline and is now securing it. The identity is
 *    attached to the account they already have, so not a single row moves and
 *    nothing can be lost.
 *
 * 3. **New `sub`, device's account already claimed by someone else** — a
 *    second person signing in on a shared phone. They get a fresh account and
 *    `merge: false`, because pushing the local records would copy the first
 *    person's progress into the second person's account. This is the one case
 *    where merging is actively wrong.
 */
export async function signInWithIdentity(
  client: PoolClient,
  deviceId: string,
  label: string | null,
  provider: IdentityProvider,
  subject: string,
): Promise<SignInResult> {
  const now = Date.now();
  const currentAccount = await resolveAccount(client, deviceId, label);

  const known = await client.query<{ account_id: string }>(
    'SELECT account_id FROM identities WHERE provider = $1 AND subject = $2',
    [provider, subject],
  );

  // Case 1 — returning user.
  if (known.rows.length) {
    const target = known.rows[0]!.account_id;
    if (target !== currentAccount) {
      await client.query('UPDATE devices SET account_id = $2, last_seen_at = $3 WHERE id = $1', [
        deviceId,
        target,
        now,
      ]);
    }
    return { accountId: target, merge: true, isNewIdentity: false };
  }

  // Any identity already on this account counts as "claimed", regardless of
  // provider: an account secured with Apple must not be silently taken over
  // by someone signing in with an unrelated email on the same phone.
  const claimed = await client.query<{ subject: string }>(
    'SELECT subject FROM identities WHERE account_id = $1',
    [currentAccount],
  );

  // Case 2 — first sign-in on an account nobody has claimed.
  if (claimed.rows.length === 0) {
    await client.query(
      'INSERT INTO identities (provider, subject, account_id, created_at) VALUES ($1, $2, $3, $4)',
      [provider, subject, currentAccount, now],
    );
    return { accountId: currentAccount, merge: true, isNewIdentity: true };
  }

  // Case 3 — a different person on a device that is already signed in.
  const accountId = `acct_${randomBytes(12).toString('hex')}`;
  await client.query('INSERT INTO accounts (id, created_at) VALUES ($1, $2)', [accountId, now]);
  await client.query(
    'INSERT INTO identities (provider, subject, account_id, created_at) VALUES ($1, $2, $3, $4)',
    [provider, subject, accountId, now],
  );
  await client.query('UPDATE devices SET account_id = $2, last_seen_at = $3 WHERE id = $1', [
    deviceId,
    accountId,
    now,
  ]);
  return { accountId, merge: false, isNewIdentity: true };
}

export interface DeviceRow {
  id: string;
  label: string | null;
  createdAt: number;
  lastSeenAt: number;
}

export async function listDevices(
  client: PoolClient,
  accountId: string,
): Promise<DeviceRow[]> {
  const { rows } = await client.query<{
    id: string;
    label: string | null;
    created_at: number;
    last_seen_at: number;
  }>(
    `SELECT id, label, created_at, last_seen_at
       FROM devices WHERE account_id = $1 ORDER BY created_at`,
    [accountId],
  );
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    createdAt: r.created_at,
    lastSeenAt: r.last_seen_at,
  }));
}

/**
 * Removes another device from this account.
 *
 * Revoking the caller's own device is refused: it would silently detach the
 * phone in your hand while looking like it removed the lost one, and the very
 * next sync would recreate it on a fresh empty account. Removing your own
 * device is what `reset()` in the app is for.
 */
export async function revokeDevice(
  client: PoolClient,
  accountId: string,
  callerDeviceId: string,
  targetDeviceId: string,
): Promise<void> {
  if (callerDeviceId === targetDeviceId) {
    throw new ProtocolError('a device cannot revoke itself');
  }
  const result = await client.query(
    'DELETE FROM devices WHERE id = $1 AND account_id = $2',
    [targetDeviceId, accountId],
  );
  if (result.rowCount === 0) throw new ProtocolError('no such device on this account');
}

/**
 * Detaches the caller from its account without deleting that account.
 *
 * The next authenticated request from the same installation creates a fresh
 * anonymous account through `resolveAccount`. Keeping this server-side is
 * essential: clearing only browser storage would leave the device capability
 * authorised to read the old account on its next sync.
 */
export async function signOutDevice(
  client: PoolClient,
  accountId: string,
  deviceId: string,
): Promise<void> {
  const result = await client.query(
    'DELETE FROM devices WHERE id = $1 AND account_id = $2',
    [deviceId, accountId],
  );
  if (result.rowCount === 0) throw new ProtocolError('device is not signed in');
}

/**
 * Erases an account and every trace of it.
 *
 * `records` is keyed by `owner_id` as a plain column with no foreign key, so
 * it does not fall to the accounts cascade and must be deleted explicitly.
 * Everything else that belongs to an account — devices, identities,
 * apple_identities, link_codes, telemetry_events — carries
 * `REFERENCES accounts(id) ON DELETE CASCADE`, so dropping the account row
 * removes all of it in the same statement.
 *
 * Runs inside the caller's transaction, so either the whole account and its
 * data disappear together or nothing does. Afterwards the device's next
 * request resolves to a brand-new empty account through `resolveAccount`,
 * exactly as a fresh install would — there is no lingering authorised state.
 *
 * This is the deletion Apple's guideline 5.1.1(v) requires and the erasure
 * right under GDPR/CCPA: unlike sign-out, no rows are left behind.
 */
export async function deleteAccount(client: PoolClient, accountId: string): Promise<void> {
  await client.query('DELETE FROM records WHERE owner_id = $1', [accountId]);
  await client.query('DELETE FROM accounts WHERE id = $1', [accountId]);
}

/** Identity summary for a device that is already authorised on this account. */
export async function getAccountSession(
  client: PoolClient,
  accountId: string,
): Promise<{ signedIn: boolean; email: string | null }> {
  const { rows } = await client.query<{ provider: IdentityProvider; subject: string }>(
    'SELECT provider, subject FROM identities WHERE account_id = $1',
    [accountId],
  );
  return {
    signedIn: rows.length > 0,
    email: rows.find((row) => row.provider === 'email')?.subject ?? null,
  };
}
