/**
 * Repository composition root.
 *
 * The one place an implementation is chosen. Adding cloud sync later is
 * literally this line:
 *
 *     export const repository: Repository = new SyncingRepository(
 *       new LocalRepository(),
 *       new SupabaseRepository(),
 *     );
 *
 * Nothing else in the app changes, because nothing else imports a storage
 * library.
 */
import { SYNC_URL, isSyncConfigured } from '@/config';
import { createLocal } from './createLocal';
import { SyncClient, type LinkedDevice } from './sync/SyncClient';
import { SyncingRepository } from './sync/SyncingRepository';
import type { Repository } from './repository';

/**
 * SQLite on device, AsyncStorage on web.
 *
 * SQLite is the real store: indexed `updated_at` is exactly what a sync pass
 * will filter on, which a bag of JSON blobs could never support. expo-sqlite
 * needs extra bundler setup on web, and web is not a shipping target, so the
 * AsyncStorage implementation stays as the web fallback rather than blocking
 * browser-based verification.
 *
 * Both satisfy the same interface, so this line is the entire swap — no
 * screen, component, or store slice knows which one is running. That was the
 * point of the boundary, and this migration is what proved it.
 */
/**
 * Multi-device pairing, exposed as an optional capability.
 *
 * The settings screen needs these, but it must not import `SyncingRepository`
 * or a transport to get them — that would put a sync module in the UI layer
 * and break the boundary every other phase has kept. Instead the store hands
 * out this narrow interface, and `null` when sync is not configured, which is
 * also exactly the signal the screen needs to explain why pairing is
 * unavailable.
 */
export interface PairingApi {
  startLink(): Promise<{ code: string; expiresAt: number }>;
  joinAccount(code: string): Promise<void>;
  signInWithApple(identityToken: string, nonce: string): Promise<void>;
  requestEmailCode(email: string): Promise<void>;
  signInWithEmail(email: string, code: string): Promise<void>;
  getSession(): Promise<{ email: string | null }>;
  listDevices(): Promise<{ devices: LinkedDevice[]; thisDeviceId: string }>;
  revokeDevice(deviceId: string): Promise<void>;
}

let pairingApi: PairingApi | null = null;

function build(): Repository {
  /**
   * SQLite on device, AsyncStorage on web — resolved by FILENAME rather than
   * by a `Platform.OS` branch (see createLocal.ts). A runtime branch still
   * leaves both implementations in the import graph, and `expo-sqlite` cannot
   * be bundled for web at all, so the web build simply could not be produced.
   *
   * Both implement the same sync surface, so everything below applies to
   * either: the sync cycle, pairing and sign-in behave identically.
   */
  const local = createLocal();

  // Undeployed is a first-class state, not a broken one. With no sync URL the
  // app is exactly what it was before Phase 6: local-only, fully functional,
  // no network calls. Wrapping only when configured means a failed or absent
  // deployment can never degrade the offline experience.
  if (!isSyncConfigured()) return local;

  const syncing = new SyncingRepository(local, new SyncClient(SYNC_URL));
  pairingApi = syncing;
  return syncing;
}

/**
 * Phase 6 added cloud sync by composing, not by rewriting: `SyncingRepository`
 * wraps the local store and delegates every read and write to it. The app
 * still imports `repository` and still knows nothing about where data lives —
 * which is the promise the interface made in Phase 1 and the second time it
 * has been cashed in.
 */
export const repository: Repository = build();

/** Null when sync is not configured — the app is local-only and cannot pair. */
export const pairing: PairingApi | null = pairingApi;

export type {
  CardAttempt,
  LessonProgress,
  LessonStatus,
  LikedItem,
  Repository,
  CardReport,
  ReportReason,
  SavedCard,
  StreakState,
  SyncStatus,
  UserProfile,
} from './repository';
export { progressId, reportId, savedCardId, REPORT_REASONS } from './repository';
export { withProfileDefaults } from './repository';
