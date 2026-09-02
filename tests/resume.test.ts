import assert from 'node:assert/strict';
import test from 'node:test';
import { latestInProgress } from '../src/features/resume';
import { clampResumeIndex, seedResumeStates, canAdvance } from '../src/components/player/cardState';
import type { LessonProgress } from '../src/store/repository';
import type { Card } from '../src/content/types';

function row(over: Partial<LessonProgress>): LessonProgress {
  return {
    id: `${over.courseId ?? 'c'}/${over.lessonId ?? 'l'}`,
    courseId: 'c',
    lessonId: 'l',
    status: 'in_progress',
    lastCardIndex: 0,
    starred: false,
    xpAwarded: 0,
    completedAt: null,
    attempts: [],
    updatedAt: 1,
    deletedAt: null,
    ...over,
  };
}

/* ── which lesson to resume ──────────────────────────────────────── */

test('latestInProgress: null when nothing is open', () => {
  assert.equal(latestInProgress({}), null);
  assert.equal(
    latestInProgress({ a: row({ lessonId: 'a', status: 'completed' }) }),
    null,
  );
});

test('latestInProgress: the most recently touched open lesson wins', () => {
  const progress = {
    old: row({ lessonId: 'old', lastCardIndex: 9, updatedAt: 100 }),
    newer: row({ lessonId: 'newer', lastCardIndex: 3, updatedAt: 200 }),
    done: row({ lessonId: 'done', status: 'completed', updatedAt: 999 }),
    gone: row({ lessonId: 'gone', updatedAt: 5000, deletedAt: 5001 }),
  };
  const target = latestInProgress(progress);
  assert.deepEqual(target, { courseId: 'c', lessonId: 'newer', lastCardIndex: 3, updatedAt: 200 });
});

/* ── where in the deck ───────────────────────────────────────────── */

test('clampResumeIndex: stays on the deck', () => {
  assert.equal(clampResumeIndex(4, 10), 4);
  assert.equal(clampResumeIndex(0, 10), 0);
  assert.equal(clampResumeIndex(undefined, 10), 0);
  assert.equal(clampResumeIndex(-2, 10), 0);
  assert.equal(clampResumeIndex(99, 10), 9); // a row from a longer, older deck
  assert.equal(clampResumeIndex(3, 0), 0); // empty deck never indexes
});

/* ── re-answered cards ───────────────────────────────────────────── */

const cards = [
  { id: 'c1', type: 'concept', headline: 'h', body: 'b' },
  {
    id: 'q1',
    type: 'binary_choice',
    prompt: 'p',
    options: [
      { id: 'yes', label: 'Yes', correct: true },
      { id: 'no', label: 'No', correct: false },
    ],
    explanation: 'e',
  },
  { id: 'b1', type: 'fill_blank', body: 'The [[1]]', wordBank: ['a', 'b', 'c'], answer: 'b' },
  {
    id: 'q2',
    type: 'binary_choice',
    prompt: 'p',
    options: [
      { id: 'up', label: 'Up', correct: false },
      { id: 'down', label: 'Down', correct: true },
    ],
    explanation: 'e',
  },
] as unknown as Card[];

test('seedResumeStates: answered cards before the resume point come back checked', () => {
  const attempts = [
    { cardId: 'q1', correct: true },
    { cardId: 'b1', correct: false },
    { cardId: 'q2', correct: true },
  ];
  const seeded = seedResumeStates(cards, attempts, 3);

  assert.equal(seeded.c1, undefined, 'passive cards carry no state');
  assert.deepEqual(seeded.q1, { kind: 'choice', selected: 'yes', checked: true, correct: true });
  assert.deepEqual(seeded.b1, {
    kind: 'blank',
    choicesOpen: true,
    picked: undefined,
    checked: true,
    correct: false,
  });
  assert.equal(seeded.q2, undefined, 'the card being resumed on is answered fresh');

  // The whole point: the gate lets the learner move forward again.
  assert.ok(canAdvance(cards[1], seeded.q1));
  assert.ok(canAdvance(cards[2], seeded.b1));
  assert.ok(!canAdvance(cards[3], seeded.q2));
});

test('seedResumeStates: a wrong binary pick is reconstructed as the other option', () => {
  const seeded = seedResumeStates(cards, [{ cardId: 'q1', correct: false }], 4);
  assert.deepEqual(seeded.q1, { kind: 'choice', selected: 'no', checked: true, correct: false });
});

test('seedResumeStates: a fresh start seeds nothing', () => {
  assert.deepEqual(seedResumeStates(cards, [{ cardId: 'q1', correct: true }], 0), {});
});
