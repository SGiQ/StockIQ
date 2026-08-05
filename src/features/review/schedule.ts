/**
 * The spacing rule for review.
 *
 * A Leitner ladder: each correct answer promotes a card to a longer interval;
 * a miss drops it back to the bottom so it comes round again soon. Deliberately
 * simple — the value is in *resurfacing* what's fading, not in a perfectly tuned
 * forgetting curve.
 */
const DAY = 24 * 60 * 60 * 1000;

/** Box index → days until the card is due again. Box 0 = "come back tomorrow". */
export const BOX_INTERVALS_DAYS = [1, 3, 7, 16, 35, 90] as const;
export const MAX_BOX = BOX_INTERVALS_DAYS.length - 1;

export function intervalMs(box: number): number {
  const b = Math.max(0, Math.min(MAX_BOX, box));
  return BOX_INTERVALS_DAYS[b] * DAY;
}

/**
 * The next box and due date after answering a review.
 * Correct → up one box (longer interval); wrong → back to box 0 (see it soon).
 */
export function advance(box: number, correct: boolean, now: number): { box: number; dueAt: number } {
  const nextBox = correct ? Math.min(MAX_BOX, box + 1) : 0;
  return { box: nextBox, dueAt: now + intervalMs(nextBox) };
}

/**
 * The state a card enters review with, seeded from how it went in the lesson.
 * A clean first answer starts one box up; a miss starts at the bottom.
 */
export function seed(correct: boolean, now: number): { box: number; dueAt: number } {
  return advance(0, correct, now);
}
