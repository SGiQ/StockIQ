/**
 * Hearts economy — the free-tier friction lever.
 *
 * Kept in their own dependency-free module so both the persistence layer
 * (which seeds a new learner at full) and the pure regen logic can share these
 * numbers without importing each other. Retuning the monetisation pressure is
 * a one-line change here; nothing else in the app hard-codes these values.
 */

/** Hearts a free learner holds when full. */
export const MAX_HEARTS = 5;

/** Wall-clock time to regenerate one heart, in milliseconds (~4 hours). */
export const HEART_REGEN_MS = 4 * 60 * 60 * 1000;
