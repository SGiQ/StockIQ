import assert from 'node:assert/strict';
import test from 'node:test';
import { listCourses, listLessonsInCourse } from '../src/content/registry';
import {
  BADGES,
  buildAssessment,
  computeAchievementStats,
  computeReadiness,
  evaluateNewBadges,
} from '../src/features/achievements';
import type { LessonProgress, ReviewState, StreakState, UserProfile } from '../src/store/repository';

const NOW = 1_800_000_000_000;
const review = (over: Partial<ReviewState>): ReviewState => ({
  id: 'c/l#x', updatedAt: 1, deletedAt: null,
  courseId: 'c', lessonId: 'l', cardId: 'x',
  box: 1, dueAt: NOW + 1_000_000, lastReviewedAt: NOW, lastCorrect: true,
  ...over,
});

/** A completed-lesson progress record for the first lesson of the first course. */
function firstLessonState() {
  const course = listCourses()[0]!;
  const lesson = listLessonsInCourse(course.id)[0]!;
  const id = `${course.id}/${lesson.id}`;
  const record: LessonProgress = {
    id,
    updatedAt: 1,
    deletedAt: null,
    courseId: course.id,
    lessonId: lesson.id,
    status: 'completed',
    lastCardIndex: lesson.cards.length - 1,
    starred: true,
    xpAwarded: lesson.xp,
    completedAt: 2,
    // Two correct interactive answers.
    attempts: [
      { cardId: 'q1', correct: true, at: 1 },
      { cardId: 'q2', correct: true, at: 1 },
    ],
  };
  return { course, lesson, progress: { [id]: record } };
}

const streak = (n: number): StreakState => ({
  id: 'streak',
  updatedAt: 1,
  deletedAt: null,
  currentStreak: n,
  longestStreak: n,
  lastActiveDay: '2026-08-04',
  activeDays: [],
  freezes: 0,
});

const EMPTY_STATE = {
  progress: {} as Record<string, LessonProgress>,
  streak: null,
  saved: [],
  unlockedStrategies: [],
  profile: null as UserProfile | null,
};

test('a fresh learner has a zero readiness score and no badges', () => {
  const stats = computeAchievementStats(EMPTY_STATE);
  assert.equal(stats.lessonsCompleted, 0);
  assert.ok(stats.totalLessons > 0);
  assert.equal(computeReadiness(stats).score, 0);
  assert.equal(computeReadiness(stats).tier.label, 'Just starting');
  assert.deepEqual(evaluateNewBadges(stats, new Set()), []);
});

test('completing the first lesson earns exactly First steps (and a perfect run)', () => {
  const { progress } = firstLessonState();
  const stats = computeAchievementStats({ ...EMPTY_STATE, progress });

  assert.equal(stats.lessonsCompleted, 1);
  assert.equal(stats.perfectLessons, 1);
  assert.equal(stats.quizCorrect, 2);
  assert.equal(stats.quizTotal, 2);
  assert.equal(stats.quizAccuracy, 1);

  const earned = evaluateNewBadges(stats, new Set()).map((b) => b.id);
  assert.ok(earned.includes('first-lesson'), 'first-lesson should be earned');
  assert.ok(earned.includes('perfect-lesson'), 'perfect-lesson should be earned');
  // Not a full course yet, so no course-complete or curriculum badge.
  assert.ok(!earned.some((id) => id.startsWith('course:')), 'no course badge on one lesson');
  assert.ok(!earned.includes('curriculum'));
});

test('total XP is derived from progress, not a clobbered profile counter', () => {
  const { lesson, progress } = firstLessonState();

  // The progress row carries the XP; the stored profile counter is stale at 0,
  // which is what a sign-in can do to the singleton profile row under
  // last-write-wins while the per-lesson rows survive. The stat must follow the
  // progress, not the counter — else the header, portfolio, and the 500-XP
  // badge all read 0 despite completed lessons.
  const clobberedProfile = { totalXp: 0 } as unknown as UserProfile;
  const stats = computeAchievementStats({ ...EMPTY_STATE, progress, profile: clobberedProfile });

  assert.equal(stats.totalXp, lesson.xp);
  assert.ok(stats.totalXp > 0, 'derived XP should be non-zero for a completed lesson');
});

test('already-earned badges are not re-emitted', () => {
  const { progress } = firstLessonState();
  const stats = computeAchievementStats({ ...EMPTY_STATE, progress });
  const earnedOnce = new Set(evaluateNewBadges(stats, new Set()).map((b) => b.id));
  // Feeding the same stats back with those ids already earned yields nothing new.
  assert.deepEqual(evaluateNewBadges(stats, earnedOnce), []);
});

test('a 7-day streak earns the streak badge and lifts the consistency component', () => {
  const stats = computeAchievementStats({ ...EMPTY_STATE, streak: streak(7) });
  assert.ok(evaluateNewBadges(stats, new Set()).some((b) => b.id === 'streak-7'));
  const consistency = computeReadiness(stats).components.find((c) => c.key === 'consistency');
  assert.equal(consistency?.value, 1);
});

test('assessment best score feeds the readiness assessment component and its badge', () => {
  const profile = { assessmentBestScore: 0.9, assessmentAttempts: 1 } as UserProfile;
  const stats = computeAchievementStats({ ...EMPTY_STATE, profile });
  assert.equal(stats.assessmentBestScore, 0.9);
  assert.ok(stats.assessmentTaken);
  const component = computeReadiness(stats).components.find((c) => c.key === 'assessment');
  assert.equal(component?.value, 0.9);
  assert.ok(evaluateNewBadges(stats, new Set()).some((b) => b.id === 'assessment-pass'));
});

test('readiness component weights sum to 1', () => {
  const stats = computeAchievementStats(EMPTY_STATE);
  const total = computeReadiness(stats).components.reduce((s, c) => s + c.weight, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
});

test('badge ids are unique', () => {
  const ids = BADGES.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('the assessment is drawn from real binary-choice questions', () => {
  const questions = buildAssessment(8);
  assert.ok(questions.length > 0 && questions.length <= 8);
  for (const q of questions) {
    assert.equal(q.options.length, 2);
    assert.equal(q.options.filter((o) => o.correct).length, 1, 'exactly one correct option');
    assert.ok(q.prompt.length > 0);
  }
});

/* ── Maintained Readiness: the retention component ─────────────────── */

test('retention is 0 when nothing is scheduled — a fresh learner earns no credit', () => {
  const stats = computeAchievementStats({ ...EMPTY_STATE, reviews: [], now: NOW });
  assert.equal(stats.retention, 0);
  assert.equal(stats.totalReviews, 0);
});

test('retention is 1 when caught up (cards scheduled, none due)', () => {
  const reviews = [review({ id: 'a', dueAt: NOW + 1 }), review({ id: 'b', dueAt: NOW + 999 })];
  const stats = computeAchievementStats({ ...EMPTY_STATE, reviews, now: NOW });
  assert.equal(stats.totalReviews, 2);
  assert.equal(stats.dueReviews, 0);
  assert.equal(stats.retention, 1);
});

test('retention decays with the overdue backlog and ignores soft-deleted rows', () => {
  const reviews = [
    review({ id: 'a', dueAt: NOW - 1 }), // due
    review({ id: 'b', dueAt: NOW - 1 }), // due
    review({ id: 'c', dueAt: NOW + 999 }), // not due
    review({ id: 'd', dueAt: NOW + 999 }), // not due
    review({ id: 'e', dueAt: NOW - 1, deletedAt: NOW }), // deleted → ignored
  ];
  const stats = computeAchievementStats({ ...EMPTY_STATE, reviews, now: NOW });
  assert.equal(stats.totalReviews, 4);
  assert.equal(stats.dueReviews, 2);
  assert.equal(stats.retention, 0.5);
});

test('the readiness score is lower when reviews go overdue (it is maintained)', () => {
  const base = { ...EMPTY_STATE, streak: streak(7) };
  const caughtUp = computeReadiness(
    computeAchievementStats({ ...base, reviews: [review({ id: 'a', dueAt: NOW + 1 })], now: NOW }),
  ).score;
  const overdue = computeReadiness(
    computeAchievementStats({ ...base, reviews: [review({ id: 'a', dueAt: NOW - 1 })], now: NOW }),
  ).score;
  assert.ok(caughtUp > overdue, `caught-up (${caughtUp}) should beat overdue (${overdue})`);
  // The 0.10 retention weight is the whole difference: 10 points on a full swing.
  assert.equal(caughtUp - overdue, 10);
});
