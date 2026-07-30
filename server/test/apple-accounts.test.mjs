/**
 * Apple sign-in → account mapping, against the real service and real Postgres.
 *
 * This test stands up a stand-in for Apple: a local JWKS endpoint and a
 * matching signing key, so tokens the service will actually accept can be
 * minted here. The service must be started pointing at it — see the header of
 * the run instructions below.
 *
 * The three cases are the whole feature, and the third is the one where
 * getting it wrong copies one person's progress into another person's account.
 *
 * Run:
 *   node test/apple-accounts.test.mjs
 * with the service started as:
 *   APPLE_ISSUER=http://127.0.0.1:8799 \
 *   APPLE_JWKS_URL=http://127.0.0.1:8799/keys \
 *   APPLE_BUNDLE_ID=com.stockiq.app npm start
 */
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

const BASE = process.env.SYNC_URL ?? 'http://localhost:8787';
const ISSUER = 'http://127.0.0.1:8799';
const BUNDLE_ID = 'com.stockiq.app';
const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

let failures = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? '  ✔' : '  ✖'} ${name}${cond ? '' : `  → ${detail}`}`);
  if (!cond) failures++;
};

const sha256 = (v) => createHash('sha256').update(v).digest('hex');
const { publicKey, privateKey } = await generateKeyPair('RS256');
const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };

const jwks = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ keys: [jwk] }));
});
await new Promise((r) => jwks.listen(8799, '127.0.0.1', r));

const RAW_NONCE = 'nonce-value-at-least-16-chars';
const mintToken = (sub) =>
  new SignJWT({ nonce: sha256(RAW_NONCE) })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(BUNDLE_ID)
    .setSubject(sub)
    .setExpirationTime('10m')
    .sign(privateKey);

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

const rec = (id, updatedAt, payload) => ({
  collection: 'progress',
  id,
  updatedAt,
  deletedAt: null,
  payload,
});

const dev = (n) => `apple-dev-${n}-${RUN}`;
const sub = (n) => `apple-sub-${n}-${RUN}`;

const phone = dev('phone');
const tablet = dev('tablet');
const shared = dev('shared');

console.log('\n1. First sign-in claims the account the device already has');
await call('/v1/sync', phone, { since: 0, changes: [rec('offline-work', 1000, { xp: 7 })] });
const first = await call('/v1/auth/apple', phone, {
  identityToken: await mintToken(sub('alice')),
  nonce: RAW_NONCE,
});
check('sign-in succeeds', first.status === 200, JSON.stringify(first.body));
check('merge is allowed', first.body.merge === true, JSON.stringify(first.body));

const afterClaim = await call('/v1/sync', phone, { since: 0, changes: [] });
check('offline progress was NOT lost',
  afterClaim.body.changes.some((c) => c.id === 'offline-work'),
  JSON.stringify(afterClaim.body.changes.map((c) => c.id)));

console.log('\n2. A returning sign-in on a new device recovers the account');
const second = await call('/v1/auth/apple', tablet, {
  identityToken: await mintToken(sub('alice')),
  nonce: RAW_NONCE,
});
check('lands on the same account', second.body.accountId === first.body.accountId,
  `${first.body.accountId} vs ${second.body.accountId}`);
check('merge is allowed', second.body.merge === true, JSON.stringify(second.body));

const recovered = await call('/v1/sync', tablet, { since: 0, changes: [] });
check('the new device receives the history',
  recovered.body.changes.some((c) => c.id === 'offline-work'),
  JSON.stringify(recovered.body.changes.map((c) => c.id)));

const devices = await call('/v1/devices', tablet, undefined, 'GET');
check('both devices are on the account', devices.body.devices.length === 2,
  JSON.stringify(devices.body.devices.map((d) => d.id)));

console.log('\n3. A second person on a shared phone does NOT inherit the first');
// The shared device is already signed in as alice and holds her records.
await call('/v1/auth/apple', shared, {
  identityToken: await mintToken(sub('alice')),
  nonce: RAW_NONCE,
});
const bob = await call('/v1/auth/apple', shared, {
  identityToken: await mintToken(sub('bob')),
  nonce: RAW_NONCE,
});
check('bob gets his own account', bob.body.accountId !== first.body.accountId,
  `${bob.body.accountId} vs ${first.body.accountId}`);
check('merge is REFUSED so alice\'s progress is not copied over',
  bob.body.merge === false, JSON.stringify(bob.body));

const bobData = await call('/v1/sync', shared, { since: 0, changes: [] });
check('bob\'s account is empty', bobData.body.changes.length === 0,
  JSON.stringify(bobData.body.changes.map((c) => c.id)));

console.log('\n4. An unverifiable token is refused');
const forged = await new SignJWT({ nonce: sha256(RAW_NONCE) })
  .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
  .setIssuedAt()
  .setIssuer(ISSUER)
  .setAudience('com.someone.else')
  .setSubject(sub('mallory'))
  .setExpirationTime('10m')
  .sign(privateKey);
const refused = await call('/v1/auth/apple', dev('mallory'), {
  identityToken: forged,
  nonce: RAW_NONCE,
});
check('a token for another app is rejected', refused.status === 400, `status=${refused.status}`);
check('and the reason is not disclosed',
  refused.body.error === 'that sign-in could not be verified', JSON.stringify(refused.body));

const replay = await call('/v1/auth/apple', dev('mallory2'), {
  identityToken: await mintToken(sub('alice')),
  nonce: 'a-completely-different-nonce',
});
check('a captured token with the wrong nonce is rejected', replay.status === 400,
  `status=${replay.status}`);

jwks.close();
console.log(failures === 0 ? '\nALL PASSED\n' : `\n${failures} FAILURE(S)\n`);
process.exit(failures === 0 ? 0 : 1);
