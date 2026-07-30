/**
 * StockIQ sync service.
 *
 * One endpoint, POST /v1/sync, which pushes a client's changed records and
 * returns everything that changed for that owner since the client's cursor.
 *
 * Deliberately dependency-light: node:http plus `pg`. There is one route, so
 * a framework would be more surface area than logic.
 *
 * ── On authentication ────────────────────────────────────────────────────
 * The `X-Owner-Id` header IS the credential. It is a 128-bit random value
 * minted on the device and kept in the iOS keychain, so it behaves as a
 * bearer capability: whoever holds it can read and write that owner's rows.
 *
 * That is a deliberate, bounded trade, not an oversight. It buys sync with no
 * account, no password, and no personal data — which is the right shape while
 * the app is personal. It is ONLY acceptable because the data is lesson
 * progress and saved cards. Before anything sensitive is stored, or before
 * accounts exist, this needs real per-user auth. Nothing here should be read
 * as a claim that a capability token is equivalent to authentication.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pool } from './db.ts';
import {
  ProtocolError,
  parseDeviceId,
  parseDeviceLabel,
  parseSyncRequest,
} from './protocol.ts';
import {
  claimLinkCode,
  createLinkCode,
  listDevices,
  normaliseCode,
  resolveAccount,
  revokeDevice,
  signInWithApple,
} from './accounts.ts';
import { verifyAppleToken } from './apple.ts';
import { pushAndPull } from './sync.ts';

const PORT = Number(process.env.PORT ?? 8080);
/** Requests larger than this are refused before being buffered. */
const MAX_BODY_BYTES = 4 * 1024 * 1024;

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(json),
    // The web build calls this cross-origin. CORS is not a security control
    // here — the capability token is — but without it the browser refuses.
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, x-device-id, x-device-label',
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  });
  res.end(json);
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new ProtocolError('request body too large');
    chunks.push(chunk as Buffer);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ProtocolError('body is not valid JSON');
  }
}

const server = createServer((req, res) => {
  void (async () => {
    try {
      if (req.method === 'OPTIONS') return send(res, 204, {});

      if (req.method === 'GET' && req.url === '/health') {
        await pool.query('SELECT 1');
        return send(res, 200, { ok: true });
      }

      // Every route below is device-authenticated and runs in one
      // transaction, so account resolution and the work it authorises can
      // never be split across two connections.
      const routes: Record<string, 'POST' | 'GET' | 'DELETE'> = {
        '/v1/sync': 'POST',
        '/v1/link/start': 'POST',
        '/v1/link/claim': 'POST',
        '/v1/auth/apple': 'POST',
        '/v1/devices': 'GET',
      };
      const path = (req.url ?? '').split('?')[0] ?? '';
      const isRevoke = req.method === 'DELETE' && path.startsWith('/v1/devices/');

      if (!isRevoke && routes[path] !== req.method) {
        return send(res, 404, { error: 'not found' });
      }

      const deviceId = parseDeviceId(req.headers['x-device-id']);
      const label = parseDeviceLabel(req.headers['x-device-label']);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const accountId = await resolveAccount(client, deviceId, label);
        let payload: unknown;

        if (isRevoke) {
          const target = decodeURIComponent(path.slice('/v1/devices/'.length));
          await revokeDevice(client, accountId, deviceId, target);
          payload = { ok: true };
        } else if (path === '/v1/sync') {
          const { since, changes } = parseSyncRequest(await readBody(req));
          payload = await pushAndPull(client, accountId, since, changes);
        } else if (path === '/v1/link/start') {
          payload = await createLinkCode(client, accountId);
        } else if (path === '/v1/auth/apple') {
          const body = (await readBody(req)) as {
            identityToken?: unknown;
            nonce?: unknown;
          };
          const identity = await verifyAppleToken(body.identityToken, body.nonce);
          const result = await signInWithApple(client, deviceId, label, identity.sub);
          // Same as pairing: the cursor belongs to the account just left.
          payload = { ...result, resetCursor: true };
        } else if (path === '/v1/link/claim') {
          const body = (await readBody(req)) as { code?: unknown };
          const result = await claimLinkCode(client, deviceId, label, normaliseCode(body.code));
          // The joining device must re-pull from scratch: its cursor belongs
          // to the account it just left and means nothing on the new one.
          payload = { ...result, resetCursor: true };
        } else {
          payload = await listDevices(client, accountId).then((devices) => ({
            devices,
            thisDeviceId: deviceId,
          }));
        }

        await client.query('COMMIT');
        return send(res, 200, payload);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      if (error instanceof ProtocolError) {
        return send(res, 400, { error: error.message });
      }
      // Log server-side, return nothing specific: an error string from
      // Postgres can name columns and constraints.
      console.error('sync failed:', error);
      return send(res, 500, { error: 'internal error' });
    }
  })();
});

server.listen(PORT, () => {
  console.log(`stockiq-sync listening on :${PORT}`);
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  });
}
