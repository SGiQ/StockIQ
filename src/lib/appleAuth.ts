import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

/**
 * Sign in with Apple — the device half.
 *
 * Exists to give the account something a person can re-prove ownership of.
 * Without it, device secrets live only in keychains, so losing every linked
 * device made the data permanently unreachable.
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

/** Native only, and iOS 13+. Android and web have no Apple sign-in at all. */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    // Expo Go does not include the native module, so the call throws rather
    // than returning false. Treated as unavailable so the UI can explain it.
    return false;
  }
}

export class AppleSignInCancelled extends Error {}

export async function signInWithApple(): Promise<AppleCredential> {
  const rawNonce = Array.from(Crypto.getRandomBytes(24), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');

  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
    // Hex, because the server compares against createHash(...).digest('hex').
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
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
