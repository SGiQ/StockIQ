/**
 * What each plan unlocks — the single capability matrix every gate reads.
 *
 * Dependency-free (only a type import) so both the resolver and any screen can
 * import it without pulling in the store. Adding a perk is one row here; the
 * gates ask for the capability by name, never for the plan, so a capability can
 * later move between tiers without touching call sites.
 */
import type { PlanId } from '@/store/repository';

export interface PlanCapabilities {
  /** No hearts gate — practise without limit. */
  unlimitedHearts: boolean;
  /** No interstitial ads between lessons. */
  adFree: boolean;
  /** No daily cap on the ASK tutor. */
  unlimitedAsk: boolean;
  /** The full Knowledge Base (traders, strategies, books), not previews. */
  fullKnowledgeBase: boolean;
  /** Elite-only AI features (coaching path, real-ticker explainers, …). */
  aiElite: boolean;
}

export const PLAN_CAPABILITIES: Record<PlanId, PlanCapabilities> = {
  free: {
    unlimitedHearts: false,
    adFree: false,
    unlimitedAsk: false,
    fullKnowledgeBase: false,
    aiElite: false,
  },
  pro: {
    unlimitedHearts: true,
    adFree: true,
    unlimitedAsk: true,
    fullKnowledgeBase: true,
    aiElite: false,
  },
  elite: {
    unlimitedHearts: true,
    adFree: true,
    unlimitedAsk: true,
    fullKnowledgeBase: true,
    aiElite: true,
  },
};

export const PLAN_LABEL: Record<PlanId, string> = {
  free: 'Free',
  pro: 'StockIQ Pro',
  elite: 'StockIQ Elite',
};

/** Free → Pro → Elite → Free, for the dev plan cycler. */
export const PLAN_CYCLE: PlanId[] = ['free', 'pro', 'elite'];
