import { SqliteRepository } from './sqlite/SqliteRepository';
import type { SyncableLocalRepository } from './sync/SyncingRepository';

/**
 * The local store on native. See createLocal.web.ts for the web half.
 *
 * This exists as its own module purely so the two implementations are never
 * both reachable from one import graph. `index.ts` used to pick between them
 * with `Platform.OS === 'web'`, which is correct at runtime and useless to a
 * bundler: Metro still followed the `expo-sqlite` import, and `expo-sqlite`
 * pulls in a `.wasm` worker that has no web resolution. The result was a dev
 * server that worked and a production web build that could not be produced at
 * all — so the app could never be hosted.
 *
 * Metro resolves `.web.ts` ahead of `.ts` for the web platform, so splitting
 * the choice into a filename keeps SQLite out of the web bundle entirely.
 */
export const createLocal = (): SyncableLocalRepository => new SqliteRepository();
