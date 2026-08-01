import assert from 'node:assert/strict';
import test from 'node:test';
import type { PoolClient } from 'pg';
import { recordTelemetry } from '../src/telemetry.ts';

test('telemetry accepts only bounded product labels', async () => {
  const calls: unknown[][] = [];
  const client = {
    query: async (_sql: string, params?: unknown[]) => {
      if (params) calls.push(params);
      return { rows: [] };
    },
  } as unknown as PoolClient;

  await recordTelemetry(client, 'acct_test', {
    event: 'quiz_answered',
    route: 'market-foundations/what-is-a-stock',
    detail: 'correct',
  });
  assert.deepEqual(calls[0]?.slice(0, 5), [
    'acct_test',
    'quiz_answered',
    'market-foundations/what-is-a-stock',
    'correct',
    null,
  ]);
});

test('telemetry rejects arbitrary user text and unknown events', async () => {
  const client = { query: async () => ({ rows: [] }) } as unknown as PoolClient;
  await assert.rejects(
    recordTelemetry(client, 'acct_test', { event: 'card_text', detail: 'user answer' }),
    /event is not allowed/,
  );
  await assert.rejects(
    recordTelemetry(client, 'acct_test', { event: 'client_error', detail: 'email@example.com' }),
    /detail is invalid/,
  );
});
