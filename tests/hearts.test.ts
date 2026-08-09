import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatCountdown,
  refill,
  settle,
  snapshot,
  spendOne,
  HEART_REGEN_MS,
  MAX_HEARTS,
} from '../src/features/hearts';
import type { HeartsValue } from '../src/store/repository';

const NOW = 1_000_000_000_000;
const full: HeartsValue = { hearts: MAX_HEARTS, since: NOW };

test('settle: a full heart bank ignores elapsed time and re-anchors', () => {
  const s = settle(full, NOW + 10 * HEART_REGEN_MS);
  assert.equal(s.hearts, MAX_HEARTS);
  assert.equal(s.since, NOW + 10 * HEART_REGEN_MS);
});

test('settle: regenerates whole intervals only, keeping the remainder', () => {
  const drained: HeartsValue = { hearts: 2, since: NOW };
  // 1.5 intervals elapsed → exactly one heart back, half an interval carried.
  const at = NOW + HEART_REGEN_MS + HEART_REGEN_MS / 2;
  const s = settle(drained, at);
  assert.equal(s.hearts, 3);
  assert.equal(s.since, NOW + HEART_REGEN_MS);
  // The carried half-interval means the next heart is half an interval away.
  assert.equal(snapshot(drained, at).nextInMs, HEART_REGEN_MS / 2);
});

test('settle: never exceeds the cap and re-anchors on reaching full', () => {
  const s = settle({ hearts: 1, since: NOW }, NOW + 99 * HEART_REGEN_MS);
  assert.equal(s.hearts, MAX_HEARTS);
  assert.equal(s.since, NOW + 99 * HEART_REGEN_MS);
});

test('snapshot: full bank reports no countdown', () => {
  assert.deepEqual(snapshot(full, NOW), { count: MAX_HEARTS, nextInMs: 0, full: true, empty: false });
});

test('spendOne: from full starts the regen clock at now', () => {
  const { value, spent } = spendOne(full, NOW);
  assert.equal(spent, true);
  assert.deepEqual(value, { hearts: MAX_HEARTS - 1, since: NOW });
});

test('spendOne: while regenerating does not reset the running clock', () => {
  const regenning: HeartsValue = { hearts: 3, since: NOW };
  // A tenth of an interval later — no heart earned back yet.
  const at = NOW + HEART_REGEN_MS / 10;
  const { value } = spendOne(regenning, at);
  assert.equal(value.hearts, 2);
  assert.equal(value.since, NOW); // clock preserved, not reset to `at`
});

test('spendOne: settles regeneration before deducting', () => {
  const drained: HeartsValue = { hearts: 0, since: NOW };
  // Two intervals later: two hearts regenerated, then one spent → one left.
  const { value, spent } = spendOne(drained, NOW + 2 * HEART_REGEN_MS);
  assert.equal(spent, true);
  assert.equal(value.hearts, 1);
});

test('spendOne: refuses when genuinely empty', () => {
  const { value, spent } = spendOne({ hearts: 0, since: NOW }, NOW + HEART_REGEN_MS / 2);
  assert.equal(spent, false);
  assert.equal(value.hearts, 0);
  assert.equal(snapshot({ hearts: 0, since: NOW }, NOW).empty, true);
});

test('spendOne: a corrupt over-cap count is clamped, not trusted', () => {
  const { value } = spendOne({ hearts: 999, since: NOW }, NOW);
  assert.equal(value.hearts, MAX_HEARTS - 1);
});

test('refill: tops back up to the cap', () => {
  assert.deepEqual(refill(NOW), { hearts: MAX_HEARTS, since: NOW });
});

test('full drain then recovery round-trips through the cap', () => {
  let v: HeartsValue = full;
  for (let i = 0; i < MAX_HEARTS; i += 1) v = spendOne(v, NOW).value;
  assert.equal(snapshot(v, NOW).empty, true);
  // MAX intervals later the bank is full again.
  assert.equal(snapshot(v, NOW + MAX_HEARTS * HEART_REGEN_MS).count, MAX_HEARTS);
});

test('formatCountdown: renders hours, minutes, seconds, and the zero case', () => {
  assert.equal(formatCountdown(0), 'now');
  assert.equal(formatCountdown(-5), 'now');
  assert.equal(formatCountdown(3 * 3600_000 + 12 * 60_000), '3h 12m');
  assert.equal(formatCountdown(12 * 60_000 + 5_000), '12m 05s');
  assert.equal(formatCountdown(42_000), '42s');
});
