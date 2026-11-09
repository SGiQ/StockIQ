import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DAY_MS,
  DEFAULT_EMAIL_DAILY_CAP,
  EMAIL_REQUEST_HOURLY,
  HOUR_MS,
  RateLimitError,
  clientIp,
  emailDailyCap,
  enforce,
  enforceAll,
  overLimit,
  windowStart,
  type Queryable,
} from '../src/rateLimit.ts';

/** An in-memory stand-in for the rate_limits table. */
function memoryDb(): Queryable & { rows: Map<string, number>; deletes: number } {
  const rows = new Map<string, number>();
  const db = {
    rows,
    deletes: 0,
    async query(text: string, params?: unknown[]) {
      if (text.startsWith('DELETE')) {
        db.deletes += 1;
        return { rows: [] };
      }
      const key = `${params![0]}|${params![1]}`;
      const count = (rows.get(key) ?? 0) + 1;
      rows.set(key, count);
      return { rows: [{ count }] };
    },
  };
  return db;
}

test('clientIp: first hop of x-forwarded-for when the proxy is trusted', () => {
  assert.equal(clientIp({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }, '10.0.0.2', true), '203.0.113.9');
  assert.equal(clientIp({ 'x-forwarded-for': ['198.51.100.4'] }, '10.0.0.2', true), '198.51.100.4');
  // No header: the socket address.
  assert.equal(clientIp({}, '10.0.0.2', true), '10.0.0.2');
  // Proxy not trusted: the header is ignored even when present.
  assert.equal(clientIp({ 'x-forwarded-for': '203.0.113.9' }, '10.0.0.2', false), '10.0.0.2');
  assert.equal(clientIp({}, undefined, false), 'unknown');
});

test('windowStart floors to the window; overLimit is strict', () => {
  assert.equal(windowStart(HOUR_MS + 5, HOUR_MS), HOUR_MS);
  assert.equal(windowStart(3 * DAY_MS - 1, DAY_MS), 2 * DAY_MS);
  assert.equal(overLimit(10, EMAIL_REQUEST_HOURLY), false, 'the limit itself is allowed');
  assert.equal(overLimit(11, EMAIL_REQUEST_HOURLY), true);
});

test('enforce: allows up to the limit, then throws RateLimitError', async () => {
  const db = memoryDb();
  const now = 1_700_000_000_000;
  for (let i = 0; i < EMAIL_REQUEST_HOURLY.limit; i += 1) {
    await enforce(db, EMAIL_REQUEST_HOURLY, '203.0.113.9', now);
  }
  await assert.rejects(enforce(db, EMAIL_REQUEST_HOURLY, '203.0.113.9', now), (e: unknown) => {
    assert.ok(e instanceof RateLimitError);
    assert.equal(e.rule.name, EMAIL_REQUEST_HOURLY.name);
    return true;
  });
});

test('enforce: a new window resets, and other subjects are independent', async () => {
  const db = memoryDb();
  const now = 1_700_000_000_000;
  for (let i = 0; i <= EMAIL_REQUEST_HOURLY.limit; i += 1) {
    await enforce(db, EMAIL_REQUEST_HOURLY, 'a', now).catch(() => {});
  }
  // Same subject, next window: allowed again.
  await enforce(db, EMAIL_REQUEST_HOURLY, 'a', now + HOUR_MS);
  // Different subject, same window: unaffected.
  await enforce(db, EMAIL_REQUEST_HOURLY, 'b', now);
});

test('enforceAll: the first rule over its limit wins', async () => {
  const db = memoryDb();
  const burst = { name: 'burst', limit: 2, windowMs: HOUR_MS };
  const daily = { name: 'daily', limit: 100, windowMs: DAY_MS };
  await enforceAll(db, [burst, daily], 'ip', 0);
  await enforceAll(db, [burst, daily], 'ip', 0);
  await assert.rejects(enforceAll(db, [burst, daily], 'ip', 0), (e: unknown) =>
    e instanceof RateLimitError && e.rule.name === 'burst',
  );
});

test('emailDailyCap: env override, with a sane default for junk', () => {
  assert.equal(emailDailyCap({} as NodeJS.ProcessEnv).limit, DEFAULT_EMAIL_DAILY_CAP);
  assert.equal(emailDailyCap({ EMAIL_DAILY_CAP: '500' } as NodeJS.ProcessEnv).limit, 500);
  assert.equal(emailDailyCap({ EMAIL_DAILY_CAP: 'lots' } as NodeJS.ProcessEnv).limit, DEFAULT_EMAIL_DAILY_CAP);
  assert.equal(emailDailyCap({ EMAIL_DAILY_CAP: '-3' } as NodeJS.ProcessEnv).limit, DEFAULT_EMAIL_DAILY_CAP);
});
