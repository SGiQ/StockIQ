import assert from 'node:assert/strict';
import test from 'node:test';
import {
  lessonGemReward,
  deductGems,
  HEART_REFILL_COST,
  STREAK_FREEZE_COST,
} from '../src/features/gems';
import { crossedMilestone, grantFreeze, MAX_FREEZES, STREAK_MILESTONES } from '../src/features/streak';
import { applyStreakDay, type StreakState, type LessonProgress } from '../src/store/repository';
import {
  dailyStats,
  dailyXpGoal,
  questsForDay,
  questProgress,
  questDone,
  questClaimKey,
} from '../src/features/daily';

/* ── gems ─────────────────────────────────────────────────────────── */

test('deductGems: spends when affordable, refuses when short', () => {
  assert.equal(deductGems(100, 40), 60);
  assert.equal(deductGems(40, 40), 0); // exact balance is affordable
  assert.equal(deductGems(39, 40), null); // one gem short
  assert.equal(deductGems(0, 1), null);
  assert.equal(deductGems(10, 0), 10); // a free action never fails
});

test('gem prices and rewards stay coherent', () => {
  assert.ok(HEART_REFILL_COST > 0 && STREAK_FREEZE_COST > 0, 'prices are positive');
  assert.ok(lessonGemReward(true) > lessonGemReward(false), 'a perfect run pays more');
  // A streak freeze is the scarcer, pricier perk than a heart refill.
  assert.ok(STREAK_FREEZE_COST > HEART_REFILL_COST, 'a freeze costs more than a refill');
});

test('grantFreeze: banks up to the cap, then refuses', () => {
  assert.equal(grantFreeze(0), 1);
  assert.equal(grantFreeze(MAX_FREEZES - 1), MAX_FREEZES);
  assert.equal(grantFreeze(MAX_FREEZES), null); // already at the cap
  assert.equal(grantFreeze(MAX_FREEZES + 1), null); // never exceeds it
});

test('lessonGemReward: perfect adds the bonus', () => {
  assert.equal(lessonGemReward(false), 10);
  assert.equal(lessonGemReward(true), 15);
});

/* ── streak freeze bridging ───────────────────────────────────────── */

const streak = (over: Partial<StreakState>): StreakState => ({
  id: 'streak', updatedAt: 1, deletedAt: null,
  currentStreak: 5, longestStreak: 5, lastActiveDay: '2026-08-10', activeDays: [], freezes: 0,
  ...over,
});

test('applyStreakDay: a consecutive day extends the streak', () => {
  const r = applyStreakDay(streak({ lastActiveDay: '2026-08-10' }), '2026-08-11');
  assert.deepEqual(r, { currentStreak: 6, freezes: 0 });
});

test('applyStreakDay: a one-day gap with a freeze bridges and spends it', () => {
  const r = applyStreakDay(streak({ lastActiveDay: '2026-08-10', freezes: 1 }), '2026-08-12');
  assert.deepEqual(r, { currentStreak: 6, freezes: 0 });
});

test('applyStreakDay: a gap with no freeze resets to 1', () => {
  const r = applyStreakDay(streak({ lastActiveDay: '2026-08-10', freezes: 0 }), '2026-08-12');
  assert.deepEqual(r, { currentStreak: 1, freezes: 0 });
});

test('applyStreakDay: a two-day gap needs two freezes', () => {
  assert.equal(applyStreakDay(streak({ lastActiveDay: '2026-08-10', freezes: 1 }), '2026-08-13').currentStreak, 1);
  assert.equal(applyStreakDay(streak({ lastActiveDay: '2026-08-10', freezes: 2 }), '2026-08-13').currentStreak, 6);
});

test('applyStreakDay: first-ever day and clock-skew are handled', () => {
  assert.deepEqual(applyStreakDay(streak({ lastActiveDay: null, currentStreak: 0 }), '2026-08-11'), { currentStreak: 1, freezes: 0 });
  // today before lastActiveDay → leave the count alone
  assert.equal(applyStreakDay(streak({ lastActiveDay: '2026-08-10' }), '2026-08-09').currentStreak, 5);
});

/* ── milestones ───────────────────────────────────────────────────── */

test('crossedMilestone: fires only on the crossing day', () => {
  assert.equal(crossedMilestone(6, 7), 7);
  assert.equal(crossedMilestone(7, 8), null);
  assert.equal(crossedMilestone(0, 0), null);
  // a freeze-bridged jump past several still celebrates the highest reached
  assert.equal(crossedMilestone(2, 8), 7);
  assert.ok(STREAK_MILESTONES.includes(7));
});

/* ── daily loop ───────────────────────────────────────────────────── */

const DAY = '2026-08-11';
const OTHER = '2026-08-10';
const at = (day: string) => new Date(`${day}T12:00:00`).getTime();

const progressRow = (over: Partial<LessonProgress>): LessonProgress => ({
  id: 'c/l', updatedAt: 1, deletedAt: null,
  courseId: 'c', lessonId: 'l', status: 'completed', lastCardIndex: 0,
  starred: false, xpAwarded: 20, completedAt: at(DAY), attempts: [],
  ...over,
});

test('dailyStats: counts only lessons completed on the given day', () => {
  const progress = {
    a: progressRow({ id: 'a', xpAwarded: 20, starred: true }),
    b: progressRow({ id: 'b', xpAwarded: 15 }),
    c: progressRow({ id: 'c', xpAwarded: 99, completedAt: at(OTHER) }), // other day, excluded
    d: progressRow({ id: 'd', status: 'in_progress', completedAt: null }), // not completed
  };
  assert.deepEqual(dailyStats(progress, DAY), { xp: 35, lessons: 2, perfect: 1 });
});

test('dailyXpGoal: maps pace minutes to an XP target with a floor', () => {
  assert.equal(dailyXpGoal(5), 20);
  assert.equal(dailyXpGoal(15), 60);
  assert.equal(dailyXpGoal(null), 20);
  assert.equal(dailyXpGoal(1), 10); // floor
});

test('questsForDay: deterministic, three distinct quests', () => {
  const q1 = questsForDay(DAY);
  const q2 = questsForDay(DAY);
  assert.equal(q1.length, 3);
  assert.deepEqual(q1.map((q) => q.id), q2.map((q) => q.id));
  assert.equal(new Set(q1.map((q) => q.id)).size, 3);
});

test('quest progress and completion clamp to the target', () => {
  const stats = { xp: 25, lessons: 1, perfect: 0 };
  const xpQuest = { id: 'xp-20', title: '', target: 20, metric: 'xp' as const };
  assert.equal(questProgress(xpQuest, stats), 20); // clamped
  assert.equal(questDone(xpQuest, stats), true);
  const perfectQuest = { id: 'perfect-1', title: '', target: 1, metric: 'perfect' as const };
  assert.equal(questDone(perfectQuest, stats), false);
});

test('questClaimKey: scoped by day and id', () => {
  assert.equal(questClaimKey(DAY, 'xp-20'), '2026-08-11#xp-20');
});
