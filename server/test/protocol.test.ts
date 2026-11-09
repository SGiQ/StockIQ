import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLIENT_WRITABLE_COLLECTIONS,
  MAX_CLOCK_SKEW_MS,
  SERVER_OWNED_COLLECTIONS,
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

test('parseSyncRequest drops an entitlement row from a client and keeps the rest', () => {
  // Older apps re-uploaded the entitlement they had pulled whenever they
  // signed in. Refusing it failed their whole sync; dropping it never stores
  // it, which is the guarantee that matters.
  const parsed = parseSyncRequest({
    since: 0,
    changes: [
      record({ id: 'a' }),
      record({ collection: 'entitlement', id: 'entitlement', payload: { plan: 'pro' } }),
      record({ id: 'b' }),
    ],
  });
  assert.deepEqual(
    parsed.changes.map((r) => `${r.collection}/${r.id}`),
    ['progress/a', 'progress/b'],
  );
  assert.equal(CLIENT_WRITABLE_COLLECTIONS.has('entitlement'), false);
  assert.equal(SERVER_OWNED_COLLECTIONS.has('entitlement'), true);
});

test('parseSyncRequest still reports the original index after a dropped row', () => {
  assert.throws(
    () =>
      parseSyncRequest({
        since: 0,
        changes: [record({ collection: 'entitlement', id: 'entitlement' }), record({ collection: 'secrets' })],
      }),
    /changes\[1\]\.collection 'secrets' is not writable/,
  );
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
