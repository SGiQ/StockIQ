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
  signInWithIdentity,
} from './accounts.ts';
import { verifyAppleToken } from './apple.ts';
import { createEmailChallenge, normaliseEmail, verifyEmailCode } from './emailAuth.ts';
import {
  MailDeliveryError,
  MailNotConfiguredError,
  explainMailFailure,
  mailer,
  signInMessage,
} from './mailer.ts';
import { pushAndPull } from './sync.ts';
import { recordTelemetry } from './telemetry.ts';

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

      // A human clicked the domain.
      //
      // Without this they get `{"error":"not found"}`, which reads exactly
      // like a broken deployment — the service is fine, `/` simply is not a
      // route. Saying so costs one branch and saves a debugging session.
      //
      // Deliberately says nothing about configuration, versions, or which
      // providers are wired up: this is unauthenticated and public, and none
      // of that is anyone's business but the operator's.
      if (req.method === 'GET' && (req.url === '/' || req.url === '')) {
        return send(res, 200, {
          service: 'stockiq-sync',
          status: 'ok',
          message:
            'This is an API, not a website. There is nothing to see here — try /health.',
          endpoints: ['GET /health', 'POST /v1/sync', 'POST /v1/link/start'],
        });
      }

      // Every route below is device-authenticated and runs in one
      // transaction, so account resolution and the work it authorises can
      // never be split across two connections.
      const routes: Record<string, 'POST' | 'GET' | 'DELETE'> = {
        '/v1/sync': 'POST',
        '/v1/link/start': 'POST',
        '/v1/link/claim': 'POST',
        '/v1/auth/apple': 'POST',
        '/v1/auth/email/request': 'POST',
        '/v1/auth/email/verify': 'POST',
        '/v1/devices': 'GET',
        '/v1/telemetry': 'POST',
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
        // A failed email code must still COMMIT — the attempt counter lives in
        // that transaction, and rolling it back would uncap guessing. So the
        // status is carried out rather than raised as an error.
        let status = 200;

        if (isRevoke) {
          const target = decodeURIComponent(path.slice('/v1/devices/'.length));
          await revokeDevice(client, accountId, deviceId, target);
          payload = { ok: true };
        } else if (path === '/v1/sync') {
          const { since, changes } = parseSyncRequest(await readBody(req));
          payload = await pushAndPull(client, accountId, since, changes);
        } else if (path === '/v1/link/start') {
          payload = await createLinkCode(client, accountId);
        } else if (path === '/v1/telemetry') {
          payload = await recordTelemetry(client, accountId, await readBody(req));
        } else if (path === '/v1/auth/apple') {
          const body = (await readBody(req)) as {
            identityToken?: unknown;
            nonce?: unknown;
          };
          const identity = await verifyAppleToken(body.identityToken, body.nonce);
          const result = await signInWithIdentity(client, deviceId, label, 'apple', identity.sub);
          // Same as pairing: the cursor belongs to the account just left.
          payload = { ...result, resetCursor: true };
        } else if (path === '/v1/auth/email/request') {
          const body = (await readBody(req)) as { email?: unknown };
          const email = normaliseEmail(body.email);

          // Two different silences here, and the difference matters.
          //
          // Anything ABOUT THE ADDRESS — no account, rate limited — answers
          // `ok: true`, because reporting it would turn this endpoint into a
          // way to test whether any given person uses StockIQ.
          //
          // Anything about the SERVER — email unconfigured, bad API key,
          // unverified domain — is reported as a 503. Those faults are
          // identical for every address, so saying so leaks nothing, and
          // answering `ok: true` when no mail can be sent leaves the person
          // waiting forever for a code that was never going to arrive.
          try {
            const challenge = await createEmailChallenge(client, email);
            const minutes = Math.round((challenge.expiresAt - Date.now()) / 60000);
            await mailer.send(signInMessage(email, challenge.code, minutes));
            payload = { ok: true };
          } catch (error) {
            if (error instanceof MailNotConfiguredError || error instanceof MailDeliveryError) {
              console.error('[email] delivery failed:', explainMailFailure(error));
              status = 503;
              payload = { error: 'Sign-in email is unavailable right now.' };
            } else {
              // Address-specific (rate limit, validation) — stay silent.
              console.warn('[email] challenge not issued:', (error as Error).message);
              payload = { ok: true };
            }
          }
        } else if (path === '/v1/auth/email/verify') {
          const body = (await readBody(req)) as { email?: unknown; code?: unknown };
          const email = normaliseEmail(body.email);
          const verified = await verifyEmailCode(client, email, body.code);
          if (!verified.ok) {
            status = 400;
            payload = { error: 'that code is not valid' };
          } else {
            const result = await signInWithIdentity(
              client,
              deviceId,
              label,
              'email',
              verified.email,
            );
            payload = { ...result, resetCursor: true };
          }
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
        return send(res, status, payload);
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
  // Stated at startup so a misconfiguration is visible in the deploy log
  // rather than discovered by someone who never received a code.
  console.log(`  email transport: ${mailer.name}`);
  if (mailer.name === 'unconfigured') {
    console.error(
      '  ✖  Email sign-in will return 503. Set RESEND_API_KEY and EMAIL_FROM,\n' +
        '     or EMAIL_TRANSPORT=console for local development.',
    );
  }
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  });
}
