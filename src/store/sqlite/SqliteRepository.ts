/**
 * SQLite-backed Repository.
 *
 * This exists partly to be better storage and partly as a test: swapping the
 * persistence engine should touch nothing outside `src/store/`. If any screen
 * or component needed editing to accommodate it, the boundary had leaked and
 * the "add cloud sync later" plan was already broken.
 *
 * Schema shape: one `records` table with the sync-critical fields promoted to
 * real, indexed columns (`collection`, `id`, `updated_at`, `deleted_at`) and
 * the rest of each record kept as a JSON payload. That is deliberate —
 * fully normalising seven small collections would be a lot of DDL for no gain,
 * while promoting exactly the columns a sync pass filters on
 * (`WHERE updated_at > ?`) is the thing AsyncStorage blobs could never do.
 */
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStrategy, listStrategies } from '@/content/registry';
import type { CardId, CourseId, EntityRef, LessonId, StrategyId } from '@/content/types';
import { isConsecutive, type DayISO } from '@/lib/dates';
import {
  progressId,
  reportId,
  savedCardId,
  type CardReport,
  type CardReportInput,
  type LessonProgress,
  type LikedItem,
  type ProfilePatch,
  type ProgressInput,
  type Repository,
  type SavedCard,
  type SavedCardInput,
  type StreakState,
  type SyncStatus,
  type Syncable,
  type UserProfile,
} from '../repository';

const DB_NAME = 'stockiq.db';

type Collection = 'profile' | 'progress' | 'saved' | 'liked' | 'reports' | 'streak';

/** Legacy AsyncStorage keys, read once during the one-time migration. */
const LEGACY_KEYS: Record<Collection, string> = {
  profile: 'stockiq:profile:v1',
  progress: 'stockiq:progress:v1',
  saved: 'stockiq:saved:v1',
  liked: 'stockiq:liked:v1',
  reports: 'stockiq:reports:v1',
  streak: 'stockiq:streak:v1',
};

const MIGRATED_FLAG = 'stockiq:migrated-to-sqlite:v1';
const ACTIVE_DAYS_WINDOW = 60;

interface Row {
  id: string;
  updated_at: number;
  deleted_at: number | null;
  payload: string;
}

/**
 * A record in transit between this store and the sync service. Identical in
 * shape to the row on both sides of the wire, so nothing has to be mapped.
 */
export interface LocalRecord {
  collection: string;
  id: string;
  updatedAt: number;
  deletedAt: number | null;
  payload: unknown;
}

const now = () => Date.now();

function defaultProfile(): UserProfile {
  return {
    id: 'profile',
    updatedAt: now(),
    deletedAt: null,
    totalXp: 0,
    selectedCourseId: null,
    hasSeenPlayerTutorial: false,
    disclaimerAcknowledgedAt: null,
  };
}

function defaultStreak(): StreakState {
  return {
    id: 'streak',
    updatedAt: now(),
    deletedAt: null,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDay: null,
    activeDays: [],
  };
}

export class SqliteRepository implements Repository {
  private db: SQLite.SQLiteDatabase | null = null;
  private opening: Promise<SQLite.SQLiteDatabase> | null = null;

  /** Opens once; concurrent callers share the same in-flight promise. */
  private async ready(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) return this.db;
    if (!this.opening) {
      this.opening = (async () => {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        await db.execAsync(`
          PRAGMA journal_mode = WAL;
          CREATE TABLE IF NOT EXISTS records (
            collection TEXT NOT NULL,
            id         TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            deleted_at INTEGER,
            payload    TEXT NOT NULL,
            dirty      INTEGER NOT NULL DEFAULT 1,
            PRIMARY KEY (collection, id)
          );
          CREATE INDEX IF NOT EXISTS records_sync
            ON records (collection, updated_at);
          CREATE INDEX IF NOT EXISTS records_dirty
            ON records (dirty);
          CREATE TABLE IF NOT EXISTS sync_meta (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
          );
        `);
        await this.addDirtyColumnIfMissing(db);
        this.db = db;
        await this.migrateFromAsyncStorage(db);
        return db;
      })();
    }
    return this.opening;
  }

  /**
   * One-time lift of any existing AsyncStorage data.
   *
   * Without this, upgrading the app would silently reset every learner's
   * progress — a storage swap should be invisible, not destructive. The flag
   * lives in AsyncStorage so a wiped database re-migrates rather than
   * double-migrating.
   */
  private async migrateFromAsyncStorage(db: SQLite.SQLiteDatabase): Promise<void> {
    try {
      if (await AsyncStorage.getItem(MIGRATED_FLAG)) return;

      const existing = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM records',
      );
      if ((existing?.count ?? 0) > 0) {
        await AsyncStorage.setItem(MIGRATED_FLAG, String(now()));
        return;
      }

      for (const [collection, key] of Object.entries(LEGACY_KEYS)) {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as unknown;

        // profile/streak are single objects; everything else is a map.
        const records: Syncable[] =
          collection === 'profile' || collection === 'streak'
            ? [parsed as Syncable]
            : Object.values(parsed as Record<string, Syncable>);

        for (const record of records) {
          if (!record?.id) continue;
          await this.put(db, collection as Collection, record);
        }
      }

      await AsyncStorage.setItem(MIGRATED_FLAG, String(now()));
    } catch {
      // A failed migration must not block the app from opening. Worst case
      // the learner starts fresh, which is what would have happened anyway.
    }
  }

  /**
   * Adds `dirty` to a database created before sync existed.
   *
   * Defaulting to 1 is the safe direction: every pre-existing record is
   * treated as unpushed, so the first sync uploads the learner's whole
   * history. Defaulting to 0 would mark it all as already-synced and their
   * existing progress would never reach the server.
   */
  private async addDirtyColumnIfMissing(db: SQLite.SQLiteDatabase): Promise<void> {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(records)');
    if (columns.some((c) => c.name === 'dirty')) return;
    await db.execAsync('ALTER TABLE records ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1');
  }

  /* -------------------------------------------------------------- *
   * Row helpers
   * -------------------------------------------------------------- */

  private async put<T extends Syncable>(
    db: SQLite.SQLiteDatabase,
    collection: Collection,
    record: T,
  ): Promise<T> {
    await db.runAsync(
      `INSERT INTO records (collection, id, updated_at, deleted_at, payload, dirty)
       VALUES (?, ?, ?, ?, ?, 1)
       ON CONFLICT(collection, id) DO UPDATE SET
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at,
         payload    = excluded.payload,
         dirty      = 1`,
      [collection, record.id, record.updatedAt, record.deletedAt, JSON.stringify(record)],
    );
    return record;
  }

  private async all<T extends Syncable>(collection: Collection): Promise<T[]> {
    const db = await this.ready();
    const rows = await db.getAllAsync<Row>(
      'SELECT * FROM records WHERE collection = ? AND deleted_at IS NULL',
      [collection],
    );
    return rows.map((row) => JSON.parse(row.payload) as T);
  }

  private async one<T extends Syncable>(
    collection: Collection,
    id: string,
  ): Promise<T | null> {
    const db = await this.ready();
    const row = await db.getFirstAsync<Row>(
      'SELECT * FROM records WHERE collection = ? AND id = ?',
      [collection, id],
    );
    return row ? (JSON.parse(row.payload) as T) : null;
  }

  private async save<T extends Syncable>(collection: Collection, record: T): Promise<T> {
    return this.put(await this.ready(), collection, record);
  }

  /* -------------------------------------------------------------- *
   * Profile
   * -------------------------------------------------------------- */

  profile = {
    get: async (): Promise<UserProfile> =>
      (await this.one<UserProfile>('profile', 'profile')) ?? defaultProfile(),

    update: async (patch: ProfilePatch): Promise<UserProfile> => {
      const current = await this.profile.get();
      return this.save('profile', { ...current, ...patch, updatedAt: now() });
    },
  };

  /* -------------------------------------------------------------- *
   * Progress
   * -------------------------------------------------------------- */

  progress = {
    get: async (courseId: CourseId, lessonId: LessonId): Promise<LessonProgress | null> => {
      const record = await this.one<LessonProgress>('progress', progressId(courseId, lessonId));
      return record && record.deletedAt === null ? record : null;
    },

    listByCourse: async (courseId: CourseId): Promise<LessonProgress[]> =>
      (await this.all<LessonProgress>('progress')).filter((p) => p.courseId === courseId),

    listAll: async (): Promise<LessonProgress[]> => this.all<LessonProgress>('progress'),

    upsert: async (input: ProgressInput): Promise<LessonProgress> => {
      const id = input.id ?? progressId(input.courseId, input.lessonId);
      const existing = await this.one<LessonProgress>('progress', id);

      return this.save('progress', {
        ...input,
        id,
        updatedAt: now(),
        deletedAt: null,
        // XP is minted once per lesson, ever.
        xpAwarded: Math.max(existing?.xpAwarded ?? 0, input.xpAwarded),
        completedAt: input.completedAt ?? existing?.completedAt ?? null,
        starred: input.starred || Boolean(existing?.starred),
      });
    },
  };

  /* -------------------------------------------------------------- *
   * Saved cards
   * -------------------------------------------------------------- */

  saved = {
    list: async (): Promise<SavedCard[]> =>
      (await this.all<SavedCard>('saved')).sort((a, b) => b.savedAt - a.savedAt),

    add: async (input: SavedCardInput): Promise<SavedCard> => {
      const id = savedCardId(input.courseId, input.lessonId, input.cardId);
      const existing = await this.one<SavedCard>('saved', id);
      const timestamp = now();
      return this.save('saved', {
        ...input,
        id,
        savedAt: existing?.savedAt ?? timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      });
    },

    remove: async (id: string): Promise<void> => {
      const existing = await this.one<SavedCard>('saved', id);
      if (!existing) return;
      // Soft delete, so the removal can propagate on the next sync.
      await this.save('saved', { ...existing, deletedAt: now(), updatedAt: now() });
    },

    isSaved: async (
      courseId: CourseId,
      lessonId: LessonId,
      cardId: CardId,
    ): Promise<boolean> => {
      const record = await this.one<SavedCard>('saved', savedCardId(courseId, lessonId, cardId));
      return Boolean(record && record.deletedAt === null);
    },
  };

  /* -------------------------------------------------------------- *
   * Likes
   * -------------------------------------------------------------- */

  liked = {
    list: async (): Promise<LikedItem[]> =>
      (await this.all<LikedItem>('liked')).sort((a, b) => b.likedAt - a.likedAt),

    toggle: async (ref: EntityRef): Promise<LikedItem> => {
      const existing = await this.one<LikedItem>('liked', ref);
      const timestamp = now();
      return this.save<LikedItem>('liked', existing
        ? { ...existing, deletedAt: existing.deletedAt === null ? timestamp : null, updatedAt: timestamp }
        : { id: ref, ref, likedAt: timestamp, updatedAt: timestamp, deletedAt: null });
    },
  };

  /* -------------------------------------------------------------- *
   * Reports
   * -------------------------------------------------------------- */

  reports = {
    list: async (): Promise<CardReport[]> =>
      (await this.all<CardReport>('reports')).sort((a, b) => b.reportedAt - a.reportedAt),

    add: async (input: CardReportInput): Promise<CardReport> => {
      const timestamp = now();
      return this.save('reports', {
        ...input,
        id: reportId(input.courseId, input.lessonId, input.cardId),
        reportedAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      });
    },

    isReported: async (
      courseId: CourseId,
      lessonId: LessonId,
      cardId: CardId,
    ): Promise<boolean> => {
      const record = await this.one<CardReport>(
        'reports',
        reportId(courseId, lessonId, cardId),
      );
      return Boolean(record && record.deletedAt === null);
    },
  };

  /* -------------------------------------------------------------- *
   * Streak
   * -------------------------------------------------------------- */

  streak = {
    get: async (): Promise<StreakState> =>
      (await this.one<StreakState>('streak', 'streak')) ?? defaultStreak(),

    recordActivity: async (dayISO: DayISO): Promise<StreakState> => {
      const current = await this.streak.get();
      // Idempotent per day: a second lesson today must not extend the streak.
      if (current.lastActiveDay === dayISO) return current;

      const continued = current.lastActiveDay
        ? isConsecutive(current.lastActiveDay, dayISO)
        : false;
      const currentStreak = continued ? current.currentStreak + 1 : 1;

      return this.save('streak', {
        ...current,
        currentStreak,
        longestStreak: Math.max(current.longestStreak, currentStreak),
        lastActiveDay: dayISO,
        activeDays: [...new Set([...current.activeDays, dayISO])].sort().slice(-ACTIVE_DAYS_WINDOW),
        updatedAt: now(),
      });
    },
  };

  /* -------------------------------------------------------------- *
   * Unlocks
   * -------------------------------------------------------------- */

  unlocks = {
    isStrategyUnlocked: async (id: StrategyId): Promise<boolean> => {
      const strategy = getStrategy(id);
      if (!strategy) return false;
      const completed = await this.completedLessonPaths();
      return strategy.prerequisiteLessons.every((path) => completed.has(path));
    },

    listUnlockedStrategies: async (): Promise<StrategyId[]> => {
      const completed = await this.completedLessonPaths();
      return listStrategies()
        .filter((s) => s.prerequisiteLessons.every((path) => completed.has(path)))
        .map((s) => s.id);
    },
  };

  private async completedLessonPaths(): Promise<Set<string>> {
    const all = await this.progress.listAll();
    return new Set(
      all.filter((p) => p.status === 'completed').map((p) => `${p.courseId}/${p.lessonId}`),
    );
  }

  /* -------------------------------------------------------------- *
   * Sync — inert in v1, but the query it will need already exists
   * -------------------------------------------------------------- */

  sync = {
    status: async (): Promise<SyncStatus> => {
      const db = await this.ready();
      const row = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM records WHERE dirty = 1',
      );
      return {
        lastSyncedAt: Number(await this.getMeta('lastSyncedAt')) || null,
        pending: row?.count ?? 0,
      };
    },
    // Still no-ops here. SqliteRepository is the LOCAL store; talking to a
    // server is SyncingRepository's job, and keeping that out of this class
    // is what lets the app run entirely offline with this one alone.
    push: async (): Promise<void> => {},
    pull: async (): Promise<void> => {},
  };

  /* -------------------------------------------------------------- *
   * Sync surface — used by SyncingRepository, not by the app
   * -------------------------------------------------------------- */

  /** Records written locally and not yet acknowledged by the server. */
  async listDirty(limit: number): Promise<LocalRecord[]> {
    const db = await this.ready();
    const rows = await db.getAllAsync<Row & { collection: string }>(
      `SELECT collection, id, updated_at, deleted_at, payload
         FROM records WHERE dirty = 1
        ORDER BY updated_at LIMIT ?`,
      [limit],
    );
    return rows.map((row) => ({
      collection: row.collection,
      id: row.id,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      payload: JSON.parse(row.payload) as unknown,
    }));
  }

  /**
   * Marks pushed records clean — but only if they have not changed since.
   *
   * The `updated_at = ?` guard is the whole point. A learner can complete a
   * card while the push is in flight; that write bumps `updated_at` and sets
   * dirty again. Clearing unconditionally would wipe the flag on a version
   * the server never received, and that edit would never be pushed by any
   * later sync — a silent, permanent loss of exactly the data sync exists to
   * protect.
   */
  async clearDirty(entries: Array<{ collection: string; id: string; updatedAt: number }>): Promise<void> {
    if (!entries.length) return;
    const db = await this.ready();
    await db.withTransactionAsync(async () => {
      for (const entry of entries) {
        await db.runAsync(
          `UPDATE records SET dirty = 0
            WHERE collection = ? AND id = ? AND updated_at = ?`,
          [entry.collection, entry.id, entry.updatedAt],
        );
      }
    });
  }

  /**
   * Applies records pulled from the server, last-write-wins.
   *
   * Applied rows land with `dirty = 0`: they came FROM the server, so pushing
   * them straight back would be an echo. The `WHERE updated_at <` guard means
   * a stale server copy never clobbers a newer local edit that has not been
   * pushed yet.
   */
  async applyRemote(records: LocalRecord[]): Promise<number> {
    if (!records.length) return 0;
    const db = await this.ready();
    let applied = 0;
    await db.withTransactionAsync(async () => {
      for (const record of records) {
        const result = await db.runAsync(
          `INSERT INTO records (collection, id, updated_at, deleted_at, payload, dirty)
           VALUES (?, ?, ?, ?, ?, 0)
           ON CONFLICT(collection, id) DO UPDATE SET
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at,
             payload    = excluded.payload,
             dirty      = 0
           WHERE records.updated_at < excluded.updated_at`,
          [
            record.collection,
            record.id,
            record.updatedAt,
            record.deletedAt,
            JSON.stringify(record.payload),
          ],
        );
        applied += result.changes;
      }
    });
    return applied;
  }

  /**
   * Marks every record unpushed.
   *
   * Used after joining another device's account. The account switch moves the
   * DEVICE, not its rows — the server deliberately leaves them on the old
   * account, which may still have other devices attached. So this device
   * re-contributes its own history by pushing everything again. Without it,
   * joining an account would look like it silently erased your progress.
   */
  async markAllDirty(): Promise<number> {
    const db = await this.ready();
    const result = await db.runAsync('UPDATE records SET dirty = 1');
    return result.changes;
  }

  async getMeta(key: string): Promise<string | null> {
    const db = await this.ready();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM sync_meta WHERE key = ?',
      [key],
    );
    return row?.value ?? null;
  }

  async setMeta(key: string, value: string): Promise<void> {
    const db = await this.ready();
    await db.runAsync(
      `INSERT INTO sync_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
    );
  }

  async reset(): Promise<void> {
    const db = await this.ready();
    await db.runAsync('DELETE FROM records');
    await db.runAsync('DELETE FROM sync_meta');
  }
}
