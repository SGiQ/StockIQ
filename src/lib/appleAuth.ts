import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

/**
 * Sign in with Apple — the device half.
 *
 * Gives the account something a person can re-prove ownership of. Email
 * sign-in does the same job on every platform; this is the iOS-native option
 * and is strictly additive.
 *
 * ── Why the module is imported lazily ─────────────────────────────────────
 * `expo-apple-authentication` is a native module that Expo Go does not
 * bundle, and it is the ONLY dependency in this app that Expo Go cannot load.
 * Importing it at the top of this file would therefore break the app on
 * launch in Expo Go — taking down the lessons, sync, pairing and email
 * sign-in, none of which need it, over one button.
 *
 * Loading it inside the functions means Expo Go never touches it: the import
 * fails, `isAppleSignInAvailable()` returns false, the UI offers email
 * instead, and everything else runs. In a development build the same code
 * finds the module and the button appears — no code change, no separate
 * configuration.
 *
 * ── The nonce dance, and why it is not optional ───────────────────────────
 * We generate a random value, send Apple its SHA-256 HASH, and send our
 * server the RAW value. Apple embeds the hash in the signed token; the server
 * hashes the raw value it was given and checks the two match.
 *
 * That is what stops a captured token being replayed: a token is only
 * accepted alongside the raw nonce that produced it, and that raw value never
 * travels with the token. Sending the raw nonce to Apple instead would put
 * both halves in the same place and defeat the point — `hashNonce` on the
 * server exists so the convention is stated once and cannot drift.
 */

export interface AppleCredential {
  identityToken: string;
  /** The RAW nonce. The server hashes it to compare against the token. */
  nonce: string;
}

/** The module's shape, so the lazy import stays typed. */
type AppleModule = typeof import('expo-apple-authentication');

/**
 * Resolves the native module, or null where it does not exist.
 *
 * Null is the ordinary case in Expo Go and on Android/web — not an error, and
 * never surfaced as one.
 */
async function loadApple(): Promise<AppleModule | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    return await import('expo-apple-authentication');
  } catch {
    return null;
  }
}

/** Native only, iOS 13+, and absent in Expo Go. */
export async function isAppleSignInAvailable(): Promise<boolean> {
  const apple = await loadApple();
  if (!apple) return false;
  try {
    return await apple.isAvailableAsync();
  } catch {
    // The module can be present but the capability unavailable — an older iOS,
    // or a build without the entitlement. Same answer either way.
    return false;
  }
}

export class AppleSignInCancelled extends Error {}

export async function signInWithApple(): Promise<AppleCredential> {
  const apple = await loadApple();
  if (!apple) {
    // Reachable only if the button were shown without checking availability
    // first. Says what to do rather than surfacing a module-resolution error.
    throw new Error('Sign in with Apple needs a development build. Use email instead.');
  }

  const rawNonce = Array.from(Crypto.getRandomBytes(24), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');

  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
    // Hex, because the server compares against createHash(...).digest('hex').
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  let credential: Awaited<ReturnType<AppleModule['signInAsync']>>;
  try {
    credential = await apple.signInAsync({
      requestedScopes: [
        // Nothing is requested. Apple offers name and email, the server
        // discards them, and asking for data that is immediately thrown away
        // is both a worse consent prompt and a worse privacy posture.
      ],
      nonce: hashedNonce,
    });
  } catch (error) {
    // Tapping Cancel is not a failure and must not surface as an error.
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
      throw new AppleSignInCancelled('Sign-in cancelled');
    }
    throw error;
  }

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token.');
  }

  return { identityToken: credential.identityToken, nonce: rawNonce };
}
