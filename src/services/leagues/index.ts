/**
 * League standings — the real server cohort when available, the local sim
 * otherwise.
 *
 * Same shape as the ASK/market proxies: an authenticated GET to the sync
 * service (the endpoint resolves the device to its account), falling back to
 * the simulated cohort on any error — so the screen keeps working before the
 * `/v1/leagues` endpoint is deployed, and switches to real cohorts with no
 * change once it is.
 */
import { SYNC_URL, isSyncConfigured } from '@/config';
import { getDeviceId } from '@/lib/deviceId';
import { buildStandings, type Standing } from '@/features/leagues';
import { reportSilent } from '@/lib/reportSilent';

export interface LeagueView {
  tier: string;
  entries: Standing[];
  yourRank: number;
  weekEndsAt: number | null;
  /** True when these are real server standings; false for the local sim. */
  live: boolean;
}

/** The local simulated view — instant, deterministic, clearly not-live. */
export function simulatedView(youXp: number, now: number): LeagueView {
  const sim = buildStandings(youXp, now);
  return { tier: 'Bronze', entries: sim.entries, yourRank: sim.yourRank, weekEndsAt: null, live: false };
}

export async function fetchLeagueStandings(youXp: number, now: number): Promise<LeagueView> {
  if (isSyncConfigured()) {
    try {
      const res = await fetch(`${SYNC_URL}/v1/leagues`, {
        headers: { 'x-device-id': await getDeviceId() },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          tier?: string;
          weekEndsAt?: number;
          entries?: Standing[];
          yourRank?: number;
        };
        if (Array.isArray(data.entries) && data.entries.length > 0) {
          return {
            tier: data.tier ?? 'Bronze',
            entries: data.entries,
            yourRank: data.yourRank ?? data.entries.findIndex((e) => e.isYou) + 1,
            weekEndsAt: data.weekEndsAt ?? null,
            live: true,
          };
        }
      }
    } catch (error) {
      // fall through to the sim
      reportSilent(error, 'leagues.fetch');
    }
  }
  return simulatedView(youXp, now);
}
