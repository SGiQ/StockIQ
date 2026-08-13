import type { PoolClient } from 'pg';

export interface AdminOverview {
  totalAccounts: number;
  totalDevices: number;
  signupsToday: number;
  signupsThisWeek: number;
  signupsThisMonth: number;
  dauToday: number;
  dauYesterday: number;
  wau: number;
  mau: number;
  authBreakdown: { provider: string; count: number }[];
  lessonsCompleted: number;
  lessonsCompletedToday: number;
  avgLessonsPerUser: number;
  totalAsks: number;
  asksToday: number;
  activeTrades: number;
  cardReports: number;
}

export interface SignupRow {
  day: string;
  count: number;
}

export interface UserRow {
  accountId: string;
  createdAt: number;
  devices: number;
  lastSeen: number;
  provider: string | null;
  totalXp: number;
  lessonsCompleted: number;
  currentStreak: number;
  plan: string;
}

const now = () => Date.now();
const dayMs = 86_400_000;
const countOf = (r: { rows: { count: string }[] }) => Number(r.rows[0]?.count ?? 0);

export async function adminOverview(client: PoolClient): Promise<AdminOverview> {
  const n = now();
  const todayStart = n - (n % dayMs);
  const yesterdayStart = todayStart - dayMs;
  const weekStart = todayStart - 7 * dayMs;
  const monthStart = todayStart - 30 * dayMs;

  const [
    accounts,
    devices,
    signupsToday,
    signupsWeek,
    signupsMonth,
    dauToday,
    dauYesterday,
    wau,
    mau,
    authBreakdown,
    lessonsCompleted,
    lessonsToday,
    avgLessons,
    totalAsks,
    asksToday,
    activeTrades,
    cardReports,
  ] = await Promise.all([
    client.query<{ count: string }>('SELECT count(*) FROM accounts').then(countOf),
    client.query<{ count: string }>('SELECT count(*) FROM devices').then(countOf),
    client.query<{ count: string }>('SELECT count(*) FROM accounts WHERE created_at >= $1', [todayStart]).then(countOf),
    client.query<{ count: string }>('SELECT count(*) FROM accounts WHERE created_at >= $1', [weekStart]).then(countOf),
    client.query<{ count: string }>('SELECT count(*) FROM accounts WHERE created_at >= $1', [monthStart]).then(countOf),
    client.query<{ count: string }>('SELECT count(DISTINCT account_id) FROM devices WHERE last_seen_at >= $1', [todayStart]).then(countOf),
    client.query<{ count: string }>('SELECT count(DISTINCT account_id) FROM devices WHERE last_seen_at >= $1 AND last_seen_at < $2', [yesterdayStart, todayStart]).then(countOf),
    client.query<{ count: string }>('SELECT count(DISTINCT account_id) FROM devices WHERE last_seen_at >= $1', [weekStart]).then(countOf),
    client.query<{ count: string }>('SELECT count(DISTINCT account_id) FROM devices WHERE last_seen_at >= $1', [monthStart]).then(countOf),
    client.query<{ provider: string; count: string }>(
      `SELECT provider, count(*) FROM identities GROUP BY provider ORDER BY count(*) DESC`,
    ).then(r => r.rows.map(row => ({ provider: row.provider, count: Number(row.count) }))),
    client.query<{ count: string }>(
      `SELECT count(*) FROM records WHERE collection = 'progress' AND payload->>'status' = 'completed'`,
    ).then(countOf),
    client.query<{ count: string }>(
      `SELECT count(*) FROM records WHERE collection = 'progress' AND payload->>'status' = 'completed' AND (payload->>'completedAt')::bigint >= $1`,
      [todayStart],
    ).then(countOf),
    client.query<{ avg: string | null }>(
      `SELECT avg(cnt) FROM (SELECT owner_id, count(*) as cnt FROM records WHERE collection = 'progress' AND payload->>'status' = 'completed' GROUP BY owner_id) sub`,
    ).then(r => Math.round(Number(r.rows[0]?.avg ?? 0) * 10) / 10),
    client.query<{ count: string }>(
      `SELECT count(*) FROM records WHERE collection = 'advisor'`,
    ).then(countOf),
    client.query<{ count: string }>(
      `SELECT count(*) FROM records WHERE collection = 'advisor' AND (payload->>'at')::bigint >= $1`,
      [todayStart],
    ).then(countOf),
    client.query<{ count: string }>(
      `SELECT count(DISTINCT owner_id) FROM records WHERE collection = 'paper'`,
    ).then(countOf),
    client.query<{ count: string }>(
      `SELECT count(*) FROM records WHERE collection = 'reports'`,
    ).then(countOf),
  ]);

  return {
    totalAccounts: accounts,
    totalDevices: devices,
    signupsToday,
    signupsThisWeek: signupsWeek,
    signupsThisMonth: signupsMonth,
    dauToday,
    dauYesterday,
    wau,
    mau,
    authBreakdown,
    lessonsCompleted,
    lessonsCompletedToday: lessonsToday,
    avgLessonsPerUser: avgLessons,
    totalAsks,
    asksToday,
    activeTrades,
    cardReports,
  };
}

export async function signupTimeline(client: PoolClient, days: number = 30): Promise<SignupRow[]> {
  const n = now();
  const start = n - days * dayMs;
  const { rows } = await client.query<{ day: string; count: string }>(
    `SELECT to_char(to_timestamp(created_at / 1000.0), 'YYYY-MM-DD') AS day, count(*)
     FROM accounts
     WHERE created_at >= $1
     GROUP BY day
     ORDER BY day`,
    [start],
  );
  return rows.map(r => ({ day: r.day, count: Number(r.count) }));
}

export async function listUsers(
  client: PoolClient,
  limit: number = 50,
  offset: number = 0,
): Promise<{ users: UserRow[]; total: number }> {
  const totalR = await client.query<{ count: string }>('SELECT count(*) FROM accounts');
  const total = Number(totalR.rows[0]?.count ?? 0);

  const { rows } = await client.query<{
    account_id: string;
    created_at: number;
    devices: string;
    last_seen: number | null;
    provider: string | null;
    total_xp: string;
    lessons_completed: string;
    current_streak: string;
    plan: string | null;
  }>(
    `SELECT
       a.id AS account_id,
       a.created_at,
       (SELECT count(*) FROM devices d WHERE d.account_id = a.id) AS devices,
       (SELECT max(last_seen_at) FROM devices d WHERE d.account_id = a.id) AS last_seen,
       (SELECT i.provider FROM identities i WHERE i.account_id = a.id LIMIT 1) AS provider,
       COALESCE((SELECT (r.payload->>'totalXp')::int FROM records r WHERE r.owner_id = a.id AND r.collection = 'profile' LIMIT 1), 0) AS total_xp,
       (SELECT count(*) FROM records r WHERE r.owner_id = a.id AND r.collection = 'progress' AND r.payload->>'status' = 'completed') AS lessons_completed,
       COALESCE((SELECT (r.payload->>'currentStreak')::int FROM records r WHERE r.owner_id = a.id AND r.collection = 'streak' LIMIT 1), 0) AS current_streak,
       COALESCE((SELECT r.payload->>'plan' FROM records r WHERE r.owner_id = a.id AND r.collection = 'entitlement' LIMIT 1), 'free') AS plan
     FROM accounts a
     ORDER BY a.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return {
    total,
    users: rows.map(r => ({
      accountId: r.account_id,
      createdAt: r.created_at,
      devices: Number(r.devices),
      lastSeen: r.last_seen ?? r.created_at,
      provider: r.provider,
      totalXp: Number(r.total_xp),
      lessonsCompleted: Number(r.lessons_completed),
      currentStreak: Number(r.current_streak),
      plan: r.plan ?? 'free',
    })),
  };
}

export async function telemetrySummary(
  client: PoolClient,
  days: number = 7,
): Promise<{ event_type: string; count: number }[]> {
  const start = now() - days * dayMs;
  const { rows } = await client.query<{ event_type: string; count: string }>(
    `SELECT event_type, count(*)
     FROM telemetry_events
     WHERE created_at >= $1
     GROUP BY event_type
     ORDER BY count(*) DESC`,
    [start],
  );
  return rows.map(r => ({ event_type: r.event_type, count: Number(r.count) }));
}
