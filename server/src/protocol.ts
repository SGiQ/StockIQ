/**
 * The sync wire contract.
 *
 * MIRRORED in the app at src/store/sync/protocol.ts. The two files must stay
 * identical in shape. They are duplicated rather than shared because this
 * directory has to deploy to Railway standalone, so it cannot import from the
 * Expo app's source tree.
 *
 * Drift is caught rather than silent: `parseSyncRequest` below validates every
 * incoming field, so a mismatched client gets a 400 with a specific message
 * instead of writing corrupt rows.
 */

/** One record, in exactly the shape both sides already store it. */
export interface RecordRow {
  collection: string;
  id: string;
  /** Client wall-clock ms. Conflict resolution only — never a page cursor. */
  updatedAt: number;
  /** Soft-delete tombstone; null when live. */
  deletedAt: number | null;
  payload: unknown;
}

export interface SyncRequest {
  /**
   * Server sequence the client last saw. 0 means "send me everything".
   * Deliberately NOT a timestamp — see the server_seq note in the migration.
   */
  since: number;
  changes: RecordRow[];
}

export interface SyncResponse {
  /** New cursor to persist and send as `since` next time. */
  cursor: number;
  changes: RecordRow[];
  /**
   * True when the pull hit its page limit. The client should sync again
   * immediately with the new cursor rather than waiting for the next
   * interval, otherwise a large first sync would trickle in one page per
   * app launch.
   */
  hasMore: boolean;
  /** Server clock, so a client can warn about severe local skew. */
  serverTime: number;
}

/* ------------------------------------------------------------------ *
 * Limits — a public endpoint with an unauthenticated-ish capability
 * token needs bounds, or one client can fill the table.
 * ------------------------------------------------------------------ */

export const LIMITS = {
  maxChangesPerRequest: 500,
  /** Rows returned per pull; the client loops while `hasMore` is true. */
  pullPageSize: 500,
  maxPayloadBytes: 64 * 1024,
  maxCollectionLength: 64,
  maxIdLength: 256,
  /** 128 bits of hex/uuid entropy; anything shorter is not a capability. */
  minOwnerIdLength: 16,
  maxOwnerIdLength: 128,
} as const;

export class ProtocolError extends Error {}

function fail(message: string): never {
  throw new ProtocolError(message);
}

/**
 * The device's own secret, sent on every request.
 *
 * This identifies the DEVICE, not the account. The server maps it to an
 * account, which is what makes multi-device possible without ever copying one
 * device's secret onto another — and therefore what makes revoking a lost
 * phone mean something.
 */
export function parseDeviceId(raw: unknown): string {
  if (typeof raw !== 'string') fail('X-Device-Id header is required');
  const value = raw.trim();
  if (
    value.length < LIMITS.minOwnerIdLength ||
    value.length > LIMITS.maxOwnerIdLength
  ) {
    fail(
      `X-Device-Id must be ${LIMITS.minOwnerIdLength}-${LIMITS.maxOwnerIdLength} characters`,
    );
  }
  // Conservative charset: this value goes into a SQL parameter, but keeping it
  // opaque-but-simple also means it is safe to log and to use in metrics keys.
  if (!/^[A-Za-z0-9._:-]+$/.test(value)) fail('X-Device-Id has invalid characters');
  return value;
}

/** Optional, purely so a person can recognise a row in the device list. */
export function parseDeviceLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().slice(0, 64);
  return value.length ? value : null;
}

export function parseSyncRequest(body: unknown): SyncRequest {
  if (typeof body !== 'object' || body === null) fail('body must be an object');
  const raw = body as Record<string, unknown>;

  const since = raw.since ?? 0;
  if (typeof since !== 'number' || !Number.isFinite(since) || since < 0) {
    fail('since must be a non-negative number');
  }

  const changes = raw.changes ?? [];
  if (!Array.isArray(changes)) fail('changes must be an array');
  if (changes.length > LIMITS.maxChangesPerRequest) {
    fail(`changes may not exceed ${LIMITS.maxChangesPerRequest} records`);
  }

  return { since, changes: changes.map(parseRecord) };
}

function parseRecord(raw: unknown, index: number): RecordRow {
  if (typeof raw !== 'object' || raw === null) fail(`changes[${index}] must be an object`);
  const r = raw as Record<string, unknown>;

  const collection = r.collection;
  if (
    typeof collection !== 'string' ||
    !collection ||
    collection.length > LIMITS.maxCollectionLength
  ) {
    fail(`changes[${index}].collection is missing or too long`);
  }

  const id = r.id;
  if (typeof id !== 'string' || !id || id.length > LIMITS.maxIdLength) {
    fail(`changes[${index}].id is missing or too long`);
  }

  const updatedAt = r.updatedAt;
  if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt)) {
    fail(`changes[${index}].updatedAt must be a number`);
  }

  const deletedAt = r.deletedAt ?? null;
  if (deletedAt !== null && (typeof deletedAt !== 'number' || !Number.isFinite(deletedAt))) {
    fail(`changes[${index}].deletedAt must be a number or null`);
  }

  if (!('payload' in r)) fail(`changes[${index}].payload is required`);
  const size = Buffer.byteLength(JSON.stringify(r.payload) ?? 'null', 'utf8');
  if (size > LIMITS.maxPayloadBytes) {
    fail(`changes[${index}].payload exceeds ${LIMITS.maxPayloadBytes} bytes`);
  }

  return { collection, id, updatedAt, deletedAt, payload: r.payload };
}
