/**
 * Drives the real sync service against real Postgres.
 * Two devices share one owner; a third owner proves isolation.
 */
const BASE = process.env.SYNC_URL ?? 'http://localhost:8787';

/**
 * A fresh owner per run.
 *
 * These assertions use absolute `updatedAt` values (1000, 2000, ...), so a
 * fixed owner makes the suite pass once and then fail forever against the
 * same database: the second run's "1000" is older than the first run's stored
 * "3000" and is correctly rejected as stale. That is the merge rule working,
 * not a regression — but a test that only passes on an empty table is a bad
 * test. Namespacing by run keeps it repeatable without wiping anything.
 */
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const OWNER = `owner-a-${RUN}`;
const OTHER = `owner-b-${RUN}`;

let failures = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? '  ✔' : '  ✖'} ${name}${cond ? '' : `  → ${detail}`}`);
  if (!cond) failures++;
};

async function sync(owner, since, changes = []) {
  const res = await fetch(`${BASE}/v1/sync`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-device-id': owner },
    body: JSON.stringify({ since, changes }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

const rec = (id, updatedAt, payload, deletedAt = null) => ({
  collection: 'progress',
  id,
  updatedAt,
  deletedAt,
  payload,
});

console.log('\n1. Push from device A, pull from device B');
const a1 = await sync(OWNER, 0, [rec('lesson-1', 1000, { status: 'completed', xp: 20 })]);
check('A push returns a cursor', a1.cursor > 0, `cursor=${a1.cursor}`);
const b1 = await sync(OWNER, 0, []);
check('B pulls A\'s record', b1.changes.length === 1 && b1.changes[0].id === 'lesson-1',
  JSON.stringify(b1.changes));
check('payload survived round trip', b1.changes[0]?.payload?.xp === 20,
  JSON.stringify(b1.changes[0]?.payload));

console.log('\n2. Last-write-wins: newer timestamp overwrites');
await sync(OWNER, b1.cursor, [rec('lesson-1', 2000, { status: 'completed', xp: 99 })]);
const afterNewer = await sync(OWNER, 0, []);
const r2 = afterNewer.changes.find((c) => c.id === 'lesson-1');
check('newer write won', r2.payload.xp === 99 && r2.updatedAt === 2000, JSON.stringify(r2));

console.log('\n3. Stale write is rejected, not applied');
await sync(OWNER, 0, [rec('lesson-1', 1500, { status: 'in_progress', xp: 5 })]);
const afterStale = await sync(OWNER, 0, []);
const r3 = afterStale.changes.find((c) => c.id === 'lesson-1');
check('older write did NOT overwrite', r3.payload.xp === 99 && r3.updatedAt === 2000,
  JSON.stringify(r3));

console.log('\n4. Re-pushing an identical record does not bump the cursor (no echo loop)');
const beforeEcho = await sync(OWNER, 0, []);
const quiet = await sync(OWNER, beforeEcho.cursor, [
  rec('lesson-1', 2000, { status: 'completed', xp: 99 }),
]);
check('identical re-push returns no changes', quiet.changes.length === 0,
  JSON.stringify(quiet.changes));
check('cursor unchanged', quiet.cursor === beforeEcho.cursor,
  `${beforeEcho.cursor} -> ${quiet.cursor}`);

console.log('\n5. Soft delete propagates as a tombstone');
await sync(OWNER, 0, [rec('lesson-1', 3000, { status: 'completed', xp: 99 }, 3000)]);
const afterDelete = await sync(OWNER, 0, []);
const r5 = afterDelete.changes.find((c) => c.id === 'lesson-1');
check('tombstone is returned (not silently dropped)', !!r5, 'record vanished entirely');
check('deletedAt set', r5?.deletedAt === 3000, JSON.stringify(r5));

console.log('\n6. Owner isolation');
const other = await sync(OTHER, 0, []);
check('a different owner sees nothing', other.changes.length === 0,
  JSON.stringify(other.changes));

console.log('\n7. Cursor only returns what changed since');
const base = await sync(OWNER, 0, []);
const noop = await sync(OWNER, base.cursor, []);
check('pull at current cursor is empty', noop.changes.length === 0,
  JSON.stringify(noop.changes));
await sync(OWNER, 0, [rec('lesson-2', 4000, { status: 'completed', xp: 20 })]);
const delta = await sync(OWNER, base.cursor, []);
check('only the new record comes back', delta.changes.length === 1 && delta.changes[0].id === 'lesson-2',
  JSON.stringify(delta.changes.map((c) => c.id)));

console.log('\n8. Malformed input is rejected with 400');
const bad = await fetch(`${BASE}/v1/sync`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-device-id': OWNER },
  body: JSON.stringify({ since: 0, changes: [{ collection: 'progress' }] }),
});
check('missing id rejected as 400', bad.status === 400, `status=${bad.status}`);
const noOwner = await fetch(`${BASE}/v1/sync`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ since: 0, changes: [] }),
});
check('missing owner rejected as 400', noOwner.status === 400, `status=${noOwner.status}`);

console.log(failures === 0 ? '\nALL PASSED\n' : `\n${failures} FAILURE(S)\n`);
process.exit(failures === 0 ? 0 : 1);
