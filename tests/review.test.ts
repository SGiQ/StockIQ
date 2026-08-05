import assert from 'node:assert/strict';
import test from 'node:test';
import { listCourses, listLessonsInCourse } from '../src/content/registry';
import { advance, seed, intervalMs, MAX_BOX, BOX_INTERVALS_DAYS } from '../src/features/review/schedule';
import { buildReviewQueue, dueReviewCount } from '../src/features/review/queue';
import type { ReviewState } from '../src/store/repository';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_000_000_000_000;

/** Find a real interactive card to point review state at. */
function anInteractiveCard() {
  for (const course of listCourses()) {
    for (const lesson of listLessonsInCourse(course.id)) {
      const card = lesson.cards.find((c) => c.type === 'binary_choice' || c.type === 'fill_blank');
      if (card) return { courseId: course.id, lessonId: lesson.id, cardId: card.id };
    }
  }
  throw new Error('no interactive card in the content graph');
}

const review = (over: Partial<ReviewState>): ReviewState => ({
  id: 'x', updatedAt: 1, deletedAt: null,
  courseId: 'c', lessonId: 'l', cardId: 'c1',
  box: 0, dueAt: NOW, lastReviewedAt: NOW, lastCorrect: true,
  ...over,
});

test('seed: a clean answer starts one box up; a miss starts at the bottom', () => {
  assert.deepEqual(seed(true, NOW), { box: 1, dueAt: NOW + BOX_INTERVALS_DAYS[1] * DAY });
  assert.deepEqual(seed(false, NOW), { box: 0, dueAt: NOW + BOX_INTERVALS_DAYS[0] * DAY });
});

test('advance: correct promotes (capped), wrong resets to box 0', () => {
  assert.equal(advance(2, true, NOW).box, 3);
  assert.equal(advance(MAX_BOX, true, NOW).box, MAX_BOX); // capped
  assert.equal(advance(4, false, NOW).box, 0);
  assert.equal(advance(0, false, NOW).dueAt, NOW + BOX_INTERVALS_DAYS[0] * DAY);
});

test('intervals grow with the box', () => {
  for (let b = 1; b <= MAX_BOX; b += 1) {
    assert.ok(intervalMs(b) > intervalMs(b - 1), `box ${b} should be longer than ${b - 1}`);
  }
});

test('queue: only due cards, most overdue first, resolved to real cards', () => {
  const real = anInteractiveCard();
  const reviews: ReviewState[] = [
    review({ id: 'due-old', ...real, dueAt: NOW - 5 * DAY }),
    review({ id: 'due-new', ...real, courseId: real.courseId, dueAt: NOW - 1 * DAY }),
    review({ id: 'not-due', ...real, dueAt: NOW + 5 * DAY }),
    // Points at a card that does not exist — must be dropped, not crash.
    review({ id: 'ghost', courseId: real.courseId, lessonId: real.lessonId, cardId: 'c99999', dueAt: NOW - DAY }),
  ];
  const queue = buildReviewQueue(reviews, NOW);
  // The two due, resolvable entries only, oldest-due first.
  assert.equal(queue.length, 2);
  assert.equal(queue[0].review.id, 'due-old');
  assert.equal(queue[1].review.id, 'due-new');
  assert.equal(dueReviewCount(reviews, NOW), 2);
});

test('queue respects the limit', () => {
  const real = anInteractiveCard();
  const reviews = Array.from({ length: 30 }, (_, i) =>
    review({ id: `r${i}`, ...real, dueAt: NOW - (i + 1) * DAY }),
  );
  assert.equal(buildReviewQueue(reviews, NOW, 20).length, 20);
});
