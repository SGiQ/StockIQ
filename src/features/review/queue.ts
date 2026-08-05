/**
 * Turns stored review state into the actual queue of cards to show.
 *
 * A review is due when its `dueAt` has passed. Each due entry is resolved back
 * to its live card in the content graph, so an edited or removed card degrades
 * gracefully (it just drops out of the queue) rather than crashing the runner.
 */
import { findCard } from '@/content/registry';
import { isInteractive } from '@/components/player/cardState';
import type { Card } from '@/content/types';
import type { ReviewState } from '@/store/repository';

export interface DueReview {
  review: ReviewState;
  card: Card;
}

/** Due reviews, most overdue first, resolved to their current card. */
export function buildReviewQueue(reviews: ReviewState[], now: number, limit = 20): DueReview[] {
  return reviews
    .filter((r) => r.deletedAt === null && r.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt)
    .map((review): DueReview | null => {
      const card = findCard(review.courseId, review.lessonId, review.cardId);
      return card && isInteractive(card) ? { review, card } : null;
    })
    .filter((entry): entry is DueReview => entry !== null)
    .slice(0, limit);
}

/** How many cards are due right now (resolvable, interactive). */
export function dueReviewCount(reviews: ReviewState[], now: number): number {
  return buildReviewQueue(reviews, now, Number.MAX_SAFE_INTEGER).length;
}
