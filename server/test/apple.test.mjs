/**
 * Apple identity-token verification, driven with a locally generated RSA key.
 *
 * A real Apple token cannot be obtained here — that needs a Developer
 * account, a real device, and a human tapping the button. But the part that
 * actually protects accounts is the VERIFICATION, and that can be exercised
 * completely by standing up a local JWKS and signing tokens against it.
 *
 * The rejection cases are the point. A verifier that accepts good tokens but
 * also accepts a token signed by the wrong key, minted for another app, or
 * replayed with a stale nonce is worse than no verifier at all, because it
 * looks like it works.
 *
 * Run: node test/apple.test.mjs
 */
import { createServer } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createHash } from 'node:crypto';

const BUNDLE_ID = 'com.stockiq.app';
const ISSUER = 'http://127.0.0.1:8799';

let failures = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? '  ✔' : '  ✖'} ${name}${cond ? '' : `  → ${detail}`}`);
  if (!cond) failures++;
};

const sha256 = (v) => createHash('sha256').update(v).digest('hex');

// --- a stand-in for Apple's JWKS endpoint -----------------------------------
const { publicKey, privateKey } = await generateKeyPair('RS256');
const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };

// A second, unrelated key: tokens signed with it must be rejected.
const other = await generateKeyPair('RS256');

const jwksServer = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ keys: [jwk] }));
});
await new Promise((r) => jwksServer.listen(8799, '127.0.0.1', r));

process.env.APPLE_ISSUER = ISSUER;
process.env.APPLE_JWKS_URL = `${ISSUER}/keys`;
process.env.APPLE_BUNDLE_ID = BUNDLE_ID;

// Imported AFTER the env is set — the module reads it at load time.
const { verifyAppleToken, hashNonce } = await import('../src/apple.ts');

const RAW_NONCE = 'a-random-value-at-least-16-chars';

function token({
  key = privateKey,
  sub = 'apple-user-000',
  aud = BUNDLE_ID,
  iss = ISSUER,
  nonce = sha256(RAW_NONCE),
  // Passing `nonce: undefined` would silently fall back to the default above
  // — destructuring defaults fire on undefined — so omission needs its own
  // flag. The first version of this test got that wrong and reported a bug in
  // the verifier that did not exist.
  omitNonce = false,
  expiresIn = '10m',
} = {}) {
  return new SignJWT(omitNonce ? {} : { nonce })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuedAt()
    .setIssuer(iss)
    .setAudience(aud)
    .setSubject(sub)
    .setExpirationTime(expiresIn)
    .sign(key);
}

const rejects = async (name, promise) => {
  try {
    await promise;
    check(name, false, 'it was ACCEPTED');
  } catch {
    check(name, true);
  }
};

console.log('\n1. The convention both sides depend on');
check('hashNonce is sha256 hex of the raw nonce', hashNonce(RAW_NONCE) === sha256(RAW_NONCE));

console.log('\n2. A well-formed token is accepted');
const good = await verifyAppleToken(await token(), RAW_NONCE);
check('returns the subject', good.sub === 'apple-user-000', JSON.stringify(good));
check('returns nothing else — no email, no name', Object.keys(good).join() === 'sub',
  JSON.stringify(Object.keys(good)));

console.log('\n3. Signature must verify');
await rejects('a token signed by an unrelated key is rejected',
  verifyAppleToken(await token({ key: other.privateKey }), RAW_NONCE));

console.log('\n4. Audience must be this app');
await rejects('a token minted for another app is rejected',
  verifyAppleToken(await token({ aud: 'com.someone.else' }), RAW_NONCE));

console.log('\n5. Issuer must be Apple');
await rejects('a token from another issuer is rejected',
  verifyAppleToken(await token({ iss: 'https://evil.example' }), RAW_NONCE));

console.log('\n6. Expired tokens are rejected');
await rejects('an expired token is rejected',
  verifyAppleToken(await token({ expiresIn: '-1m' }), RAW_NONCE));

console.log('\n7. Nonce binds the token to this sign-in');
await rejects('a token whose nonce does not match is rejected',
  verifyAppleToken(await token({ nonce: sha256('a-different-nonce-value') }), RAW_NONCE));
await rejects('a token with no nonce at all is rejected',
  verifyAppleToken(await token({ omitNonce: true }), RAW_NONCE));
await rejects('the RAW nonce in the token (unhashed) is rejected',
  verifyAppleToken(await token({ nonce: RAW_NONCE }), RAW_NONCE));

console.log('\n8. Malformed input');
await rejects('a garbage token string is rejected', verifyAppleToken('not.a.jwt', RAW_NONCE));
await rejects('a missing token is rejected', verifyAppleToken(undefined, RAW_NONCE));
await rejects('a too-short nonce is rejected', verifyAppleToken(await token(), 'short'));

console.log('\n9. Failures never explain themselves');
try {
  await verifyAppleToken(await token({ aud: 'com.someone.else' }), RAW_NONCE);
} catch (error) {
  check('the error names no specific cause', error.message === 'that sign-in could not be verified',
    error.message);
}

jwksServer.close();
console.log(failures === 0 ? '\nALL PASSED\n' : `\n${failures} FAILURE(S)\n`);
process.exit(failures === 0 ? 0 : 1);
