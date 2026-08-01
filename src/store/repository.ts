/**
 * The persistence boundary.
 *
 * Every UI component and every Zustand store depends on THIS interface and
 * never on a storage library. That single rule is what turns "add cloud
 * sync" from a rewrite into a bolt-on:
 *
 *     v1     new LocalRepository()
 *     later  new SyncingRepository(new LocalRepository(), new SupabaseRepository())
 *
 * Two design decisions here exist purely to buy that future cheaply:
 *
 *   1. Every persisted record extends `Syncable` — id, updatedAt, deletedAt.
 *      Writes stamp updatedAt; deletes are soft. That gives last-write-wins
 *      merge semantics and propagating deletions for free the day a server
 *      appears. Retrofitting timestamps onto an existing local store is the
 *      genuinely expensive part of adding sync; here it costs one field.
 *
 *   2. Every method is async even though the v1 implementation is
 *      effectively synchronous, so a network-backed implementation drops in
 *      without changing a single call site.
 *
 * Unlock logic lives here rather than in the UI so a server can later
 * compute it authoritatively behind the same signature.
 */
import type {
  CardId,
  CourseId,
  EntityRef,
  LessonId,
  StrategyId,
} from '@/content/types';

export interface Syncable {
  id: string;
  /** Epoch ms of the last write. The merge key when sync arrives. */
  updatedAt: number;
  /** Soft delete, so a deletion can propagate rather than vanish silently. */
  deletedAt: number | null;
}

export type LessonStatus = 'not_started' | 'in_progress' | 'completed';

export interface CardAttempt {
  cardId: CardId;
  correct: boolean;
  at: number;
}

export interface LessonProgress extends Syncable {
  courseId: CourseId;
  lessonId: LessonId;
  status: LessonStatus;
  /** Where to resume; also drives the path node's partial-progress ring. */
  lastCardIndex: number;
  /** True when the learner answered every interactive card correctly first try. */
  starred: boolean;
  xpAwarded: number;
  completedAt: number | null;
  attempts: CardAttempt[];
}

export interface SavedCard extends Syncable {
  courseId: CourseId;
  lessonId: LessonId;
  cardId: CardId;
  savedAt: number;
}

export interface LikedItem extends Syncable {
  ref: EntityRef;
  likedAt: number;
}

export const REPORT_REASONS = [
  'factually-wrong',
  'confusing',
  'looks-broken',
  'feels-like-advice',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/**
 * A learner flagging a problem with a card.
 *
 * Stored rather than fired-and-forgotten because there is no server yet: the
 * report queues locally and rides the same sync path as everything else when
 * one arrives. `feels-like-advice` is a first-class reason on purpose — for a
 * finance app that is the report that most needs to reach a human.
 */
export interface CardReport extends Syncable {
  courseId: CourseId;
  lessonId: LessonId;
  cardId: CardId;
  reason: ReportReason;
  note?: string;
  reportedAt: number;
}

export type CardReportInput = Omit<CardReport, keyof Syncable | 'reportedAt'>;

export interface StreakState extends Syncable {
  currentStreak: number;
  longestStreak: number;
  /** 'YYYY-MM-DD' in device-local time. */
  lastActiveDay: string | null;
  /** Trailing active days, newest last, for the flame row. */
  activeDays: string[];
}

export interface UserProfile extends Syncable {
  totalXp: number;
  selectedCourseId: CourseId | null;
  hasSeenPlayerTutorial: boolean;
  /** Timestamped acknowledgement of the "not financial advice" disclaimer. */
  disclaimerAcknowledgedAt: number | null;
  /** Automatically read lesson cards aloud when a rendered clip is available. */
  narrationEnabled: boolean;
  /** User-facing choice; vendor voice names stay out of persisted data. */
  narrationVoice: 'male' | 'female';
  /** Cross-platform playback rates supported by the narration UI. */
  narrationSpeed: 0.75 | 1 | 1.25 | 1.5;
}

export type ProfilePatch = Partial<Omit<UserProfile, keyof Syncable>>;
export type ProgressInput = Omit<LessonProgress, keyof Syncable> & { id?: string };
export type SavedCardInput = Omit<SavedCard, keyof Syncable | 'savedAt'>;

export interface SyncStatus {
  lastSyncedAt: number | null;
  pending: number;
}

export interface Repository {
  profile: {
    get(): Promise<UserProfile>;
    update(patch: ProfilePatch): Promise<UserProfile>;
  };

  progress: {
    get(courseId: CourseId, lessonId: LessonId): Promise<LessonProgress | null>;
    listByCourse(courseId: CourseId): Promise<LessonProgress[]>;
    listAll(): Promise<LessonProgress[]>;
    upsert(input: ProgressInput): Promise<LessonProgress>;
  };

  saved: {
    list(): Promise<SavedCard[]>;
    add(input: SavedCardInput): Promise<SavedCard>;
    remove(id: string): Promise<void>;
    isSaved(courseId: CourseId, lessonId: LessonId, cardId: CardId): Promise<boolean>;
  };

  liked: {
    list(): Promise<LikedItem[]>;
    toggle(ref: EntityRef): Promise<LikedItem>;
  };

  reports: {
    list(): Promise<CardReport[]>;
    add(input: CardReportInput): Promise<CardReport>;
    isReported(courseId: CourseId, lessonId: LessonId, cardId: CardId): Promise<boolean>;
  };

  streak: {
    get(): Promise<StreakState>;
    /** Idempotent per day — calling twice on the same date is a no-op. */
    recordActivity(dayISO: string): Promise<StreakState>;
  };

  unlocks: {
    isStrategyUnlocked(id: StrategyId): Promise<boolean>;
    listUnlockedStrategies(): Promise<StrategyId[]>;
  };

  /**
   * No-ops in v1. Present so that callers are written against the final
   * shape from the start rather than being retrofitted later.
   */
  sync: {
    status(): Promise<SyncStatus>;
    push(): Promise<void>;
    pull(): Promise<void>;
  };

  /** Wipes local state. Used by the reset affordance in settings. */
  reset(): Promise<void>;
}

/* ------------------------------------------------------------------ *
 * Helpers shared by every implementation
 * ------------------------------------------------------------------ */

export const progressId = (courseId: CourseId, lessonId: LessonId): string =>
  `${courseId}/${lessonId}`;

export const savedCardId = (
  courseId: CourseId,
  lessonId: LessonId,
  cardId: CardId,
): string => `${courseId}/${lessonId}#${cardId}`;

/** Reports share the card-coordinate key shape so one card reports once. */
export const reportId = savedCardId;

/** Stamps a record as written now. The one place updatedAt is set. */
export function touch<T extends Syncable>(record: Omit<T, 'updatedAt'> & { updatedAt?: number }): T {
  return { ...record, updatedAt: Date.now() } as T;
}

/** Live records only — soft-deleted rows stay on disk for sync. */
export const isLive = <T extends Syncable>(record: T): boolean => record.deletedAt === null;

/**
 * Applies fields introduced after the first profile schema shipped.
 *
 * Profiles are JSON payloads locally and over sync, so an older device can
 * legitimately hand us a record without newer fields. Normalising at the
 * repository boundary keeps every consumer on the current shape without
 * rewriting an otherwise unchanged profile merely because the app launched.
 */
export function withProfileDefaults(profile: UserProfile): UserProfile {
  return {
    ...profile,
    narrationEnabled: profile.narrationEnabled ?? false,
    narrationVoice: profile.narrationVoice ?? 'female',
    narrationSpeed: profile.narrationSpeed ?? 1,
  };
}
