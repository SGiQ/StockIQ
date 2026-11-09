import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ASK_FREE_DAILY,
  asksUsedToday,
  asksRemaining,
  canAsk,
  buildContextualQuestion,
  moveExplanationPrompt,
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

/* ── explain-the-move ──────────────────────────────────────────────── */

test('moveExplanationPrompt: direction, magnitude, and the no-advice clause', () => {
  const up = moveExplanationPrompt('AAPL', 4.36);
  assert.match(up, /AAPL is up 4\.36% today/);
  assert.match(up, /Do not recommend buying, selling, or holding/);

  const down = moveExplanationPrompt('MSFT', -2.5);
  assert.match(down, /MSFT is down 2\.50% today/);

  assert.match(moveExplanationPrompt('NVDA', 0), /roughly flat today/);
});

/* ── how one ASK request ends ─────────────────────────────────────── */

import { settleAsk } from '../src/features/advisor/outcome';
import { AskError } from '../src/services/ask/types';

test('settleAsk: an abort is silence, whether the service threw or returned partial text', () => {
  // Pressing New / Stop mid-stream used to surface "Something went wrong."
  assert.deepEqual(settleAsk({ ok: false, error: new Error('AbortError') }, true, 'fallback'), { status: 'aborted' });
  assert.deepEqual(settleAsk({ ok: true, answer: 'partial answ' }, true, 'fallback'), { status: 'aborted' });
});

test('settleAsk: a non-empty answer is recorded; an empty one is not', () => {
  assert.deepEqual(settleAsk({ ok: true, answer: 'Bonds are loans.' }, false, 'fallback'), {
    status: 'answered',
    answer: 'Bonds are loans.',
  });
  assert.deepEqual(settleAsk({ ok: true, answer: '   ' }, false, 'fallback'), { status: 'aborted' });
});

test('settleAsk: failures keep an AskError and wrap anything else with the screen copy', () => {
  const known = new AskError('rate_limited', 'Slow down.');
  const kept = settleAsk({ ok: false, error: known }, false, 'fallback');
  assert.equal(kept.status, 'failed');
  if (kept.status === 'failed') assert.equal(kept.error, known);

  const wrapped = settleAsk({ ok: false, error: new TypeError('network') }, false, 'Could not coach right now.');
  assert.equal(wrapped.status, 'failed');
  if (wrapped.status === 'failed') {
    assert.equal(wrapped.error.reason, 'unknown');
    assert.equal(wrapped.error.message, 'Could not coach right now.');
  }
});
