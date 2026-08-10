import assert from 'node:assert/strict';
import test from 'node:test';
import { ASK_FREE_DAILY, asksUsedToday, asksRemaining, canAsk } from '../src/features/advisor';
import type { UserProfile } from '../src/store/repository';

const TODAY = '2026-08-10';
const profile = (over: Partial<UserProfile>): UserProfile => ({ askDay: null, askCount: 0, ...over } as UserProfile);

test('asksUsedToday: 0 when no profile, no ask day, or a stale day', () => {
  assert.equal(asksUsedToday(null, TODAY), 0);
  assert.equal(asksUsedToday(profile({ askDay: null, askCount: 3 }), TODAY), 0);
  assert.equal(asksUsedToday(profile({ askDay: '2026-08-09', askCount: 3 }), TODAY), 0); // rolled over
  assert.equal(asksUsedToday(profile({ askDay: TODAY, askCount: 3 }), TODAY), 3);
});

test('asksRemaining: counts down for free, Infinity for unlimited', () => {
  assert.equal(asksRemaining(profile({ askDay: TODAY, askCount: 2 }), TODAY, false), ASK_FREE_DAILY - 2);
  assert.equal(asksRemaining(profile({ askDay: TODAY, askCount: ASK_FREE_DAILY }), TODAY, false), 0);
  assert.equal(asksRemaining(profile({ askDay: TODAY, askCount: 99 }), TODAY, false), 0); // never negative
  assert.equal(asksRemaining(profile({ askDay: TODAY, askCount: ASK_FREE_DAILY }), TODAY, true), Infinity);
});

test('canAsk: blocked at the cap for free, always allowed when unlimited', () => {
  assert.equal(canAsk(profile({ askDay: TODAY, askCount: ASK_FREE_DAILY - 1 }), TODAY, false), true);
  assert.equal(canAsk(profile({ askDay: TODAY, askCount: ASK_FREE_DAILY }), TODAY, false), false);
  assert.equal(canAsk(profile({ askDay: TODAY, askCount: ASK_FREE_DAILY }), TODAY, true), true);
  // a new day frees it up again
  assert.equal(canAsk(profile({ askDay: '2026-08-09', askCount: ASK_FREE_DAILY }), TODAY, false), true);
});
