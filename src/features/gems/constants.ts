/**
 * The gem economy — every earn rate and price in one place.
 *
 * Dependency-free so the store, the player, and any screen can read these
 * without pulling each other in. Balancing the economy is editing this file;
 * nothing else hard-codes a number. Scaled to StockIQ's small XP economy
 * (~20 XP a lesson), not copied from Duolingo's larger one.
 */

/** Earned for finishing a lesson the first time. */
export const GEMS_PER_LESSON = 10;
/** Bonus on top for a perfect (starred) run. */
export const GEMS_PERFECT_BONUS = 5;
/** Earned for finishing a spaced-review session. */
export const GEMS_PER_REVIEW = 5;
/** Paid out for completing a daily quest. */
export const GEMS_DAILY_QUEST = 10;

/** Cost to refill hearts to full with gems. */
export const HEART_REFILL_COST = 40;
/** Cost of one streak freeze. */
export const STREAK_FREEZE_COST = 100;

/** Gems awarded for finishing a lesson, perfect or not. */
export function lessonGemReward(perfect: boolean): number {
  return GEMS_PER_LESSON + (perfect ? GEMS_PERFECT_BONUS : 0);
}
