import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COHORT_SIZE,
  PROMOTE_TOP,
  RELEGATE_BOTTOM,
  buildStandings,
  currentWeekXp,
  nextTier,
  prevTier,
  outcomeForRank,
  weekStartMs,
} from '../src/features/leagues';
import type { LessonProgress } from '../src/store/repository';

const NOON = new Date('2026-08-12T12:00:00').getTime(); // a Wednesday
const progress = (over: Partial<LessonProgress>): LessonProgress =>
  ({ id: 'c/l', status: 'completed', completedAt: NOON, xpAwarded: 20, ...over } as LessonProgress);

test('outcomeForRank: top promote, bottom relegate, middle holds', () => {
  assert.equal(outcomeForRank(1, COHORT_SIZE), 'promote');
  assert.equal(outcomeForRank(PROMOTE_TOP, COHORT_SIZE), 'promote');
  assert.equal(outcomeForRank(PROMOTE_TOP + 1, COHORT_SIZE), 'hold');
  assert.equal(outcomeForRank(COHORT_SIZE - RELEGATE_BOTTOM, COHORT_SIZE), 'hold');
  assert.equal(outcomeForRank(COHORT_SIZE - RELEGATE_BOTTOM + 1, COHORT_SIZE), 'relegate');
  assert.equal(outcomeForRank(COHORT_SIZE, COHORT_SIZE), 'relegate');
});

test('tier navigation clamps at the ends', () => {
  assert.equal(nextTier('Bronze'), 'Silver');
  assert.equal(nextTier('Diamond'), 'Diamond');
  assert.equal(prevTier('Bronze'), 'Bronze');
  assert.equal(prevTier('Silver'), 'Bronze');
});

test('weekStartMs: lands on Monday local-midnight', () => {
  const start = new Date(weekStartMs(NOON));
  assert.equal(start.getDay(), 1, 'Monday');
  assert.equal(start.getHours(), 0);
  // a time later the same week resolves to the same Monday
  assert.equal(weekStartMs(NOON + 2 * 86_400_000), weekStartMs(NOON));
});

test('currentWeekXp: sums only lessons completed this week', () => {
  const map = {
    a: progress({ id: 'a', completedAt: NOON, xpAwarded: 20 }), // this week
    b: progress({ id: 'b', completedAt: NOON, xpAwarded: 30 }), // this week
    c: progress({ id: 'c', completedAt: NOON - 8 * 86_400_000, xpAwarded: 50 }), // last week
    d: progress({ id: 'd', status: 'in_progress', completedAt: NOON, xpAwarded: 40 }), // not completed
  } as Record<string, LessonProgress>;
  assert.equal(currentWeekXp(map, NOON), 50); // 20 + 30
  assert.equal(currentWeekXp({}, NOON), 0);
});

test('buildStandings: full cohort, you placed by XP, ranks and outcomes tagged', () => {
  const { entries, yourRank } = buildStandings(9999, NOON); // huge XP -> rank 1
  assert.equal(entries.length, COHORT_SIZE);
  assert.equal(entries[0]!.isYou, true);
  assert.equal(yourRank, 1);
  assert.equal(entries[0]!.outcome, 'promote');
  // ranks are 1..N and strictly increasing
  entries.forEach((e, i) => assert.equal(e.rank, i + 1));
  // deterministic within the week
  assert.deepEqual(buildStandings(9999, NOON), buildStandings(9999, NOON + 3_600_000));
});

test('buildStandings: zero weekly XP lands you near the bottom', () => {
  const { yourRank } = buildStandings(0, NOON);
  assert.ok(yourRank > COHORT_SIZE - RELEGATE_BOTTOM - 3, 'a lazy week ranks low');
});
