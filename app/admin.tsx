import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { Screen, Text } from '@/components/primitives';
import { SYNC_URL } from '@/config';
import { palette, radius, space } from '@/theme/tokens';

interface Overview {
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

interface SignupRow { day: string; count: number }

interface UserRow {
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

interface TelemetryRow { event_type: string; count: number }

async function adminFetch<T>(path: string, secret: string): Promise<T> {
  const res = await fetch(`${SYNC_URL}${path}`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <View style={s.statCard}>
      <Text variant="caption" color={palette.slate} uppercase>{label}</Text>
      <Text variant="display" color={palette.ink} style={s.statValue}>{String(value)}</Text>
      {sub ? <Text variant="caption" color={palette.slate}>{sub}</Text> : null}
    </View>
  );
}

function SignupChart({ data }: { data: SignupRow[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const w = 600;
  const h = 120;
  const barW = Math.max(4, Math.min(16, (w - 20) / data.length - 2));

  return (
    <View style={s.chartWrap}>
      <Text variant="label" color={palette.slate} uppercase>Signups (last 30 days)</Text>
      <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        {data.map((d, i) => {
          const barH = (d.count / max) * (h - 20);
          const x = 10 + (i / data.length) * (w - 20);
          return (
            <Rect
              key={d.day}
              x={x}
              y={h - barH - 2}
              width={barW}
              height={barH}
              rx={2}
              fill={palette.emeraldDeep}
              opacity={0.8}
            />
          );
        })}
        <Line x1={10} y1={h - 1} x2={w - 10} y2={h - 1} stroke={palette.hairline} strokeWidth={1} />
      </Svg>
    </View>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

function formatAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function planColor(plan: string) {
  if (plan === 'elite') return palette.violet;
  if (plan === 'pro') return palette.emeraldDeep;
  return palette.slate;
}

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [telemetry, setTelemetry] = useState<TelemetryRow[]>([]);

  const load = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const [ov, su, us, te] = await Promise.all([
        adminFetch<Overview>('/v1/admin/overview', key),
        adminFetch<SignupRow[]>('/v1/admin/signups?days=30', key),
        adminFetch<{ users: UserRow[]; total: number }>('/v1/admin/users?limit=50', key),
        adminFetch<TelemetryRow[]>('/v1/admin/telemetry?days=7', key),
      ]);
      setOverview(ov);
      setSignups(su);
      setUsers(us.users);
      setUsersTotal(us.total);
      setTelemetry(te);
      setAuthed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = () => {
    if (!secret.trim()) return;
    void load(secret.trim());
  };

  if (!authed) {
    return (
      <Screen tone="warm" edges={['top']}>
        <View style={s.loginWrap}>
          <Text variant="h1" color={palette.ink}>Admin</Text>
          <Text variant="body" color={palette.slate}>Enter the admin secret to continue.</Text>
          <TextInput
            value={secret}
            onChangeText={setSecret}
            placeholder="Admin secret"
            placeholderTextColor={palette.slateLight}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={s.input}
            onSubmitEditing={handleLogin}
          />
          <Pressable onPress={handleLogin} style={s.loginBtn} disabled={loading}>
            <Text variant="label" color={palette.paper}>{loading ? 'Loading...' : 'Sign in'}</Text>
          </Pressable>
          {error ? <Text variant="caption" color={palette.danger}>{error}</Text> : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen tone="warm" edges={['top']}>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text variant="h1" color={palette.ink}>Dashboard</Text>
          <Pressable onPress={() => void load(secret)} style={s.refreshBtn}>
            <Text variant="label" color={palette.forestDeep}>Refresh</Text>
          </Pressable>
        </View>

        {overview && (
          <>
            <Text variant="label" color={palette.slate} uppercase style={s.sectionLabel}>Users</Text>
            <View style={s.statGrid}>
              <StatCard label="Total accounts" value={overview.totalAccounts} />
              <StatCard label="Devices" value={overview.totalDevices} />
              <StatCard label="Today" value={overview.signupsToday} sub="new signups" />
              <StatCard label="This week" value={overview.signupsThisWeek} sub="new signups" />
              <StatCard label="This month" value={overview.signupsThisMonth} sub="new signups" />
            </View>

            <Text variant="label" color={palette.slate} uppercase style={s.sectionLabel}>Engagement</Text>
            <View style={s.statGrid}>
              <StatCard label="DAU today" value={overview.dauToday} />
              <StatCard label="DAU yesterday" value={overview.dauYesterday} />
              <StatCard label="WAU" value={overview.wau} />
              <StatCard label="MAU" value={overview.mau} />
            </View>

            <Text variant="label" color={palette.slate} uppercase style={s.sectionLabel}>Learning</Text>
            <View style={s.statGrid}>
              <StatCard label="Lessons completed" value={overview.lessonsCompleted} sub={`${overview.lessonsCompletedToday} today`} />
              <StatCard label="Avg / user" value={overview.avgLessonsPerUser} sub="lessons completed" />
              <StatCard label="AI questions" value={overview.totalAsks} sub={`${overview.asksToday} today`} />
              <StatCard label="Paper traders" value={overview.activeTrades} />
              <StatCard label="Card reports" value={overview.cardReports} />
            </View>

            {overview.authBreakdown.length > 0 && (
              <>
                <Text variant="label" color={palette.slate} uppercase style={s.sectionLabel}>Auth methods</Text>
                <View style={s.tableCard}>
                  {overview.authBreakdown.map((a) => (
                    <View key={a.provider} style={s.tableRow}>
                      <Text variant="body" color={palette.ink} style={s.tableCell}>{a.provider}</Text>
                      <Text variant="bodyEm" color={palette.ink}>{a.count}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        <SignupChart data={signups} />

        {telemetry.length > 0 && (
          <>
            <Text variant="label" color={palette.slate} uppercase style={s.sectionLabel}>Telemetry (7 days)</Text>
            <View style={s.tableCard}>
              <View style={s.tableRow}>
                <Text variant="label" color={palette.slate} style={s.tableCell}>Event</Text>
                <Text variant="label" color={palette.slate}>Count</Text>
              </View>
              {telemetry.map((t) => (
                <View key={t.event_type} style={s.tableRow}>
                  <Text variant="bodySm" color={palette.ink} style={s.tableCell}>{t.event_type}</Text>
                  <Text variant="bodySm" color={palette.ink}>{t.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text variant="label" color={palette.slate} uppercase style={s.sectionLabel}>
          {`Users (${usersTotal} total)`}
        </Text>
        <View style={s.tableCard}>
          <View style={s.tableRow}>
            <Text variant="label" color={palette.slate} style={s.userCell}>Account</Text>
            <Text variant="label" color={palette.slate} style={s.userCellSm}>Plan</Text>
            <Text variant="label" color={palette.slate} style={s.userCellSm}>XP</Text>
            <Text variant="label" color={palette.slate} style={s.userCellSm}>Lessons</Text>
            <Text variant="label" color={palette.slate} style={s.userCellSm}>Streak</Text>
            <Text variant="label" color={palette.slate} style={s.userCellSm}>Last seen</Text>
          </View>
          {users.map((u) => (
            <View key={u.accountId} style={s.tableRow}>
              <View style={s.userCell}>
                <Text variant="bodySm" color={palette.ink} numberOfLines={1}>{u.accountId.slice(0, 16)}...</Text>
                <Text variant="caption" color={palette.slate}>
                  {`${formatDate(u.createdAt)} · ${u.devices} device${u.devices !== 1 ? 's' : ''}${u.provider ? ` · ${u.provider}` : ''}`}
                </Text>
              </View>
              <Text variant="bodySm" color={planColor(u.plan)} style={s.userCellSm}>{u.plan}</Text>
              <Text variant="bodySm" color={palette.ink} style={s.userCellSm}>{u.totalXp}</Text>
              <Text variant="bodySm" color={palette.ink} style={s.userCellSm}>{u.lessonsCompleted}</Text>
              <Text variant="bodySm" color={palette.ink} style={s.userCellSm}>{u.currentStreak}</Text>
              <Text variant="bodySm" color={palette.slate} style={s.userCellSm}>{formatAgo(u.lastSeen)}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  loginWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl, gap: space.md },
  input: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: palette.paper,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 4,
    color: palette.ink,
    fontSize: 16,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  loginBtn: {
    backgroundColor: palette.forestDeep,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm + 4,
  },
  body: { padding: space.lg, gap: space.sm, maxWidth: 1200, alignSelf: 'center', width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  refreshBtn: {
    borderWidth: 1,
    borderColor: palette.forestDeep,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  sectionLabel: { marginTop: space.lg, marginBottom: space.xs },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  statCard: {
    backgroundColor: palette.paper,
    borderRadius: radius.lg,
    padding: space.md,
    minWidth: 140,
    flex: 1,
    gap: 2,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  statValue: { fontSize: 32, lineHeight: 38 },
  chartWrap: {
    backgroundColor: palette.paper,
    borderRadius: radius.lg,
    padding: space.md,
    marginTop: space.md,
    gap: space.sm,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  tableCard: {
    backgroundColor: palette.paper,
    borderRadius: radius.lg,
    padding: space.sm,
    borderWidth: 1,
    borderColor: palette.hairline,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.hairline,
  },
  tableCell: { flex: 1 },
  userCell: { flex: 2, gap: 1 },
  userCellSm: { flex: 1, minWidth: 60 },
});
