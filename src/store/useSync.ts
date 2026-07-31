import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { repository } from '.';

/**
 * Drives the sync cycle.
 *
 * Everything under `src/store/sync/` was built, tested and deployed without
 * anything ever calling it — the repository exposed `sync.push()` and no
 * screen invoked it, so records accumulated locally and were never sent. This
 * hook is the missing trigger.
 *
 * ── When it runs ──────────────────────────────────────────────────────────
 * Once on launch, and again whenever the app returns to the foreground. That
 * covers the cases that matter — finishing a lesson then switching away, or
 * picking up a second device — without a timer waking the radio on a phone
 * that is sitting idle.
 *
 * It deliberately does NOT sync after every write. A lesson can produce a
 * dozen record updates in a minute, and pushing each one would spend battery
 * to save nothing: `updatedAt` already resolves ordering, so a later batch
 * carries the same result as many small ones.
 */

/** Ignore a foreground event within this window of the last sync. */
const MIN_INTERVAL_MS = 30_000;

export function useSync(): { syncNow: () => void } {
  const lastRun = useRef(0);
  const running = useRef(false);

  const run = useCallback((force = false) => {
    const now = Date.now();
    if (running.current) return;
    if (!force && now - lastRun.current < MIN_INTERVAL_MS) return;

    running.current = true;
    lastRun.current = now;

    void repository.sync
      .push()
      .catch((error: unknown) => {
        // Offline is the normal steady state on a phone, and a failed sync
        // costs nothing: records stay dirty and go out next time. Surfacing
        // it would train people to ignore a warning that is usually wrong.
        if (__DEV__) console.log('[sync]', (error as Error)?.message ?? error);
      })
      .finally(() => {
        running.current = false;
      });
  }, []);

  useEffect(() => {
    run(true);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => subscription.remove();
  }, [run]);

  return { syncNow: () => run(true) };
}
