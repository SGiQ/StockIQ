import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveEntitlement } from '../src/features/entitlement';
import type { EntitlementState } from '../src/store/repository';

const NOW = 1_000_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

const state = (over: Partial<EntitlementState>): EntitlementState => ({
  id: 'entitlement',
  updatedAt: NOW,
  deletedAt: null,
  plan: 'free',
  status: 'none',
  currentPeriodEnd: null,
  source: 'none',
  ...over,
});

test('null state resolves to free with no capabilities', () => {
  const e = resolveEntitlement(null, null, NOW);
  assert.equal(e.plan, 'free');
  assert.equal(e.active, false);
  assert.equal(e.unlimitedHearts, false);
  assert.equal(e.adFree, false);
  assert.equal(e.unlimitedAsk, false);
  assert.equal(e.fullKnowledgeBase, false);
  assert.equal(e.aiElite, false);
});

test('active pro unlocks pro capabilities but not elite AI', () => {
  const e = resolveEntitlement(
    state({ plan: 'pro', status: 'active', source: 'stripe', currentPeriodEnd: NOW + 30 * DAY }),
    null,
    NOW,
  );
  assert.equal(e.plan, 'pro');
  assert.equal(e.active, true);
  assert.equal(e.unlimitedHearts, true);
  assert.equal(e.adFree, true);
  assert.equal(e.aiElite, false);
});

test('active elite unlocks everything including elite AI', () => {
  const e = resolveEntitlement(
    state({ plan: 'elite', status: 'active', source: 'stripe', currentPeriodEnd: NOW + 30 * DAY }),
    null,
    NOW,
  );
  assert.equal(e.plan, 'elite');
  assert.equal(e.aiElite, true);
  assert.equal(e.unlimitedHearts, true);
});

test('a lapsed paid period falls back to free', () => {
  const e = resolveEntitlement(
    state({ plan: 'pro', status: 'active', source: 'stripe', currentPeriodEnd: NOW - DAY }),
    null,
    NOW,
  );
  assert.equal(e.plan, 'free');
  assert.equal(e.active, false);
  assert.equal(e.status, 'expired');
  assert.equal(e.unlimitedHearts, false);
});

test('a trial without an end never expires client-side', () => {
  const e = resolveEntitlement(
    state({ plan: 'pro', status: 'trialing', source: 'trial', currentPeriodEnd: null }),
    null,
    NOW,
  );
  assert.equal(e.plan, 'pro');
  assert.equal(e.active, true);
  assert.equal(e.status, 'trialing');
});

test('dev override to a paid tier wins over a free state', () => {
  const e = resolveEntitlement(null, 'elite', NOW);
  assert.equal(e.plan, 'elite');
  assert.equal(e.source, 'dev');
  assert.equal(e.aiElite, true);
});

test("dev override of 'free' (or null) is treated as no override", () => {
  const paid = state({ plan: 'pro', status: 'active', currentPeriodEnd: NOW + DAY });
  assert.equal(resolveEntitlement(paid, 'free', NOW).plan, 'pro'); // never downgrades a real one
  assert.equal(resolveEntitlement(null, 'free', NOW).plan, 'free');
});

test('dev override rescues an otherwise-expired entitlement (for testing)', () => {
  const expired = state({ plan: 'pro', status: 'active', currentPeriodEnd: NOW - DAY });
  const e = resolveEntitlement(expired, 'pro', NOW);
  assert.equal(e.plan, 'pro');
  assert.equal(e.source, 'dev');
});
