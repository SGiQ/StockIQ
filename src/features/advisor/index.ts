/**
 * AI Advisor metering — how many free questions a day, and how many are left.
 *
 * Pure over the profile + the day + the learner's entitlement. Free learners
 * get a daily allowance; Pro/Elite are unlimited (the entitlement decides,
 * this module just does the arithmetic). The count lives on the profile as a
 * `{ askDay, askCount }` pair that resets when the day rolls over — the only
 * stored state; everything else is derived.
 */
import type { UserProfile } from '@/store/repository';

/** Free questions per day. Paid tiers are unlimited. Tunable. */
export const ASK_FREE_DAILY = 5;

/** Questions already asked on `today` (0 once the day has rolled over). */
export function asksUsedToday(profile: UserProfile | null, today: string): number {
  if (!profile || profile.askDay !== today) return 0;
  return profile.askCount;
}

/** Questions left today; Infinity when unlimited. */
export function asksRemaining(
  profile: UserProfile | null,
  today: string,
  unlimited: boolean,
): number {
  if (unlimited) return Infinity;
  return Math.max(0, ASK_FREE_DAILY - asksUsedToday(profile, today));
}

/** Whether another question is allowed right now. */
export function canAsk(profile: UserProfile | null, today: string, unlimited: boolean): boolean {
  return unlimited || asksUsedToday(profile, today) < ASK_FREE_DAILY;
}

/** One exchange in a conversation. */
export interface AskTurn {
  question: string;
  answer: string;
}

/** Most prior turns folded into a follow-up before it gets long/expensive. */
export const MAX_CONTEXT_TURNS = 6;

/**
 * Builds the text sent to the (single-question) ASK proxy for a follow-up.
 *
 * The proxy answers one question at a time, so multi-turn is carried in the
 * question itself: the recent conversation is folded in as context ahead of the
 * new question. The first question in a thread has no prior turns and is sent
 * verbatim. Only the last MAX_CONTEXT_TURNS are included so a long thread can't
 * balloon the prompt.
 */
export function buildContextualQuestion(priorTurns: AskTurn[], question: string): string {
  if (priorTurns.length === 0) return question;
  const recent = priorTurns.slice(-MAX_CONTEXT_TURNS);
  const history = recent.map((t) => `Q: ${t.question}\nA: ${t.answer}`).join('\n\n');
  return `Here is our conversation so far:\n\n${history}\n\nFollow-up question: ${question}`;
}
