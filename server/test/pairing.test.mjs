/**
 * Device pairing against real Postgres.
 *
 * The cases that matter are the ones where getting it wrong loses data or
 * leaks access: a code must work exactly once, an expired or wrong code must
 * be indistinguishable from a never-existed one, and revoking must cut off
 * the revoked device without touching the others.
 */
const BASE = process.env.SYNC_URL ?? 'http://localhost:8787';
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

let failures = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? '  ✔' : '  ✖'} ${name}${cond ? '' : `  → ${detail}`}`);
  if (!cond) failures++;
};

const dev = (n) => `device-${n}-${RUN}`;

async function call(path, deviceId, { method = 'POST', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-device-id': deviceId,
      'x-device-label': `Test ${deviceId.slice(0, 12)}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const rec = (id, updatedAt, payload) => ({
  collection: 'progress',
  id,
  updatedAt,
  deletedAt: null,
  payload,
});

const A = dev('a');
const B = dev('b');
const C = dev('c');

console.log('\n1. Fresh devices get separate accounts');
await call('/v1/sync', A, { body: { since: 0, changes: [rec('l-a', 1000, { xp: 10 })] } });
const bOnly = await call('/v1/sync', B, { body: { since: 0, changes: [rec('l-b', 1000, { xp: 20 })] } });
check('B does not see A\'s data before pairing',
  !bOnly.body.changes.some((c) => c.id === 'l-a'),
  JSON.stringify(bOnly.body.changes.map((c) => c.id)));

console.log('\n2. B pairs with A using a link code');
const start = await call('/v1/link/start', A);
check('A gets a code', typeof start.body.code === 'string' && start.body.code.length === 8,
  JSON.stringify(start.body));
const claim = await call('/v1/link/claim', B, { body: { code: start.body.code } });
check('B claims it', claim.status === 200 && claim.body.resetCursor === true,
  JSON.stringify(claim.body));

console.log('\n3. Joining moves the device, NOT its rows');
// The server deliberately leaves B's old records on B's old account: that
// account may still have other devices, and moving its rows would take their
// data away from them. So immediately after claiming, B sees A's history but
// not its own.
const justJoined = await call('/v1/sync', B, { body: { since: 0, changes: [] } });
const joinedIds = justJoined.body.changes.map((c) => c.id);
check('B sees A\'s record', joinedIds.includes('l-a'), JSON.stringify(joinedIds));
check('B\'s own record did NOT follow it server-side', !joinedIds.includes('l-b'),
  JSON.stringify(joinedIds));

console.log('\n4. The client re-pushes its local data, and then both merge');
// This is what SyncingRepository.joinAccount does: reset the cursor and mark
// every local record dirty so it is contributed to the new account.
await call('/v1/sync', B, { body: { since: 0, changes: [rec('l-b', 1000, { xp: 20 })] } });

const bAfter = await call('/v1/sync', B, { body: { since: 0, changes: [] } });
const ids = bAfter.body.changes.map((c) => c.id);
check('B now has both records', ids.includes('l-a') && ids.includes('l-b'), JSON.stringify(ids));

const aAfter = await call('/v1/sync', A, { body: { since: 0, changes: [] } });
const aIds = aAfter.body.changes.map((c) => c.id);
check('A sees B\'s contributed record', aIds.includes('l-b'), JSON.stringify(aIds));

console.log('\n5. A code is single-use');
const reuse = await call('/v1/link/claim', C, { body: { code: start.body.code } });
check('reusing a spent code fails', reuse.status === 400, `status=${reuse.status}`);
check('and says nothing about why', reuse.body.error === 'that code is not valid',
  JSON.stringify(reuse.body));

console.log('\n6. A wrong code is rejected identically to a spent one');
const wrong = await call('/v1/link/claim', C, { body: { code: 'ZZZZZZZZ' } });
check('wrong code gives the same message', wrong.body.error === 'that code is not valid',
  JSON.stringify(wrong.body));

console.log('\n7. Issuing a new code retires the previous one');
const first = await call('/v1/link/start', A);
const second = await call('/v1/link/start', A);
const staleClaim = await call('/v1/link/claim', C, { body: { code: first.body.code } });
check('the retired code no longer works', staleClaim.status === 400, `status=${staleClaim.status}`);
const freshClaim = await call('/v1/link/claim', C, { body: { code: second.body.code } });
check('the newest code works', freshClaim.status === 200, JSON.stringify(freshClaim.body));

console.log('\n8. Device list and revocation');
const list = await call('/v1/devices', A, { method: 'GET' });
check('all three devices are listed', list.body.devices?.length === 3,
  JSON.stringify(list.body.devices?.map((d) => d.id)));
check('the caller knows which row is itself', list.body.thisDeviceId === A,
  JSON.stringify(list.body.thisDeviceId));

const self = await call(`/v1/devices/${encodeURIComponent(A)}`, A, { method: 'DELETE' });
check('a device cannot revoke itself', self.status === 400, `status=${self.status}`);

const revoked = await call(`/v1/devices/${encodeURIComponent(C)}`, A, { method: 'DELETE' });
check('A can revoke C', revoked.status === 200, JSON.stringify(revoked.body));

const listAfter = await call('/v1/devices', A, { method: 'GET' });
check('C is gone from the list', listAfter.body.devices?.length === 2,
  JSON.stringify(listAfter.body.devices?.map((d) => d.id)));

console.log('\n9. A revoked device is cut off from the account');
const cAfter = await call('/v1/sync', C, { body: { since: 0, changes: [] } });
check('C no longer sees the account data',
  !cAfter.body.changes.some((c) => c.id === 'l-a'),
  JSON.stringify(cAfter.body.changes.map((c) => c.id)));

const stillA = await call('/v1/sync', A, { body: { since: 0, changes: [] } });
check('A is unaffected by the revocation',
  stillA.body.changes.some((c) => c.id === 'l-a'),
  JSON.stringify(stillA.body.changes.map((c) => c.id)));

console.log('\n10. Malformed codes are rejected');
const short = await call('/v1/link/claim', B, { body: { code: 'ABC' } });
check('a short code is rejected', short.status === 400, `status=${short.status}`);

console.log(failures === 0 ? '\nALL PASSED\n' : `\n${failures} FAILURE(S)\n`);
process.exit(failures === 0 ? 0 : 1);
