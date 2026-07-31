import { LocalRepository } from './local/LocalRepository';
import type { SyncableLocalRepository } from './sync/SyncingRepository';

/**
 * The local store on web: AsyncStorage rather than SQLite.
 *
 * `expo-sqlite`'s web build needs a `.wasm` worker that Metro cannot resolve,
 * so importing it at all breaks `expo export --platform web`. Keeping the two
 * implementations in separate platform-resolved files means the web bundle
 * never references it.
 *
 * Both satisfy the same sync surface, so everything above this line — the
 * sync cycle, pairing, sign-in — behaves identically on either.
 */
export const createLocal = (): SyncableLocalRepository => new LocalRepository();
