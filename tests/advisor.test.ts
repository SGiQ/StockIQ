import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ASK_FREE_DAILY,
  asksUsedToday,
  asksRemaining,
  canAsk,
  buildContextualQuestion,
  MAX_CONTEXT_TURNS,
  type AskTurn,
} from '../src/features/advisor';
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

/* ── multi-turn context ────────────────────────────────────────────── */

test('buildContextualQuestion: first question is sent verbatim', () => {
  assert.equal(buildContextualQuestion([], 'What is a stock?'), 'What is a stock?');
});

test('buildContextualQuestion: a follow-up folds in the prior turns', () => {
  const prior: AskTurn[] = [{ question: 'What is a P/E?', answer: 'Price over earnings.' }];
  const out = buildContextualQuestion(prior, 'Is a low one always good?');
  assert.match(out, /conversation so far/i);
  assert.match(out, /Q: What is a P\/E\?/);
  assert.match(out, /A: Price over earnings\./);
  assert.match(out, /Follow-up question: Is a low one always good\?$/);
});

test('buildContextualQuestion: only the last MAX_CONTEXT_TURNS are included', () => {
  const prior: AskTurn[] = Array.from({ length: MAX_CONTEXT_TURNS + 3 }, (_, i) => ({
    question: `Q${i}`,
    answer: `A${i}`,
  }));
  const out = buildContextualQuestion(prior, 'next');
  assert.ok(!out.includes('Q0'), 'oldest turn is dropped');
  assert.ok(out.includes(`Q${MAX_CONTEXT_TURNS + 2}`), 'newest turn is kept');
  assert.equal((out.match(/Q: /g) ?? []).length, MAX_CONTEXT_TURNS);
});
