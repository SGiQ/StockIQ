/**
 * Weekly leagues — the competitive loop.
 *
 * Your weekly XP is real (summed from lessons completed since Monday). The
 * cohort you're ranked against is, for now, a deterministic simulated group so
 * the experience ships before the server grows real weekly cohorts (Phase 5b
 * swaps `buildStandings` for a `/v1/leagues` call — the tiers, ranking, and
 * promote/relegate rules here stay). Pure and dependency-light.
 */
import type { LessonProgress } from '@/store/repository';

/**
 * Leagues only feel alive with a real cohort, so the entry point stays hidden
 * until there are ~15–20 active users. Everything else — the screen, the service,
 * the server `/v1/leagues` endpoint — is built and ready; flip this to true then.
 */
export const LEAGUES_ENABLED = false;

/** Bronze is the entry tier; you climb toward Diamond by promoting weekly. */
export const LEAGUE_TIERS = [
  'Bronze',
  'Silver',
  'Gold',
  'Sapphire',
  'Ruby',
  'Emerald',
  'Diamond',
] as const;
export type LeagueTier = (typeof LEAGUE_TIERS)[number];

export const COHORT_SIZE = 15;
/** Top finishers move up; bottom finishers move down. */
export const PROMOTE_TOP = 5;
export const RELEGATE_BOTTOM = 3;

export type Outcome = 'promote' | 'relegate' | 'hold';

export function outcomeForRank(rank: number, cohortSize: number): Outcome {
  if (rank <= PROMOTE_TOP) return 'promote';
  if (rank > cohortSize - RELEGATE_BOTTOM) return 'relegate';
  return 'hold';
}

export function nextTier(tier: LeagueTier): LeagueTier {
  const i = LEAGUE_TIERS.indexOf(tier);
  return LEAGUE_TIERS[Math.min(i + 1, LEAGUE_TIERS.length - 1)]!;
}
export function prevTier(tier: LeagueTier): LeagueTier {
  const i = LEAGUE_TIERS.indexOf(tier);
  return LEAGUE_TIERS[Math.max(i - 1, 0)]!;
}

/** Local-midnight Monday that starts the week containing `now`. */
export function weekStartMs(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const daysSinceMonday = (d.getDay() + 6) % 7; // getDay: 0=Sun..6=Sat
  d.setDate(d.getDate() - daysSinceMonday);
  return d.getTime();
}

/** Whole days left in the week containing `now` (0 on Sunday). */
export function daysLeftInWeek(now: number): number {
  const end = weekStartMs(now) + 7 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)) - 1);
}

/** XP earned from lessons completed since Monday — the league's score. */
export function currentWeekXp(progress: Record<string, LessonProgress>, now: number): number {
  const start = weekStartMs(now);
  return Object.values(progress).reduce(
    (sum, p) =>
      p.status === 'completed' && (p.completedAt ?? 0) >= start ? sum + (p.xpAwarded ?? 0) : sum,
    0,
  );
}

export interface Standing {
  name: string;
  xp: number;
  isYou: boolean;
  rank: number;
  outcome: Outcome;
}

const BOT_NAMES = [
  'Ava', 'Liam', 'Noah', 'Mia', 'Zoe', 'Kai', 'Ivy', 'Leo',
  'Nia', 'Eli', 'Ada', 'Rex', 'Uma', 'Jax', 'Wren',
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * This week's standings: a deterministic cohort (stable within the week, fresh
 * next week) with the learner slotted in by their real weekly XP, ranked and
 * tagged with each row's promote/relegate/hold outcome.
 */
export function buildStandings(youXp: number, now: number): { entries: Standing[]; yourRank: number } {
  const seed = String(weekStartMs(now));
  const bots = BOT_NAMES.slice(0, COHORT_SIZE - 1).map((name) => ({
    name,
    xp: hash(name + seed) % 620,
    isYou: false,
  }));
  const all = [...bots, { name: 'You', xp: youXp, isYou: true }];
  // Highest XP first; ties broken by name so the order is stable and testable.
  all.sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
  const entries: Standing[] = all.map((e, i) => ({
    ...e,
    rank: i + 1,
    outcome: outcomeForRank(i + 1, all.length),
  }));
  return { entries, yourRank: entries.find((e) => e.isYou)!.rank };
}
