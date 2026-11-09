import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLIENT_WRITABLE_COLLECTIONS,
  MAX_CLOCK_SKEW_MS,
  ProtocolError,
  clampRecordClocks,
  parseSyncRequest,
  type RecordRow,
} from '../src/protocol.ts';

const record = (over: Partial<RecordRow> = {}): RecordRow => ({
  collection: 'progress',
  id: 'course/lesson',
  updatedAt: 1_700_000_000_000,
  deletedAt: null,
  payload: { status: 'completed' },
  ...over,
});

test('parseSyncRequest accepts every client collection', () => {
  const changes = [...CLIENT_WRITABLE_COLLECTIONS].map((collection) => record({ collection }));
  const parsed = parseSyncRequest({ since: 0, changes });
  assert.equal(parsed.changes.length, changes.length);
});

test('parseSyncRequest refuses an entitlement row from a client', () => {
  assert.throws(
    () => parseSyncRequest({ since: 0, changes: [record({ collection: 'entitlement', payload: { plan: 'pro' } })] }),
    (e: unknown) => e instanceof ProtocolError && /'entitlement' is not writable/.test(e.message),
  );
  assert.equal(CLIENT_WRITABLE_COLLECTIONS.has('entitlement'), false);
});

test('parseSyncRequest refuses unknown collections by name', () => {
  assert.throws(
    () => parseSyncRequest({ since: 0, changes: [record({ collection: 'secrets' })] }),
    /changes\[0\]\.collection 'secrets' is not writable/,
  );
});

test('clampRecordClocks: honest timestamps pass through untouched (same object)', () => {
  const now = 1_700_000_000_000;
  const r = record({ updatedAt: now - 1000, deletedAt: now - 500 });
  assert.equal(clampRecordClocks(r, now), r);
  // A little skew is allowed.
  const skewed = record({ updatedAt: now + MAX_CLOCK_SKEW_MS });
  assert.equal(clampRecordClocks(skewed, now), skewed);
});

test('clampRecordClocks: a clock far ahead is pulled back to now + skew', () => {
  const now = 1_700_000_000_000;
  const poisoned = record({ updatedAt: 9e15, deletedAt: 9e15 });
  const out = clampRecordClocks(poisoned, now);
  assert.equal(out.updatedAt, now + MAX_CLOCK_SKEW_MS);
  assert.equal(out.deletedAt, now + MAX_CLOCK_SKEW_MS);
  assert.equal(out.payload, poisoned.payload, 'payload is untouched');
  // A live row stays live.
  assert.equal(clampRecordClocks(record({ updatedAt: 9e15 }), now).deletedAt, null);
});
