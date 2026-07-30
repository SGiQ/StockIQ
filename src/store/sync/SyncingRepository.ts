import type { LocalRecord } from '@/store/sqlite/SqliteRepository';
import type { Repository, SyncStatus } from '@/store/repository';
import type { SyncTransport } from './SyncClient';
import { SyncError } from './errors';

/**
 * What `SyncingRepository` needs from the local store: the whole `Repository`
 * surface plus the sync bookkeeping added in Phase 6. Stated structurally so
 * the cycle can be driven against an in-memory double in tests.
 */
export interface SyncableLocalRepository extends Repository {
  listDirty(limit: number): Promise<LocalRecord[]>;
  clearDirty(entries: Array<{ collection: string; id: string; updatedAt: number }>): Promise<void>;
  applyRemote(records: LocalRecord[]): Promise<number>;
  markAllDirty(): Promise<number>;
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
}

/**
 * The local repository plus a server round trip.
 *
 * ── Why every read still goes to the local store ──────────────────────────
 * Local is authoritative. Reads never await the network, so the app behaves
 * identically on a plane and in a datacentre, and a sync outage degrades to
 * "changes have not uploaded yet" rather than to a broken app. That is the
 * entire reason the repository interface was built with `updatedAt` and
 * `deletedAt` on every record back in Phase 1.
 *
 * Every non-sync member is delegated verbatim to the wrapped repository. This
 * class exists to add `sync`, not to change behaviour.
 */
export class SyncingRepository implements Repository {
  private inFlight: Promise<void> | null = null;

  constructor(
    private readonly local: SyncableLocalRepository,
    private readonly client: SyncTransport,
  ) {}

  /**
   * Delegation, as getters rather than field initialisers.
   *
   * `profile = this.local.profile` reads correctly and crashes at runtime:
   * class fields are initialised before constructor parameter properties are
   * assigned, so `this.local` is still undefined when they run. Getters defer
   * the read to call time, which is also what makes them correct.
   */
  get profile() {
    return this.local.profile;
  }
  get progress() {
    return this.local.progress;
  }
  get saved() {
    return this.local.saved;
  }
  get liked() {
    return this.local.liked;
  }
  get reports() {
    return this.local.reports;
  }
  get streak() {
    return this.local.streak;
  }
  get unlocks() {
    return this.local.unlocks;
  }

  reset = (): Promise<void> => this.local.reset();

  sync = {
    status: (): Promise<SyncStatus> => this.local.sync.status(),
    push: (): Promise<void> => this.run(),
    pull: (): Promise<void> => this.run(),
  };

  /* ---------------------------------------------------------------- *
   * Multi-device pairing
   * ---------------------------------------------------------------- */

  /** Issues a short code for another device to type in. */
  startLink() {
    return this.client.startLink();
  }

  listDevices() {
    return this.client.listDevices();
  }

  revokeDevice(deviceId: string) {
    return this.client.revokeDevice(deviceId);
  }

  /**
   * Joins the account that issued `code`.
   *
   * The three steps after a successful claim all matter:
   *
   * 1. **Reset the cursor.** It counts positions in the OLD account's change
   *    log and means nothing on the new one. Keeping it would skip most of
   *    the account's history and look like a partial sync.
   * 2. **Mark everything dirty.** The server moves the device, not its rows —
   *    deliberately, because the old account may still have other devices and
   *    moving rows would take their data from them. So this device
   *    re-contributes its own history. Skipping this looks exactly like
   *    joining an account wiped your progress.
   * 3. **Sync immediately**, so the merge is visible rather than waiting for
   *    whatever triggers the next cycle.
   */
  async joinAccount(code: string): Promise<void> {
    await this.client.claimLink(code);
    await this.adoptAccount(true);
  }

  /**
   * Signs in with a verified Apple credential and lands on the right account.
   *
   * Same operation as pairing, authenticated differently — which is why it
   * shares `adoptAccount`. The one difference is that the server decides
   * whether merging is safe: if this device just moved onto a *different
   * person's* account (a second person signing in on a shared phone),
   * contributing the local records would copy the first person's progress
   * into the second person's account.
   */
  async signInWithApple(identityToken: string, nonce: string): Promise<void> {
    const result = await this.client.signInWithApple(identityToken, nonce);
    await this.adoptAccount(result.merge);
  }

  /**
   * Resets the cursor and optionally re-contributes local records.
   *
   * The cursor always resets: it counts positions in the old account's change
   * log and means nothing on the new one, so keeping it would skip most of
   * the history and look like a partial sync.
   */
  private async adoptAccount(merge: boolean): Promise<void> {
    await this.local.setMeta('cursor', '0');
    if (merge) await this.local.markAllDirty();
    await this.run();
  }

  /**
   * One sync cycle: push what is dirty, apply what came back, advance the
   * cursor.
   *
   * Concurrent callers share one in-flight run. Two overlapping cycles would
   * both read the same dirty rows and push them twice — harmless for
   * correctness thanks to the server's last-write-wins, but it also lets both
   * clear the dirty flag against a cursor the other has already moved.
   */
  private run(): Promise<void> {
    this.inFlight ??= this.cycle().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async cycle(): Promise<void> {
    // Bounded so one enormous backlog cannot build a multi-megabyte request;
    // `hasMore` and the remaining dirty rows are picked up next cycle.
    const BATCH = 400;

    try {
      const cursor = Number(await this.local.getMeta('cursor')) || 0;
      const dirty = await this.local.listDirty(BATCH);

      const response = await this.client.sync(cursor, dirty);

      // Order matters. Apply the server's records BEFORE clearing dirty, so a
      // crash in between leaves records still marked dirty — they get pushed
      // again, which is idempotent. The reverse order could lose a write.
      await this.local.applyRemote(response.changes);
      await this.local.clearDirty(dirty);

      await this.local.setMeta('cursor', String(response.cursor));
      await this.local.setMeta('lastSyncedAt', String(Date.now()));
    } catch (error) {
      // Offline is the expected steady state on a phone, so it is not
      // escalated; the next cycle picks up where this one stopped because
      // nothing was marked clean. A rejected payload is a real bug and is
      // worth seeing in logs.
      if (error instanceof SyncError && error.kind === 'rejected') {
        console.warn('[sync] server rejected the request:', error.message);
      }
      throw error;
    }
  }
}
