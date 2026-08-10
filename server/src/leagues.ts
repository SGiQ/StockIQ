/**
 * Weekly leagues, server side.
 *
 * The learner's weekly XP is summed live from their synced `progress` records,
 * never stored — so the leaderboard can't drift from the real data. Cohorts are
 * persisted in `league_memberships`; tiers move by promote/relegate, computed
 * lazily from last week's final standings the first time an account is seen in
 * a new week (no cron needed).
 *
 * Accounts have no name here, deliberately — competitors get a stable,
 * anonymous handle derived from the account id, so nothing personal leaks into
 * a shared leaderboard.
 */

/** Minimal shape of a pg client/pool — lets the tests pass a mock. */
export interface Db {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

export const TIERS = ['Bronze', 'Silver', 'Gold', 'Sapphire', 'Ruby', 'Emerald', 'Diamond'] as const;
export const COHORT_SIZE = 15;
export const PROMOTE_TOP = 5;
export const RELEGATE_BOTTOM = 3;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type Outcome = 'promote' | 'relegate' | 'hold';

export function outcomeForRank(rank: number, cohortSize: number): Outcome {
  if (rank <= PROMOTE_TOP) return 'promote';
  if (rank > cohortSize - RELEGATE_BOTTOM) return 'relegate';
  return 'hold';
}

export function tierAfter(tier: number, outcome: Outcome): number {
  if (outcome === 'promote') return Math.min(tier + 1, TIERS.length - 1);
  if (outcome === 'relegate') return Math.max(tier - 1, 0);
  return tier;
}

/** UTC Monday 00:00 that starts the league week containing `now`. */
export function weekStartMs(now: number): number {
  const d = new Date(now);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7; // getUTCDay: 0=Sun..6=Sat
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - daysSinceMonday * DAY_MS;
}

/** Stable id for a week: the Monday's ISO date. */
export function weekKeyFor(now: number): string {
  return new Date(weekStartMs(now)).toISOString().slice(0, 10);
}

const ADJECTIVES = ['Swift', 'Calm', 'Bold', 'Bright', 'Keen', 'Sly', 'Wise', 'Brave', 'Quiet', 'Lucky', 'Sharp', 'Cool'];
const ANIMALS = ['Otter', 'Fox', 'Hawk', 'Wolf', 'Bear', 'Lynx', 'Crane', 'Moth', 'Raven', 'Koi', 'Owl', 'Elk'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** A stable, anonymous display name for another account — never their identity. */
export function handleFor(accountId: string): string {
  const h = hash(accountId);
  return `${ADJECTIVES[h % ADJECTIVES.length]} ${ANIMALS[(h >>> 5) % ANIMALS.length]}`;
}

/** Weekly XP for each account id, over [startMs, endMs) — summed from progress. */
async function weeklyXp(
  db: Db,
  accountIds: string[],
  startMs: number,
  endMs: number,
): Promise<Map<string, number>> {
  const out = new Map<string, number>(accountIds.map((id) => [id, 0]));
  if (accountIds.length === 0) return out;
  const { rows } = await db.query(
    `SELECT owner_id, COALESCE(SUM((payload->>'xpAwarded')::numeric), 0)::bigint AS xp
       FROM records
      WHERE collection = 'progress'
        AND deleted_at IS NULL
        AND owner_id = ANY($1)
        AND (payload->>'status') = 'completed'
        AND (payload->>'completedAt') ~ '^[0-9]+$'
        AND (payload->>'completedAt')::bigint >= $2
        AND (payload->>'completedAt')::bigint <  $3
      GROUP BY owner_id`,
    [accountIds, startMs, endMs],
  );
  for (const r of rows) out.set(String(r.owner_id), Number(r.xp));
  return out;
}

async function membership(
  db: Db,
  accountId: string,
  weekKey: string,
): Promise<{ cohortId: string; tier: number } | null> {
  const { rows } = await db.query(
    `SELECT cohort_id, tier FROM league_memberships WHERE account_id = $1 AND week_key = $2`,
    [accountId, weekKey],
  );
  const row = rows[0];
  return row ? { cohortId: String(row.cohort_id), tier: Number(row.tier) } : null;
}

async function cohortMembers(db: Db, weekKey: string, cohortId: string): Promise<string[]> {
  const { rows } = await db.query(
    `SELECT account_id FROM league_memberships WHERE week_key = $1 AND cohort_id = $2`,
    [weekKey, cohortId],
  );
  return rows.map((r) => String(r.account_id));
}

/** An open cohort in this tier to join, or null if all are full / none exist. */
async function openCohort(db: Db, weekKey: string, tier: number): Promise<string | null> {
  const { rows } = await db.query(
    `SELECT cohort_id
       FROM league_memberships
      WHERE week_key = $1 AND tier = $2
      GROUP BY cohort_id
     HAVING COUNT(*) < $3
      ORDER BY cohort_id
      LIMIT 1`,
    [weekKey, tier, COHORT_SIZE],
  );
  return rows[0] ? String(rows[0].cohort_id) : null;
}

/** The tier this account should sit in this week, from last week's result. */
async function tierFromLastWeek(db: Db, accountId: string, now: number): Promise<number> {
  const lastStart = weekStartMs(now) - WEEK_MS;
  const lastKey = weekKeyFor(lastStart + DAY_MS); // any time inside last week
  const prior = await membership(db, accountId, lastKey);
  if (!prior) return 0; // new competitor -> Bronze

  const members = await cohortMembers(db, lastKey, prior.cohortId);
  const xp = await weeklyXp(db, members, lastStart, weekStartMs(now));
  const ranked = members
    .map((id) => ({ id, xp: xp.get(id) ?? 0 }))
    .sort((a, b) => b.xp - a.xp || a.id.localeCompare(b.id));
  const rank = ranked.findIndex((m) => m.id === accountId) + 1;
  return tierAfter(prior.tier, outcomeForRank(rank, ranked.length));
}

/** This week's membership for an account, creating (and tiering) it if needed. */
async function ensureMembership(
  db: Db,
  accountId: string,
  now: number,
): Promise<{ cohortId: string; tier: number }> {
  const weekKey = weekKeyFor(now);
  const existing = await membership(db, accountId, weekKey);
  if (existing) return existing;

  const tier = await tierFromLastWeek(db, accountId, now);
  const cohortId = (await openCohort(db, weekKey, tier)) ?? `${weekKey}:${tier}:${hash(accountId + weekKey).toString(36)}`;
  await db.query(
    `INSERT INTO league_memberships (account_id, week_key, cohort_id, tier, joined_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (account_id, week_key) DO NOTHING`,
    [accountId, weekKey, cohortId, tier, now],
  );
  return { cohortId, tier };
}

export interface StandingEntry {
  name: string;
  xp: number;
  isYou: boolean;
  rank: number;
  outcome: Outcome;
}
export interface LeagueStandings {
  tier: string;
  weekEndsAt: number;
  entries: StandingEntry[];
  yourRank: number;
}

/** The requester's current league standings. */
export async function leagueStandings(db: Db, accountId: string, now: number): Promise<LeagueStandings> {
  const weekKey = weekKeyFor(now);
  const { cohortId, tier } = await ensureMembership(db, accountId, now);
  const members = await cohortMembers(db, weekKey, cohortId);
  const xp = await weeklyXp(db, members, weekStartMs(now), weekStartMs(now) + WEEK_MS);

  const ranked = members
    .map((id) => ({ id, xp: xp.get(id) ?? 0 }))
    .sort((a, b) => b.xp - a.xp || a.id.localeCompare(b.id));

  const entries: StandingEntry[] = ranked.map((m, i) => ({
    name: m.id === accountId ? 'You' : handleFor(m.id),
    xp: m.xp,
    isYou: m.id === accountId,
    rank: i + 1,
    outcome: outcomeForRank(i + 1, ranked.length),
  }));

  return {
    tier: TIERS[Math.max(0, Math.min(tier, TIERS.length - 1))]!,
    weekEndsAt: weekStartMs(now) + WEEK_MS,
    entries,
    yourRank: entries.find((e) => e.isYou)?.rank ?? entries.length,
  };
}
