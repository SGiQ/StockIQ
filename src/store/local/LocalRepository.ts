/**
 * AsyncStorage-backed Repository.
 *
 * AsyncStorage rather than MMKV deliberately: MMKV is a native module and
 * does not run in Expo Go, which would block the "runs on the phone today"
 * goal. The Repository interface is exactly what makes that a reversible
 * decision — swapping in expo-sqlite later touches only this folder, and
 * that swap is the test that proves the boundary never leaked.
 *
 * The whole dataset is small (a few hundred rows at most), so each
 * collection is kept as one JSON blob under a single key and held in an
 * in-memory cache after first read. Writes are write-through.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStrategy } from '@/content/registry';
import type { LocalRecord } from '../sqlite/SqliteRepository';
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
  type Syncable,
  type SyncStatus,
  type UserProfile,
  withProfileDefaults,
} from '../repository';

const KEYS = {
  profile: 'stockiq:profile:v1',
  progress: 'stockiq:progress:v1',
  saved: 'stockiq:saved:v1',
  liked: 'stockiq:liked:v1',
  reports: 'stockiq:reports:v1',
  streak: 'stockiq:streak:v1',
  /** Sync bookkeeping — see the note above `syncedStamps`. */
  synced: 'stockiq:synced:v1',
  meta: 'stockiq:syncmeta:v1',
} as const;

/**
 * Collection names are IDENTICAL to SqliteRepository's on purpose. A record
 * pushed from the web build and one pushed from the phone have to land in the
 * same server-side collection, or the same lesson would sync as two records.
 */
type Collection = 'profile' | 'progress' | 'saved' | 'liked' | 'reports' | 'streak';

/** Collections holding one object; the rest are id-keyed maps. */
const SINGLETONS: Partial<Record<Collection, string>> = { profile: 'profile', streak: 'streak' };

const COLLECTION_KEYS: Record<Collection, string> = {
  profile: KEYS.profile,
  progress: KEYS.progress,
  saved: KEYS.saved,
  liked: KEYS.liked,
  reports: KEYS.reports,
  streak: KEYS.streak,
};

/** Trailing window retained for the streak row; older days are pruned. */
const ACTIVE_DAYS_WINDOW = 60;

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
    narrationEnabled: false,
    narrationVoice: 'female',
    narrationSpeed: 1,
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

export class LocalRepository implements Repository {
  private cache = new Map<string, unknown>();

  /* -------------------------------------------------------------- *
   * Storage plumbing
   * -------------------------------------------------------------- */

  private async read<T>(key: string, fallback: () => T): Promise<T> {
    if (this.cache.has(key)) return this.cache.get(key) as T;
    try {
      const raw = await AsyncStorage.getItem(key);
      const value = raw ? (JSON.parse(raw) as T) : fallback();
      this.cache.set(key, value);
      return value;
    } catch {
      // Corrupt or unreadable storage should degrade to a fresh start
      // rather than wedging the app on launch.
      const value = fallback();
      this.cache.set(key, value);
      return value;
    }
  }

  private async write<T>(key: string, value: T): Promise<T> {
    this.cache.set(key, value);
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  /* -------------------------------------------------------------- *
   * Profile
   * -------------------------------------------------------------- */

  profile = {
    get: async (): Promise<UserProfile> =>
      withProfileDefaults(await this.read(KEYS.profile, defaultProfile)),

    update: async (patch: ProfilePatch): Promise<UserProfile> => {
      const current = await this.profile.get();
      return this.write(KEYS.profile, { ...current, ...patch, updatedAt: now() });
    },
  };

  /* -------------------------------------------------------------- *
   * Progress
   * -------------------------------------------------------------- */

  private async allProgress(): Promise<Record<string, LessonProgress>> {
    return this.read<Record<string, LessonProgress>>(KEYS.progress, () => ({}));
  }

  progress = {
    get: async (courseId: CourseId, lessonId: LessonId): Promise<LessonProgress | null> => {
      const all = await this.allProgress();
      const record = all[progressId(courseId, lessonId)];
      return record && record.deletedAt === null ? record : null;
    },

    listByCourse: async (courseId: CourseId): Promise<LessonProgress[]> => {
      const all = await this.allProgress();
      return Object.values(all).filter((p) => p.deletedAt === null && p.courseId === courseId);
    },

    listAll: async (): Promise<LessonProgress[]> => {
      const all = await this.allProgress();
      return Object.values(all).filter((p) => p.deletedAt === null);
    },

    upsert: async (input: ProgressInput): Promise<LessonProgress> => {
      const all = await this.allProgress();
      const id = input.id ?? progressId(input.courseId, input.lessonId);
      const existing = all[id];

      const record: LessonProgress = {
        ...input,
        id,
        updatedAt: now(),
        deletedAt: null,
        // XP is awarded once per lesson, ever. Replaying a completed lesson
        // must not mint more, so the stored value wins if it is higher.
        xpAwarded: Math.max(existing?.xpAwarded ?? 0, input.xpAwarded),
        completedAt: input.completedAt ?? existing?.completedAt ?? null,
        starred: input.starred || Boolean(existing?.starred),
      };

      await this.write(KEYS.progress, { ...all, [id]: record });
      return record;
    },
  };

  /* -------------------------------------------------------------- *
   * Saved cards
   * -------------------------------------------------------------- */

  private async allSaved(): Promise<Record<string, SavedCard>> {
    return this.read<Record<string, SavedCard>>(KEYS.saved, () => ({}));
  }

  saved = {
    list: async (): Promise<SavedCard[]> => {
      const all = await this.allSaved();
      return Object.values(all)
        .filter((c) => c.deletedAt === null)
        .sort((a, b) => b.savedAt - a.savedAt);
    },

    add: async (input: SavedCardInput): Promise<SavedCard> => {
      const all = await this.allSaved();
      const id = savedCardId(input.courseId, input.lessonId, input.cardId);
      const timestamp = now();
      // Re-saving a previously removed card revives the same row so the
      // soft-delete tombstone does not resurrect it on the next sync pull.
      const record: SavedCard = {
        ...input,
        id,
        savedAt: all[id]?.savedAt ?? timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      };
      await this.write(KEYS.saved, { ...all, [id]: record });
      return record;
    },

    remove: async (id: string): Promise<void> => {
      const all = await this.allSaved();
      const existing = all[id];
      if (!existing) return;
      await this.write(KEYS.saved, {
        ...all,
        [id]: { ...existing, deletedAt: now(), updatedAt: now() },
      });
    },

    isSaved: async (
      courseId: CourseId,
      lessonId: LessonId,
      cardId: CardId,
    ): Promise<boolean> => {
      const all = await this.allSaved();
      const record = all[savedCardId(courseId, lessonId, cardId)];
      return Boolean(record && record.deletedAt === null);
    },
  };

  /* -------------------------------------------------------------- *
   * Likes
   * -------------------------------------------------------------- */

  private async allLiked(): Promise<Record<string, LikedItem>> {
    return this.read<Record<string, LikedItem>>(KEYS.liked, () => ({}));
  }

  liked = {
    list: async (): Promise<LikedItem[]> => {
      const all = await this.allLiked();
      return Object.values(all)
        .filter((l) => l.deletedAt === null)
        .sort((a, b) => b.likedAt - a.likedAt);
    },

    toggle: async (ref: EntityRef): Promise<LikedItem> => {
      const all = await this.allLiked();
      const existing = all[ref];
      const timestamp = now();
      const record: LikedItem = existing
        ? { ...existing, deletedAt: existing.deletedAt === null ? timestamp : null, updatedAt: timestamp }
        : { id: ref, ref, likedAt: timestamp, updatedAt: timestamp, deletedAt: null };
      await this.write(KEYS.liked, { ...all, [ref]: record });
      return record;
    },
  };

  /* -------------------------------------------------------------- *
   * Reports
   * -------------------------------------------------------------- */

  private async allReports(): Promise<Record<string, CardReport>> {
    return this.read<Record<string, CardReport>>(KEYS.reports, () => ({}));
  }

  reports = {
    list: async (): Promise<CardReport[]> => {
      const all = await this.allReports();
      return Object.values(all)
        .filter((r) => r.deletedAt === null)
        .sort((a, b) => b.reportedAt - a.reportedAt);
    },

    add: async (input: CardReportInput): Promise<CardReport> => {
      const all = await this.allReports();
      const id = reportId(input.courseId, input.lessonId, input.cardId);
      const timestamp = now();
      // Re-reporting the same card overwrites rather than piling up — the
      // signal is "this card has a problem", not how many times it was tapped.
      const record: CardReport = {
        ...input,
        id,
        reportedAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      };
      await this.write(KEYS.reports, { ...all, [id]: record });
      return record;
    },

    isReported: async (
      courseId: CourseId,
      lessonId: LessonId,
      cardId: CardId,
    ): Promise<boolean> => {
      const all = await this.allReports();
      const record = all[reportId(courseId, lessonId, cardId)];
      return Boolean(record && record.deletedAt === null);
    },
  };

  /* -------------------------------------------------------------- *
   * Streak
   * -------------------------------------------------------------- */

  streak = {
    get: async (): Promise<StreakState> => this.read(KEYS.streak, defaultStreak),

    recordActivity: async (dayISO: DayISO): Promise<StreakState> => {
      const current = await this.read(KEYS.streak, defaultStreak);

      // Idempotent: finishing a second lesson today must not extend a streak.
      if (current.lastActiveDay === dayISO) return current;

      const continued = current.lastActiveDay
        ? isConsecutive(current.lastActiveDay, dayISO)
        : false;
      const currentStreak = continued ? current.currentStreak + 1 : 1;

      const activeDays = [...new Set([...current.activeDays, dayISO])]
        .sort()
        .slice(-ACTIVE_DAYS_WINDOW);

      return this.write(KEYS.streak, {
        ...current,
        currentStreak,
        longestStreak: Math.max(current.longestStreak, currentStreak),
        lastActiveDay: dayISO,
        activeDays,
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
      const { listStrategies } = await import('@/content/registry');
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
   * Sync surface
   *
   * Mirrors SqliteRepository's, so SyncingRepository wraps either one. This
   * is what lets the browser exercise sync, pairing and email sign-in
   * against the real service — previously web was local-only and the entire
   * client half of sync could only be tested on a phone.
   * -------------------------------------------------------------- */

  /**
   * Records the `updatedAt` each record had when it was last acknowledged.
   *
   * SqliteRepository sets a `dirty` column on every write. That is not
   * possible here without touching every write path, because AsyncStorage
   * stores whole collections rather than rows — so dirtiness is DERIVED
   * instead: a record is dirty when its current `updatedAt` differs from the
   * stamp recorded at its last successful push.
   *
   * The comparison is `!==`, not `>`. A record edited on another device and
   * pulled in gets a stamp written at apply time, so equality alone means
   * "the server has this exact version". Using `>` would leave a record
   * looking clean if its clock ever went backwards.
   */
  private async syncedStamps(): Promise<Record<string, number>> {
    return this.read<Record<string, number>>(KEYS.synced, () => ({}));
  }

  private stampKey = (collection: string, id: string) => `${collection}#${id}`;

  /** Every record across every collection, in the shared wire shape. */
  private async allRecords(): Promise<LocalRecord[]> {
    const out: LocalRecord[] = [];
    for (const collection of Object.keys(COLLECTION_KEYS) as Collection[]) {
      const raw = await this.read<unknown>(COLLECTION_KEYS[collection], () => null);
      if (!raw) continue;

      const records = SINGLETONS[collection]
        ? [raw as Syncable]
        : (Object.values(raw as Record<string, Syncable>) as Syncable[]);

      for (const record of records) {
        if (!record?.id) continue;
        out.push({
          collection,
          id: record.id,
          updatedAt: record.updatedAt,
          deletedAt: record.deletedAt ?? null,
          payload: record,
        });
      }
    }
    return out;
  }

  async listDirty(limit: number): Promise<LocalRecord[]> {
    const stamps = await this.syncedStamps();
    return (await this.allRecords())
      .filter((r) => stamps[this.stampKey(r.collection, r.id)] !== r.updatedAt)
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .slice(0, limit);
  }

  /**
   * Only stamps records whose `updatedAt` still matches what was pushed.
   *
   * Same guard as the SQL `WHERE updated_at = ?`: an edit made while the push
   * was in flight must stay dirty, or that version would never be sent and
   * would be silently lost.
   */
  async clearDirty(
    entries: Array<{ collection: string; id: string; updatedAt: number }>,
  ): Promise<void> {
    if (!entries.length) return;
    const stamps = { ...(await this.syncedStamps()) };
    const current = new Map(
      (await this.allRecords()).map((r) => [this.stampKey(r.collection, r.id), r.updatedAt]),
    );

    for (const entry of entries) {
      const key = this.stampKey(entry.collection, entry.id);
      if (current.get(key) === entry.updatedAt) stamps[key] = entry.updatedAt;
    }
    await this.write(KEYS.synced, stamps);
  }

  /** Last-write-wins, matching the `WHERE updated_at < excluded` guard. */
  async applyRemote(records: LocalRecord[]): Promise<number> {
    if (!records.length) return 0;
    const stamps = { ...(await this.syncedStamps()) };
    let applied = 0;

    // Grouped so each collection is read and written once rather than per
    // record — these are whole-blob writes, so per-record would be O(n²).
    const byCollection = new Map<Collection, LocalRecord[]>();
    for (const record of records) {
      const collection = record.collection as Collection;
      if (!(collection in COLLECTION_KEYS)) continue;
      byCollection.set(collection, [...(byCollection.get(collection) ?? []), record]);
    }

    for (const [collection, incoming] of byCollection) {
      const key = COLLECTION_KEYS[collection];
      const singleton = SINGLETONS[collection];

      if (singleton) {
        const current = await this.read<Syncable | null>(key, () => null);
        const next = incoming[incoming.length - 1]!;
        if (!current || current.updatedAt < next.updatedAt) {
          await this.write(key, next.payload);
          stamps[this.stampKey(collection, next.id)] = next.updatedAt;
          applied += 1;
        }
        continue;
      }

      const map = { ...(await this.read<Record<string, Syncable>>(key, () => ({}))) };
      let changed = false;
      for (const record of incoming) {
        const existing = map[record.id];
        if (existing && existing.updatedAt >= record.updatedAt) continue;
        map[record.id] = record.payload as Syncable;
        stamps[this.stampKey(collection, record.id)] = record.updatedAt;
        changed = true;
        applied += 1;
      }
      if (changed) await this.write(key, map);
    }

    await this.write(KEYS.synced, stamps);
    return applied;
  }

  /** Forgets every stamp, so the next push re-contributes everything. */
  async markAllDirty(): Promise<number> {
    const count = (await this.allRecords()).length;
    await this.write(KEYS.synced, {});
    return count;
  }

  async getMeta(key: string): Promise<string | null> {
    const meta = await this.read<Record<string, string>>(KEYS.meta, () => ({}));
    return meta[key] ?? null;
  }

  async setMeta(key: string, value: string): Promise<void> {
    const meta = { ...(await this.read<Record<string, string>>(KEYS.meta, () => ({}))) };
    meta[key] = value;
    await this.write(KEYS.meta, meta);
  }

  sync = {
    status: async (): Promise<SyncStatus> => ({
      lastSyncedAt: Number(await this.getMeta('lastSyncedAt')) || null,
      pending: (await this.listDirty(Number.MAX_SAFE_INTEGER)).length,
    }),
    // No-ops here for the same reason as SqliteRepository: this is the LOCAL
    // store. Talking to a server is SyncingRepository's job.
    push: async (): Promise<void> => {},
    pull: async (): Promise<void> => {},
  };

  async reset(): Promise<void> {
    this.cache.clear();
    await AsyncStorage.multiRemove(Object.values(KEYS));
  }
}
