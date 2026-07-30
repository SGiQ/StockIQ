import { useEffect } from 'react';
import { useAppStore } from './slices/useAppStore';

/**
 * Reads persisted state once at launch, behind the splash screen.
 *
 * Doing it here rather than lazily in each screen means no screen ever has
 * to render a loading state for progress or XP — by the time anything
 * mounts, the store is populated.
 */
export function useHydrateStores(): boolean {
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrate = useAppStore((s) => s.hydrate);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  return hydrated;
}
