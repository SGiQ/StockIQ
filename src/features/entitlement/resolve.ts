/**
 * Pure entitlement resolution: (stored state + dev override + now) → what the
 * learner can do right now.
 *
 * One function, no I/O. The store feeds it the synced entitlement row and the
 * dev override; every gate consumes the flat `Entitlement` it returns and asks
 * for a capability, never for a plan. Expiry is evaluated here so a lapsed paid
 * period silently falls back to free until the server says otherwise — the
 * client never needs a timer or a write to "downgrade" itself.
 */
import type { EntitlementState, PlanId } from '@/store/repository';
import { PLAN_CAPABILITIES, type PlanCapabilities } from './constants';

export interface Entitlement extends PlanCapabilities {
  /** The effective plan after expiry is applied. */
  plan: PlanId;
  /** True for any effective paid tier (pro or elite). */
  active: boolean;
  status: EntitlementState['status'];
  /** Where it came from; `dev` when the local override is in effect. */
  source: EntitlementState['source'] | 'dev';
  currentPeriodEnd: number | null;
}

export function resolveEntitlement(
  state: EntitlementState | null,
  devOverride: PlanId | null,
  now: number,
): Entitlement {
  // The dev override wins, but only ever to a PAID tier — an override of `free`
  // (or null) means "no override", so it can never downgrade a real entitlement.
  // The store only sets this behind __DEV__, and it is never synced.
  if (devOverride && devOverride !== 'free') {
    return {
      plan: devOverride,
      active: true,
      status: 'active',
      source: 'dev',
      currentPeriodEnd: null,
      ...PLAN_CAPABILITIES[devOverride],
    };
  }

  const plan = state?.plan ?? 'free';
  // A paid entitlement whose period has passed lapses to free. Trials are
  // open-ended here (the server ends them explicitly), so they never expire.
  const expired =
    plan !== 'free' &&
    state?.status !== 'trialing' &&
    state?.currentPeriodEnd != null &&
    state.currentPeriodEnd < now;

  const effectivePlan: PlanId = expired ? 'free' : plan;

  return {
    plan: effectivePlan,
    active: effectivePlan !== 'free',
    status: expired ? 'expired' : (state?.status ?? 'none'),
    source: state?.source ?? 'none',
    currentPeriodEnd: state?.currentPeriodEnd ?? null,
    ...PLAN_CAPABILITIES[effectivePlan],
  };
}
