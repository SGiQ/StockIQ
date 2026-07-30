import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * The anonymous device identity.
 *
 * Lives in `lib/` rather than `store/sync/` because it is not storage: both
 * the sync service and the ASK proxy identify a caller by this value. That
 * placement is also what keeps the repository-boundary grep meaningful — a
 * storage module imported from `services/ask` would be a genuine leak, while
 * a shared identity helper is not.
 *
 * There are no accounts. On first launch the device mints a random 256-bit
 * value, keeps it in the keychain, and that value is the entire identity the
 * backend knows. No email, no password, no personal data — which is the right
 * shape while this is a personal app, and it means there is no credential for
 * anyone to mishandle.
 *
 * ── Two properties this file exists to guarantee ──────────────────────────
 *
 * 1. The value comes from a CSPRNG. It is a bearer capability: whoever holds
 *    it can read and write that owner's rows on the server. `Math.random()`
 *    is seeded predictably and would make ids guessable, so it is never used
 *    here.
 *
 * 2. It is minted at most once. Regenerating an owner id does not "reset" the
 *    user — it silently orphans everything they have ever synced, with no
 *    error and no way back, because the old rows are only reachable through
 *    the old id. Hence the memoised in-flight promise below: two callers
 *    racing at startup must not each mint one and have the second overwrite
 *    the first.
 */

const DEVICE_KEY = 'stockiq:device-id:v1';

/** Web has no keychain; see the note in `read`. */
const WEB_KEY = DEVICE_KEY;

/**
 * In-flight or resolved id. Without this, `SyncingRepository` calling
 * `getDeviceId()` from several methods concurrently on a cold start would
 * interleave read-miss → generate → write and lose one of the two ids.
 */
let cached: Promise<string> | null = null;

async function read(): Promise<string | null> {
  if (Platform.OS === 'web') {
    // SecureStore has no web implementation. Web is a verification surface,
    // not a shipping target, so localStorage keeps sync testable in a browser
    // — but it is readable by any script on the origin and is NOT a keychain.
    // Nothing sensitive may ever be stored this way.
    try {
      return globalThis.localStorage?.getItem(WEB_KEY) ?? null;
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(DEVICE_KEY);
  } catch {
    return null;
  }
}

async function write(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(WEB_KEY, value);
    } catch {
      /* private browsing — sync simply will not persist across reloads */
    }
    return;
  }
  await SecureStore.setItemAsync(DEVICE_KEY, value, {
    // Sync identity should not travel to a restored backup on another
    // device: two devices sharing one id would fight over the same rows.
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

function mint(): string {
  // 32 bytes → 64 hex chars, comfortably inside the server's 16..128 length
  // bound and far beyond guessing.
  const bytes = Crypto.getRandomBytes(32);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getDeviceId(): Promise<string> {
  cached ??= (async () => {
    const existing = await read();
    if (existing) return existing;
    const created = mint();
    await write(created);
    return created;
  })().catch((error) => {
    // Do not leave a rejected promise cached, or every later call fails too.
    cached = null;
    throw error;
  });
  return cached;
}

/**
 * Forgets the identity. Only for the settings reset affordance, and the
 * caller must understand this abandons any server-side data rather than
 * deleting it — the rows stay until a retention job removes them.
 */
export async function clearDeviceId(): Promise<void> {
  cached = null;
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.removeItem(WEB_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.deleteItemAsync(DEVICE_KEY);
}
