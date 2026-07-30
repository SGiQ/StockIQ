/**
 * Sync failure kinds, kept in their own module deliberately.
 *
 * `SyncingRepository` needs `SyncError` at runtime to tell a transient
 * network blip from a payload the server refused. Importing it from
 * `SyncClient` would drag in `ownerId`, and through it `expo-secure-store`
 * and `expo-crypto` — which makes the orchestration logic impossible to
 * exercise outside a device. Splitting the error type out keeps
 * `SyncingRepository` free of platform dependencies and therefore testable
 * in plain Node against the real service.
 */
export type SyncErrorKind =
  /** Network unreachable or timed out. Expected on a phone; retry later. */
  | 'offline'
  /** Server refused the payload (400). Retrying identical data cannot help. */
  | 'rejected'
  /** Server-side failure (5xx). Retry is reasonable. */
  | 'server'
  /** No sync URL configured — the app is running local-only. */
  | 'unconfigured';

export class SyncError extends Error {
  constructor(
    message: string,
    readonly kind: SyncErrorKind,
  ) {
    super(message);
    this.name = 'SyncError';
  }
}
