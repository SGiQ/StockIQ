import { createContext, useContext } from 'react';

/**
 * Lets a chart reveal itself in lock-step with the card's narration instead of
 * a fixed timer. The player publishes the *current* card's clip position here;
 * only the active chart reads it.
 *
 * - `sync` is 0→1 while a clip is playing, and `-1` when nothing is narrating
 *   (paused, finished, or narration off).
 * - `enabled` is the learner's narration preference, so a chart can wait for a
 *   clip that is about to start rather than pre-building.
 */
export interface NarrationSync {
  enabled: boolean;
  sync: number;
}

export const NarrationSyncContext = createContext<NarrationSync>({
  enabled: false,
  sync: -1,
});

export const useNarrationSync = (): NarrationSync => useContext(NarrationSyncContext);
