import type { PoolClient } from 'pg';
import { ProtocolError } from './protocol.ts';

const EVENT_TYPES = new Set([
  'lesson_started',
  'lesson_completed',
  'quiz_answered',
  'narration_played',
  'client_error',
  'page_view',
  'web_vital',
]);
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

/** Accepts only bounded labels—never arbitrary card text or user input. */
export async function recordTelemetry(
  client: PoolClient,
  accountId: string,
  raw: unknown,
): Promise<{ ok: true }> {
  if (typeof raw !== 'object' || raw === null) throw new ProtocolError('body must be an object');
  const body = raw as Record<string, unknown>;
  if (typeof body.event !== 'string' || !EVENT_TYPES.has(body.event)) {
    throw new ProtocolError('event is not allowed');
  }
  const route = boundedLabel(body.route, 'route', 160);
  const detail = boundedLabel(body.detail, 'detail', 40);
  const value = body.value === undefined ? null : body.value;
  if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000)) {
    throw new ProtocolError('value is invalid');
  }
  const now = Date.now();

  await client.query(
    `INSERT INTO telemetry_events (account_id, event_type, route, detail, value, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [accountId, body.event, route, detail, value, now],
  );

  // Opportunistic retention keeps this self-contained without a cron job.
  if (Math.random() < 0.01) {
    await client.query('DELETE FROM telemetry_events WHERE created_at < $1', [now - RETENTION_MS]);
  }
  return { ok: true };
}

function boundedLabel(value: unknown, field: string, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > max || !/^[A-Za-z0-9_/:.\-]+$/.test(value)) {
    throw new ProtocolError(`${field} is invalid`);
  }
  return value;
}
