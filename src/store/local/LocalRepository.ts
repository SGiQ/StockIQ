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
  type UserProfile,
} from '../repository';

const KEYS = {
  profile: 'stockiq:profile:v1',
  progress: 'stockiq:progress:v1',
  saved: 'stockiq:saved:v1',
  liked: 'stockiq:liked:v1',
  reports: 'stockiq:reports:v1',
  streak: 'stockiq:streak:v1',
} as const;

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
    get: async (): Promise<UserProfile> => this.read(KEYS.profile, defaultProfile),

    update: async (patch: ProfilePatch): Promise<UserProfile> => {
      const current = await this.read(KEYS.profile, defaultProfile);
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
   * Sync — intentionally inert in v1
   * -------------------------------------------------------------- */

  sync = {
    status: async (): Promise<SyncStatus> => ({ lastSyncedAt: null, pending: 0 }),
    push: async (): Promise<void> => {},
    pull: async (): Promise<void> => {},
  };

  async reset(): Promise<void> {
    this.cache.clear();
    await AsyncStorage.multiRemove(Object.values(KEYS));
  }
}
