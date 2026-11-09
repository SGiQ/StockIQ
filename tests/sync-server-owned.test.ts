import assert from 'node:assert/strict';
import test from 'node:test';
import { SERVER_OWNED_COLLECTIONS, pushableChanges } from '../src/store/sync/serverOwned';
import type { LocalRecord } from '../src/store/sqlite/SqliteRepository';

const row = (collection: string, id: string): LocalRecord => ({
  collection,
  id,
  updatedAt: 1_700_000_000_000,
  deletedAt: null,
  payload: { id },
});

test('the entitlement is server-owned', () => {
  assert.equal(SERVER_OWNED_COLLECTIONS.has('entitlement'), true);
  assert.equal(SERVER_OWNED_COLLECTIONS.has('profile'), false);
});

test('pushableChanges drops the entitlement a sign-in marked dirty, keeps the rest in order', () => {
  // Signing in marks every local row dirty, the pulled entitlement included.
  const dirty = [
    row('profile', 'profile'),
    row('entitlement', 'entitlement'),
    row('progress', 'course/lesson'),
  ];
  assert.deepEqual(
    pushableChanges(dirty).map((r) => r.collection),
    ['profile', 'progress'],
  );
});

test('pushableChanges is a no-op when nothing server-owned is dirty', () => {
  const dirty = [row('saved', 'a'), row('streak', 'streak')];
  assert.deepEqual(pushableChanges(dirty), dirty);
});
