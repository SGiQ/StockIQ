import { createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { ProtocolError } from './protocol.ts';

/**
 * Sign in with Apple — identity token verification.
 *
 * This is the security boundary of the whole feature. The identity token is
 * the ONLY evidence that the caller is who they claim, so every check below
 * is load-bearing and none of them are optional:
 *
 * - **Signature** against Apple's published keys. Without it the token is
 *   just JSON the caller wrote, and anyone could claim any account by
 *   inventing a `sub`.
 * - **Issuer**, so a validly-signed token from somewhere else cannot be
 *   replayed here.
 * - **Audience** must be OUR bundle id. Apple signs tokens for every app;
 *   skipping this accepts a token minted for an unrelated app whose developer
 *   can then impersonate any of our users.
 * - **Expiry**, enforced by `jwtVerify`. Apple's tokens are short-lived
 *   precisely so a captured one stops working.
 * - **Nonce**, which ties the token to a sign-in this device just started and
 *   is what stops a previously captured token being replayed.
 *
 * `createRemoteJWKSet` handles fetching, caching and key rotation. Apple
 * rotates signing keys without notice, so a hardcoded key would fail silently
 * one day and lock everyone out.
 */

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

/**
 * The issuer and key source are overridable ONLY behind an explicit flag.
 *
 * Tests need to point these at a local key pair — real Apple tokens cannot be
 * obtained in a test, and the rejection cases are the ones that matter. But an
 * override is also a complete bypass of this file's entire purpose: anyone who
 * can set `APPLE_JWKS_URL` can serve their own signing key and mint a token
 * for any account.
 *
 * Requiring `ALLOW_APPLE_TEST_ISSUER=1` means that cannot happen by accident —
 * a stray variable copied from a test script into a deployment is ignored, and
 * says so in the log, rather than silently disabling authentication.
 */
const ALLOW_TEST_ISSUER = process.env.ALLOW_APPLE_TEST_ISSUER === '1';

function overridden(name: string, fallback: string): string {
  const value = process.env[name];
  if (!value || value === fallback) return fallback;

  if (!ALLOW_TEST_ISSUER) {
    console.error(
      `✖  ${name} is set but ALLOW_APPLE_TEST_ISSUER is not — IGNORING it and using Apple.\n` +
        `   Overriding it in production would let anyone forge a sign-in.`,
    );
    return fallback;
  }

  console.warn(`⚠  ${name} overridden to ${value} — Apple sign-in is NOT verifying against Apple.`);
  return value;
}

const ISSUER = overridden('APPLE_ISSUER', APPLE_ISSUER);
const JWKS_URL = overridden('APPLE_JWKS_URL', APPLE_JWKS_URL);

/**
 * The iOS bundle identifier. Apple sets `aud` to this, so it must match
 * exactly — and it must be configured, not defaulted, because a wrong-but-
 * plausible default would silently accept tokens for the wrong app.
 */
const AUDIENCE = process.env.APPLE_BUNDLE_ID ?? '';

const jwks = createRemoteJWKSet(new URL(JWKS_URL));

/**
 * The client sends the RAW nonce; Apple embedded its SHA-256 hash in the
 * token. Both sides must agree on this convention exactly, so it lives in one
 * function rather than being spelled out twice.
 */
export function hashNonce(rawNonce: string): string {
  return createHash('sha256').update(rawNonce).digest('hex');
}

export interface AppleIdentity {
  /** Stable, per-app, opaque user id. The only thing worth storing. */
  sub: string;
}

export async function verifyAppleToken(
  identityToken: unknown,
  rawNonce: unknown,
): Promise<AppleIdentity> {
  if (!AUDIENCE) {
    // Fail closed. Verifying without an audience would accept tokens minted
    // for any other app, which is worse than being unavailable.
    throw new ProtocolError('Apple sign-in is not configured on this server');
  }
  if (typeof identityToken !== 'string' || !identityToken) {
    throw new ProtocolError('identityToken is required');
  }
  if (typeof rawNonce !== 'string' || rawNonce.length < 16) {
    throw new ProtocolError('nonce is required');
  }

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(identityToken, jwks, {
      issuer: ISSUER,
      audience: AUDIENCE,
    }));
  } catch {
    // The specific reason — bad signature, expired, wrong audience — is not
    // reported back. It would tell an attacker which part of a forged token
    // to fix next.
    throw new ProtocolError('that sign-in could not be verified');
  }

  const nonce = payload.nonce;
  if (typeof nonce !== 'string' || nonce !== hashNonce(rawNonce)) {
    throw new ProtocolError('that sign-in could not be verified');
  }

  const sub = payload.sub;
  if (typeof sub !== 'string' || !sub) {
    throw new ProtocolError('that sign-in could not be verified');
  }

  // `email` and `name` are deliberately ignored even when Apple sends them
  // (first authorisation only). Storing them would turn an account that holds
  // nothing but lesson progress into one holding personal data, which changes
  // the obligations around it. The `sub` alone is enough to recognise a
  // returning user.
  return { sub };
}
