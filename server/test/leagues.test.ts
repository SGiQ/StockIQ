import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COHORT_SIZE,
  PROMOTE_TOP,
  RELEGATE_BOTTOM,
  TIERS,
  handleFor,
  leagueStandings,
  outcomeForRank,
  tierAfter,
  weekKeyFor,
  weekStartMs,
  type Db,
} from '../src/leagues.ts';

/** A mock Db that routes queries to canned rows by SQL substring (first match). */
function mockDb(routes: [string, (params?: unknown[]) => Record<string, unknown>[]][]): Db {
  return {
    query: async (text: string, params?: unknown[]) => {
      for (const [needle, fn] of routes) if (text.includes(needle)) return { rows: fn(params) };
      return { rows: [] };
    },
  };
}

const NOON = new Date('2026-08-12T12:00:00Z').getTime(); // a Wednesday

test('outcomeForRank: top promote, bottom relegate, middle holds', () => {
  assert.equal(outcomeForRank(1, 15), 'promote');
  assert.equal(outcomeForRank(PROMOTE_TOP, 15), 'promote');
  assert.equal(outcomeForRank(PROMOTE_TOP + 1, 15), 'hold');
  assert.equal(outcomeForRank(15 - RELEGATE_BOTTOM + 1, 15), 'relegate');
});

test('tierAfter: promote up, relegate down, clamped to the ladder', () => {
  assert.equal(tierAfter(0, 'promote'), 1);
  assert.equal(tierAfter(0, 'relegate'), 0); // can't drop below Bronze
  assert.equal(tierAfter(TIERS.length - 1, 'promote'), TIERS.length - 1); // can't pass Diamond
  assert.equal(tierAfter(3, 'hold'), 3);
});

test('weekStartMs is UTC Monday; weekKey is that Monday', () => {
  const start = new Date(weekStartMs(NOON));
  assert.equal(start.getUTCDay(), 1);
  assert.equal(weekKeyFor(NOON), '2026-08-10'); // the Monday of that week
  assert.equal(weekKeyFor(NOON + 2 * 86_400_000), weekKeyFor(NOON)); // same week
});

test('handleFor: stable, anonymous, never the raw id', () => {
  const h = handleFor('acct-123');
  assert.equal(h, handleFor('acct-123'));
  assert.ok(!h.includes('acct-123'));
  assert.match(h, /^[A-Z][a-z]+ [A-Z][a-z]+$/);
});

test('leagueStandings: existing membership ranks the cohort by weekly XP', async () => {
  const db = mockDb([
    ['SELECT cohort_id, tier FROM league_memberships', () => [{ cohort_id: 'c1', tier: 2 }]], // Gold
    ['SELECT account_id FROM league_memberships', () => [
      { account_id: 'me' }, { account_id: 'rival' }, { account_id: 'laggard' },
    ]],
    ['SELECT owner_id', () => [
      { owner_id: 'me', xp: 100 }, { owner_id: 'rival', xp: 250 }, { owner_id: 'laggard', xp: 40 },
    ]],
  ]);

  const s = await leagueStandings(db, 'me', NOON);
  assert.equal(s.tier, 'Gold');
  assert.deepEqual(s.entries.map((e) => e.xp), [250, 100, 40]); // sorted desc
  assert.equal(s.entries[0]!.name, handleFor('rival'));
  assert.equal(s.entries[1]!.isYou, true);
  assert.equal(s.entries[1]!.name, 'You');
  assert.equal(s.yourRank, 2);
  assert.ok(s.weekEndsAt > NOON);
});

test('leagueStandings: a brand-new account is placed in Bronze', async () => {
  let inserted = false;
  const db: Db = {
    query: async (text, params) => {
      if (text.includes('SELECT cohort_id, tier FROM league_memberships')) return { rows: [] }; // no membership, this or last week
      if (text.includes('HAVING COUNT')) return { rows: [] }; // no open cohort
      if (text.includes('INSERT INTO league_memberships')) {
        inserted = true;
        assert.equal((params as unknown[])[3], 0, 'new accounts start at tier 0 (Bronze)');
        return { rows: [] };
      }
      if (text.includes('SELECT account_id FROM league_memberships')) return { rows: [{ account_id: 'newbie' }] };
      if (text.includes('SELECT owner_id')) return { rows: [{ owner_id: 'newbie', xp: 0 }] };
      return { rows: [] };
    },
  };

  const s = await leagueStandings(db, 'newbie', NOON);
  assert.ok(inserted, 'membership row was created');
  assert.equal(s.tier, 'Bronze');
  assert.equal(s.yourRank, 1);
  assert.equal(s.entries[0]!.isYou, true);
});

test('constants are sane', () => {
  assert.ok(COHORT_SIZE > PROMOTE_TOP + RELEGATE_BOTTOM);
  assert.equal(TIERS[0], 'Bronze');
  assert.equal(TIERS[TIERS.length - 1], 'Diamond');
});
