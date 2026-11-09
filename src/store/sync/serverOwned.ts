import type { LocalRecord } from '../sqlite/SqliteRepository';

/**
 * Collections only the server writes. The app reads them (they arrive through
 * `applyRemote`) but must never push them back: the sync service refuses a
 * client write to them, and before it learned to drop them it refused the
 * whole request.
 *
 * The usual way one ends up dirty is signing in. Joining an account marks
 * every local row for re-upload, and that includes an entitlement row the
 * server sent earlier — so the first sync after sign-in would be rejected and
 * every retry with it, leaving the device unsynced for good.
 */
export const SERVER_OWNED_COLLECTIONS: ReadonlySet<string> = new Set(['entitlement']);

/** The dirty rows the server will accept from this device. */
export function pushableChanges(dirty: LocalRecord[]): LocalRecord[] {
  return dirty.filter((r) => !SERVER_OWNED_COLLECTIONS.has(r.collection));
}
