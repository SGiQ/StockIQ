/**
 * Magic-link / emailed-code sign-in, against the real service and Postgres.
 *
 * The code is read back from the console mail transport's output, because the
 * database only ever stores a HASH of it — that is the design, so the test
 * works the way an attacker with database access would have to: it cannot.
 *
 * Run the service with its output redirected to a log, then:
 *   MAIL_LOG=/path/to/sync.log node test/email.test.mjs
 */
import { readFileSync } from 'node:fs';

const BASE = process.env.SYNC_URL ?? 'http://localhost:8787';
const MAIL_LOG = process.env.MAIL_LOG;
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

let failures = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? '  ✔' : '  ✖'} ${name}${cond ? '' : `  → ${detail}`}`);
  if (!cond) failures++;
};

if (!MAIL_LOG) {
  console.error('MAIL_LOG must point at the service log so codes can be read.');
  process.exit(1);
}

async function call(path, deviceId, body, method = 'POST') {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-device-id': deviceId,
      'x-device-label': 'test',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

/** Most recent code the console transport printed for this address. */
function latestCodeFor(email) {
  const log = readFileSync(MAIL_LOG, 'utf8');
  const blocks = log.split('──── email');
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (!blocks[i].includes(`To: ${email}`)) continue;
    const match = blocks[i].match(/^\s{4}(\d{6})$/m);
    if (match) return match[1];
  }
  return null;
}

const rec = (id, updatedAt, payload) => ({
  collection: 'progress',
  id,
  updatedAt,
  deletedAt: null,
  payload,
});

const dev = (n) => `email-dev-${n}-${RUN}`;
const addr = (n) => `${n}-${RUN}@example.com`;

const phone = dev('phone');
const laptop = dev('laptop');
const shared = dev('shared');
const alice = addr('alice');

// The console transport writes asynchronously relative to the HTTP response.
const settle = () => new Promise((r) => setTimeout(r, 250));

console.log('\n1. Requesting a code reveals nothing');
await call('/v1/sync', phone, { since: 0, changes: [rec('offline-work', 1000, { xp: 5 })] });
const req1 = await call('/v1/auth/email/request', phone, { email: alice });
check('request succeeds', req1.status === 200 && req1.body.ok === true, JSON.stringify(req1.body));

const unknown = await call('/v1/auth/email/request', phone, { email: addr('nobody') });
check('an unknown address answers identically',
  unknown.status === req1.status && JSON.stringify(unknown.body) === JSON.stringify(req1.body),
  `${unknown.status} ${JSON.stringify(unknown.body)}`);

const malformed = await call('/v1/auth/email/request', phone, { email: 'not-an-email' });
check('a malformed address is still a 400', malformed.status === 400, `status=${malformed.status}`);

await settle();
const code1 = latestCodeFor(alice);
check('a six-digit code was emailed', /^\d{6}$/.test(code1 ?? ''), String(code1));

console.log('\n2. A wrong code is refused, and says nothing useful');
const wrong = await call('/v1/auth/email/verify', phone, {
  email: alice,
  code: code1 === '000000' ? '111111' : '000000',
});
check('wrong code rejected', wrong.status === 400, `status=${wrong.status}`);
check('message is generic', wrong.body.error === 'that code is not valid',
  JSON.stringify(wrong.body));

console.log('\n3. The right code signs in and keeps existing progress');
const ok = await call('/v1/auth/email/verify', phone, { email: alice, code: code1 });
check('sign-in succeeds', ok.status === 200, JSON.stringify(ok.body));
check('merge is allowed', ok.body.merge === true, JSON.stringify(ok.body));

const signedInSession = await call('/v1/auth/session', phone, undefined, 'GET');
check('session reports the signed-in email',
  signedInSession.status === 200
    && signedInSession.body.signedIn === true
    && signedInSession.body.email === alice,
  JSON.stringify(signedInSession.body));

const afterSignIn = await call('/v1/sync', phone, { since: 0, changes: [] });
check('offline progress survived',
  afterSignIn.body.changes.some((c) => c.id === 'offline-work'),
  JSON.stringify(afterSignIn.body.changes.map((c) => c.id)));

console.log('\n4. A code works exactly once');
const replay = await call('/v1/auth/email/verify', laptop, { email: alice, code: code1 });
check('reusing a consumed code fails', replay.status === 400, `status=${replay.status}`);

console.log('\n5. A code works from a DIFFERENT device than requested it');
// This is the case a pure magic link cannot serve: requested on the phone,
// email read on a laptop.
await call('/v1/auth/email/request', phone, { email: alice });
await settle();
const code2 = latestCodeFor(alice);
check('a fresh code was issued', /^\d{6}$/.test(code2 ?? '') && code2 !== code1, String(code2));

const crossDevice = await call('/v1/auth/email/verify', laptop, { email: alice, code: code2 });
check('the other device can use it', crossDevice.status === 200, JSON.stringify(crossDevice.body));
check('it lands on the same account', crossDevice.body.accountId === ok.body.accountId,
  `${ok.body.accountId} vs ${crossDevice.body.accountId}`);

const recovered = await call('/v1/sync', laptop, { since: 0, changes: [] });
check('the second device receives the history',
  recovered.body.changes.some((c) => c.id === 'offline-work'),
  JSON.stringify(recovered.body.changes.map((c) => c.id)));

console.log('\n6. Issuing a new code retires the previous one');
await call('/v1/auth/email/request', phone, { email: alice });
await settle();
const code3 = latestCodeFor(alice);
await call('/v1/auth/email/request', phone, { email: alice });
await settle();
const code4 = latestCodeFor(alice);
check('two distinct codes were issued', code3 !== code4, `${code3} / ${code4}`);
const retired = await call('/v1/auth/email/verify', phone, { email: alice, code: code3 });
check('the older code no longer works', retired.status === 400, `status=${retired.status}`);
const newest = await call('/v1/auth/email/verify', phone, { email: alice, code: code4 });
check('the newest code works', newest.status === 200, JSON.stringify(newest.body));

console.log('\n7. Guesses against one challenge are capped');
const bob = addr('bob');
await call('/v1/auth/email/request', shared, { email: bob });
await settle();
const bobCode = latestCodeFor(bob);
for (let i = 0; i < 5; i++) {
  await call('/v1/auth/email/verify', shared, { email: bob, code: '999999' === bobCode ? '888888' : '999999' });
}
const lockedOut = await call('/v1/auth/email/verify', shared, { email: bob, code: bobCode });
check('the correct code is refused after too many wrong guesses',
  lockedOut.status === 400, `status=${lockedOut.status}`);

console.log('\n8. Requests per address are rate limited');
const flooded = addr('flood');
let limited = false;
for (let i = 0; i < 8; i++) {
  await call('/v1/auth/email/request', shared, { email: flooded });
}
await settle();
const log = readFileSync(MAIL_LOG, 'utf8');
const sent = log.split('──── email').filter((b) => b.includes(`To: ${flooded}`)).length;
limited = sent <= 5;
check('an inbox cannot be flooded indefinitely', limited, `${sent} emails sent for 8 requests`);

console.log('\n9. A second person on a shared phone does not inherit the first');
const shared2 = dev('shared2');
await call('/v1/sync', shared2, { since: 0, changes: [rec('first-person', 1000, { xp: 9 })] });
await call('/v1/auth/email/request', shared2, { email: addr('first') });
await settle();
await call('/v1/auth/email/verify', shared2, {
  email: addr('first'),
  code: latestCodeFor(addr('first')),
});
await call('/v1/auth/email/request', shared2, { email: addr('second') });
await settle();
const second = await call('/v1/auth/email/verify', shared2, {
  email: addr('second'),
  code: latestCodeFor(addr('second')),
});
check('the second person gets their own account', second.status === 200, JSON.stringify(second.body));
check('merge is REFUSED', second.body.merge === false, JSON.stringify(second.body));

console.log(failures === 0 ? '\nALL PASSED\n' : `\n${failures} FAILURE(S)\n`);
process.exit(failures === 0 ? 0 : 1);
