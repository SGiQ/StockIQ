/**
 * Reports an error the app deliberately swallows.
 *
 * Many catches here are intentional — offline sync, a share sheet the learner
 * dismissed, a best-effort history write. The learner should not see them,
 * but we should: this sends them to Sentry with a short `context` tag and
 * otherwise does nothing.
 *
 * Sentry is loaded lazily and guarded so this module stays safe anywhere the
 * SDK is absent or inert — plain Node tests, the web bundle, or a build with
 * no DSN (where `captureException` is already a no-op).
 */
type SentryLike = {
  captureException: (error: unknown, hint?: { tags?: Record<string, string> }) => unknown;
};

let sentry: SentryLike | null | undefined;

function loadSentry(): SentryLike | null {
  if (sentry !== undefined) return sentry;
  try {
    // A static specifier so Metro bundles it; the try is for runtimes where
    // react-native itself cannot load (node:test).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@sentry/react-native') as Partial<SentryLike>;
    sentry = typeof mod?.captureException === 'function' ? (mod as SentryLike) : null;
  } catch {
    sentry = null;
  }
  return sentry;
}

export function reportSilent(error: unknown, context?: string): void {
  try {
    loadSentry()?.captureException(error, context ? { tags: { context } } : undefined);
  } catch {
    // Reporting must never itself become a failure.
  }
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[silent${context ? `:${context}` : ''}]`, (error as Error)?.message ?? error);
  }
}
