import { Platform } from 'react-native';
import type { LocalRecord } from '@/store/sqlite/SqliteRepository';
import { getDeviceId } from '@/lib/deviceId';
import { SyncError } from './errors';

/**
 * HTTP client for the sync service.
 *
 * MIRRORS server/src/protocol.ts. The two are duplicated rather than shared
 * because the server deploys standalone and cannot import from the Expo app.
 * A shape mismatch surfaces as a 400 with a specific message rather than as
 * corrupt rows, because the server validates every field it receives.
 */

export interface SyncResponse {
  cursor: number;
  changes: LocalRecord[];
  hasMore: boolean;
  serverTime: number;
}

export { SyncError } from './errors';

/**
 * The contract `SyncingRepository` depends on. Depending on the interface
 * rather than the class is what lets the sync cycle be driven in a test
 * without a device keychain.
 */
export interface SyncTransport {
  sync(since: number, changes: LocalRecord[]): Promise<SyncResponse>;
  startLink(): Promise<LinkCode>;
  claimLink(code: string): Promise<void>;
  signInWithApple(identityToken: string, nonce: string): Promise<AppleSignIn>;
  requestEmailCode(email: string): Promise<void>;
  signInWithEmail(email: string, code: string): Promise<AppleSignIn>;
  signOut(): Promise<void>;
  getSession(): Promise<AccountSession>;
  listDevices(): Promise<DeviceList>;
  revokeDevice(deviceId: string): Promise<void>;
}

export interface AppleSignIn {
  accountId: string;
  /**
   * False only when this device landed on a *different person's* account —
   * a second person signing in on a shared phone. Contributing local records
   * then would copy the first person's progress into the second's.
   */
  merge: boolean;
}

export interface LinkCode {
  code: string;
  expiresAt: number;
}

export interface LinkedDevice {
  id: string;
  label: string | null;
  createdAt: number;
  lastSeenAt: number;
}

export interface DeviceList {
  devices: LinkedDevice[];
  thisDeviceId: string;
}

export interface AccountSession {
  signedIn: boolean;
  email: string | null;
}

/** Requests are bounded so a stalled network cannot wedge a sync forever. */
const TIMEOUT_MS = 20_000;

export class SyncClient implements SyncTransport {
  constructor(private readonly baseUrl: string) {}

  /**
   * Every request carries the device's own secret. The server maps it to an
   * account — the device never learns or sends another device's secret, which
   * is what makes revoking one of them meaningful.
   */
  private async request<T>(path: string, method: string, body?: unknown): Promise<T> {
    if (!this.baseUrl) {
      throw new SyncError('No sync URL configured', 'unconfigured');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          'x-device-id': await getDeviceId(),
          'x-device-label': deviceLabel(),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      // A dropped connection is the normal case on a phone, not an error
      // worth surfacing — the caller retries on the next cycle.
      throw new SyncError(
        error instanceof Error ? error.message : 'network request failed',
        'offline',
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      // The server's own message is preferred wherever it sends one, because
      // these strings are shown to a person: "that code is not valid" or
      // "Sign-in email is unavailable right now" are actionable, whereas
      // "request failed with 503" tells them nothing they can do anything
      // about.
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      // 400 is the server refusing this specific input — retrying the same
      // thing cannot help, so it stays distinguishable from a transient fault.
      if (response.status === 400) {
        throw new SyncError(payload.error ?? 'request rejected', 'rejected');
      }

      throw new SyncError(
        payload.error ?? `request failed with ${response.status}`,
        'server',
      );
    }

    return (await response.json()) as T;
  }

  sync(since: number, changes: LocalRecord[]): Promise<SyncResponse> {
    return this.request<SyncResponse>('/v1/sync', 'POST', { since, changes });
  }

  startLink(): Promise<LinkCode> {
    return this.request<LinkCode>('/v1/link/start', 'POST', {});
  }

  async claimLink(code: string): Promise<void> {
    await this.request('/v1/link/claim', 'POST', { code });
  }

  signInWithApple(identityToken: string, nonce: string): Promise<AppleSignIn> {
    return this.request<AppleSignIn>('/v1/auth/apple', 'POST', { identityToken, nonce });
  }

  async requestEmailCode(email: string): Promise<void> {
    await this.request('/v1/auth/email/request', 'POST', { email });
  }

  signInWithEmail(email: string, code: string): Promise<AppleSignIn> {
    return this.request<AppleSignIn>('/v1/auth/email/verify', 'POST', { email, code });
  }

  async signOut(): Promise<void> {
    await this.request('/v1/auth/sign-out', 'POST', {});
  }

  getSession(): Promise<AccountSession> {
    return this.request<AccountSession>('/v1/auth/session', 'GET');
  }

  listDevices(): Promise<DeviceList> {
    return this.request<DeviceList>('/v1/devices', 'GET');
  }

  async revokeDevice(deviceId: string): Promise<void> {
    await this.request(`/v1/devices/${encodeURIComponent(deviceId)}`, 'DELETE');
  }
}

/**
 * A human-readable name for the device list, so a person can tell which row
 * is the phone they lost. Best-effort and untrusted — the server stores it
 * verbatim and never acts on it.
 */
function deviceLabel(): string {
  const os = Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android' : 'Web';
  return `${os} · ${Platform.Version ?? ''}`.trim();
}
