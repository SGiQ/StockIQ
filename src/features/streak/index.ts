/**
 * Streak milestones and the freeze cap.
 *
 * Milestones are the days worth a celebration; `crossedMilestone` reports when
 * a completion has just pushed the streak past one, so the lesson-end screen
 * can mark the moment. Pure and dependency-free.
 */

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365] as const;

/** Most freezes a learner can bank at once. */
export const MAX_FREEZES = 2;

/**
 * The freeze count after banking one more, or null when already at the cap.
 * Keeps the "you can hold at most MAX_FREEZES" rule in one tested place.
 */
export function grantFreeze(current: number): number | null {
  return current >= MAX_FREEZES ? null : current + 1;
}

/**
 * The milestone a streak has just crossed going from `prev` to `next`, or null.
 * Returns the highest crossed, so a freeze-bridged jump still celebrates once.
 */
export function crossedMilestone(prev: number, next: number): number | null {
  let hit: number | null = null;
  for (const m of STREAK_MILESTONES) {
    if (next >= m && prev < m) hit = m;
  }
  return hit;
}
