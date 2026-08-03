/**
 * Drives account deletion against the real sync service and real Postgres.
 *
 * Proves, through the API alone, that DELETE /v1/account:
 *   - erases the account's records (they do not fall to the FK cascade, so the
 *     endpoint must delete them explicitly);
 *   - removes the account and every device on it — a *second, linked* device
 *     loses access too, which only happens if the accounts→devices cascade
 *     fired;
 *   - leaves the caller on a brand-new empty account, so nothing authorised
 *     survives on the device.
 */
const BASE = process.env.SYNC_URL ?? 'http://localhost:8787';

const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const DEVICE_A = `del-a-${RUN}`;
const DEVICE_B = `del-b-${RUN}`;

let failures = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? '  ✔' : '  ✖'} ${name}${cond ? '' : `  → ${detail}`}`);
  if (!cond) failures++;
};

async function call(device, path, method, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-device-id': device, 'x-device-label': 'test' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

const sync = (device, since, changes = []) => call(device, '/v1/sync', 'POST', { since, changes });
const rec = (id, updatedAt, payload) => ({ collection: 'progress', id, updatedAt, deletedAt: null, payload });

async function main() {
  console.log('\n1. Set up an account with data and two linked devices');
  await sync(DEVICE_A, 0, [rec('lesson-1', 1000, { xp: 100 })]);
  const code = (await call(DEVICE_A, '/v1/link/start', 'POST', {})).code;
  await call(DEVICE_B, '/v1/link/claim', 'POST', { code });
  await sync(DEVICE_A, 0, [rec('lesson-2', 2000, { xp: 200 })]);

  const beforeA = await sync(DEVICE_A, 0);
  const beforeB = await sync(DEVICE_B, 0);
  check('device A sees its records before delete', beforeA.changes.length === 2, `got ${beforeA.changes.length}`);
  check('linked device B shares the same account', beforeB.changes.length === 2, `got ${beforeB.changes.length}`);

  console.log('\n2. Delete the account from device A');
  const del = await call(DEVICE_A, '/v1/account', 'DELETE');
  check('delete returns ok', del.ok === true, JSON.stringify(del));

  console.log('\n3. Everything is gone, both devices land on fresh empty accounts');
  const afterA = await sync(DEVICE_A, 0);
  const afterB = await sync(DEVICE_B, 0);
  check('device A now on an empty account (records erased)', afterA.changes.length === 0, `got ${afterA.changes.length}`);
  check('linked device B was cascade-removed → empty account', afterB.changes.length === 0, `got ${afterB.changes.length}`);

  console.log('\n4. The fresh account is genuinely new, not the old one resurfacing');
  await sync(DEVICE_A, 0, [rec('lesson-3', 3000, { xp: 300 })]);
  const rePull = await sync(DEVICE_A, 0);
  const ids = rePull.changes.map((c) => c.id).sort();
  check('only the new record exists, old ones did not return', JSON.stringify(ids) === JSON.stringify(['lesson-3']), JSON.stringify(ids));

  console.log(failures === 0 ? '\n✅ account deletion verified\n' : `\n❌ ${failures} check(s) failed\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('\n✖ test crashed:', error.message, '\n');
  process.exit(1);
});
