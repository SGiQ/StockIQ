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
import { daysBetween } from '@/lib/dates';
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
  /**
   * Streak freezes in hand. A missed day is bridged by one freeze rather than
   * resetting the streak. Bought with gems; may be missing on older rows, so
   * always read through a default of 0.
   */
  freezes: number;
}

/**
 * Hearts — the free-tier friction lever.
 *
 * A singleton row like the streak. Only the count and the timestamp it was
 * accurate as of are stored; how many have since regenerated is DERIVED (see
 * `src/features/hearts`), so there is no timer to persist. Like the streak this
 * is a genuinely stateful counter — it cannot be re-derived from per-item rows,
 * so it lives on its own row rather than on the profile, keeping it clear of
 * the last-write-wins clobbering that a total on the profile singleton invites.
 */
export interface HeartsState extends Syncable {
  /** Hearts remaining as of `since`; regeneration since then is computed. */
  hearts: number;
  /** Epoch ms the stored `hearts` count is accurate as of; the regen anchor. */
  since: number;
}

/** The mutable half of a hearts record; the store hands this to the repo. */
export type HeartsValue = Pick<HeartsState, 'hearts' | 'since'>;

/**
 * Gems — the earn-and-spend currency.
 *
 * A singleton counter like the streak: genuinely stateful (a balance that both
 * grows and shrinks), so it cannot be re-derived from per-item rows and lives
 * on its own row. Same last-write-wins profile as the streak and hearts; a
 * future ledger (per-earn / per-spend rows) could make it clobber-proof, but at
 * this scale the singleton matches the rest.
 */
export interface GemsState extends Syncable {
  balance: number;
}

export type GemsValue = Pick<GemsState, 'balance'>;

/** Subscription tiers. `free` is the default; the paid tiers unlock capabilities. */
export type PlanId = 'free' | 'pro' | 'elite';
export type EntitlementStatus = 'none' | 'trialing' | 'active' | 'expired';

/**
 * The account's subscription entitlement.
 *
 * SERVER-AUTHORED, client-read-only. When billing lands, a Stripe webhook
 * writes this row on the account and it arrives on every device through the
 * ordinary sync pull. The client never writes it, so it is never marked dirty,
 * never pushed, and can never last-write-wins-clobber the server's copy — the
 * failure mode [[profile-singleton-lww-sync]] warns about, avoided by keeping
 * the writer on one side. Until Stripe exists this row simply never appears and
 * `get()` returns the free default (which is likewise never persisted, so it
 * contributes nothing to sync).
 */
export interface EntitlementState extends Syncable {
  plan: PlanId;
  status: EntitlementStatus;
  /** Epoch ms the paid period ends; null for none or an open-ended trial. */
  currentPeriodEnd: number | null;
  /** Who granted it. `stripe` once billing is wired; `trial` for a reverse trial. */
  source: 'none' | 'stripe' | 'trial';
}

/** Where the learner places themselves in onboarding; personalises the start. */
export type ExperienceLevel = 'new' | 'some' | 'active';
/** What the learner is here to do; personalises tone and the recommended course. */
export type LearningGoal = 'invest' | 'trade' | 'understand';

export interface UserProfile extends Syncable {
  totalXp: number;
  selectedCourseId: CourseId | null;
  hasSeenPlayerTutorial: boolean;
  /** Timestamped acknowledgement of the "not financial advice" disclaimer. */
  disclaimerAcknowledgedAt: number | null;
  /** Self-reported starting point, captured in onboarding. Null until answered. */
  experienceLevel: ExperienceLevel | null;
  /**
   * The first of the selected goals, kept for anything that wants a single
   * primary. Null until answered. `learningGoals` holds the full multi-select.
   */
  primaryGoal: LearningGoal | null;
  /** Every goal the learner picked in onboarding (multi-select). */
  learningGoals: LearningGoal[];
  /**
   * Chosen daily-time commitment in minutes; null until answered. Front-loads
   * commitment and feeds the streak and future reminders.
   */
  dailyGoalMinutes: number | null;
  /**
   * Daily quests already paid out, as `YYYY-MM-DD#questId` keys. The only piece
   * of the daily loop that must be stored — everything else is derived — so a
   * quest reward is granted at most once. Pruned to recent days on write.
   */
  questClaims: string[];
  /**
   * `publishedOn` of the newest This Week note the learner has seen. Drives the
   * "new" badge: a note newer than this is unseen. Null until they open the feed.
   */
  lastSeenWeeklyNoteDate: string | null;
  /** 'YYYY-MM-DD' the advisor day-counter is for; null until first ask. */
  askDay: string | null;
  /** Advisor questions asked on `askDay`; resets when the day rolls over. */
  askCount: number;
  /**
   * Best Market Readiness assessment result, 0..1. Null until first taken.
   * "Best of", not "latest", so a shaky retake never lowers a proven score.
   */
  assessmentBestScore: number | null;
  /** Epoch ms of the most recent assessment, for the "last taken" label. */
  assessmentLastTakenAt: number | null;
  /** How many times the assessment has been taken. */
  assessmentAttempts: number;
  /** Automatically read lesson cards aloud when a rendered clip is available. */
  narrationEnabled: boolean;
  /** User-facing choice; vendor voice names stay out of persisted data. */
  narrationVoice: 'male' | 'female';
  /** Cross-platform playback rates supported by the narration UI. */
  narrationSpeed: 0.75 | 1 | 1.25 | 1.5;
  /** Synced preference vote; does not change the production narrator by itself. */
  maleVoiceVote: 'cedar' | 'ash' | 'echo' | null;
}

/**
 * One earned badge. The record `id` IS the badge id from the catalog, so a
 * badge can be earned at most once and awarding it twice is a harmless
 * idempotent write. The catalog (definition, glyph, criteria) lives in code,
 * never in storage — only the fact that it was earned, and when, is persisted.
 */
export interface BadgeAward extends Syncable {
  badgeId: string;
  unlockedAt: number;
}

/**
 * Spaced-repetition state for one interactive card the learner has answered.
 * Leitner-style: `box` sets the interval and `dueAt` is when the card next
 * resurfaces for review. The record id is the card's coordinate key
 * (courseId/lessonId#cardId), so review state and the saved card share a key.
 */
export interface ReviewState extends Syncable {
  courseId: CourseId;
  lessonId: LessonId;
  cardId: CardId;
  /** Leitner box 0..N; higher means a longer interval. */
  box: number;
  /** Epoch ms when this card is next due for review. */
  dueAt: number;
  lastReviewedAt: number;
  lastCorrect: boolean;
}

export type ProfilePatch = Partial<Omit<UserProfile, keyof Syncable>>;
export type ProgressInput = Omit<LessonProgress, keyof Syncable> & { id?: string };
export type SavedCardInput = Omit<SavedCard, keyof Syncable | 'savedAt'>;
export type ReviewInput = Omit<ReviewState, keyof Syncable>;

/**
 * One AI Advisor exchange — a saved question and its answer. Client-authored
 * and synced like the rest, so the learner's ask history follows them across
 * devices. A running log, newest-first when listed.
 */
export interface AskThread extends Syncable {
  question: string;
  answer: string;
  at: number;
}
export type AskThreadInput = Omit<AskThread, keyof Syncable | 'at'>;

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
    /**
     * Idempotent per day — calling twice on the same date is a no-op. A gap of
     * one missed day is bridged by a held freeze rather than resetting.
     */
    recordActivity(dayISO: string): Promise<StreakState>;
    /** Adds freezes to the bank (bought with gems in the store). */
    addFreezes(count: number): Promise<StreakState>;
  };

  hearts: {
    get(): Promise<HeartsState>;
    /** Persists a settled count + regen anchor. Logic lives in the store. */
    set(value: HeartsValue): Promise<HeartsState>;
  };

  gems: {
    get(): Promise<GemsState>;
    /** Persists an absolute balance. Earn/spend arithmetic lives in the store. */
    set(value: GemsValue): Promise<GemsState>;
  };

  entitlement: {
    /** Server-authored (Stripe) and pulled via sync; the client only reads it. */
    get(): Promise<EntitlementState>;
    /**
     * A __DEV__-only local override for exercising paid gates before billing
     * exists. Stored off to the side of sync (local meta), so it never travels
     * to the server and never collides with a real entitlement.
     */
    getDevOverride(): Promise<PlanId | null>;
    setDevOverride(plan: PlanId | null): Promise<void>;
  };

  unlocks: {
    isStrategyUnlocked(id: StrategyId): Promise<boolean>;
    listUnlockedStrategies(): Promise<StrategyId[]>;
  };

  badges: {
    list(): Promise<BadgeAward[]>;
    /** Idempotent: awarding an already-earned badge keeps the original date. */
    award(badgeId: string): Promise<BadgeAward>;
  };

  reviews: {
    list(): Promise<ReviewState[]>;
    /** Creates or replaces the spaced-repetition state for one card. */
    upsert(input: ReviewInput): Promise<ReviewState>;
  };

  advisor: {
    /** Saved AI Advisor exchanges, newest first. */
    list(): Promise<AskThread[]>;
    add(input: AskThreadInput): Promise<AskThread>;
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

/**
 * Advances a streak by one active day, applied identically in every repository.
 *
 * A one-day (or wider) gap is bridged by spending held freezes — one per missed
 * day — instead of resetting; only when there are not enough freezes does the
 * streak fall back to 1. A non-positive gap (same day handled by the caller, or
 * a clock that moved backwards) leaves the count untouched.
 */
export function applyStreakDay(
  current: Pick<StreakState, 'currentStreak' | 'lastActiveDay' | 'freezes'>,
  dayISO: string,
): { currentStreak: number; freezes: number } {
  const freezes = current.freezes ?? 0;
  if (!current.lastActiveDay) return { currentStreak: 1, freezes };

  const gap = daysBetween(current.lastActiveDay, dayISO);
  if (gap <= 0) return { currentStreak: current.currentStreak, freezes };
  if (gap === 1) return { currentStreak: current.currentStreak + 1, freezes };

  const missed = gap - 1;
  if (freezes >= missed) return { currentStreak: current.currentStreak + 1, freezes: freezes - missed };
  return { currentStreak: 1, freezes };
}

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
    experienceLevel: profile.experienceLevel ?? null,
    primaryGoal: profile.primaryGoal ?? null,
    learningGoals: profile.learningGoals ?? (profile.primaryGoal ? [profile.primaryGoal] : []),
    dailyGoalMinutes: profile.dailyGoalMinutes ?? null,
    questClaims: profile.questClaims ?? [],
    lastSeenWeeklyNoteDate: profile.lastSeenWeeklyNoteDate ?? null,
    askDay: profile.askDay ?? null,
    askCount: profile.askCount ?? 0,
    assessmentBestScore: profile.assessmentBestScore ?? null,
    assessmentLastTakenAt: profile.assessmentLastTakenAt ?? null,
    assessmentAttempts: profile.assessmentAttempts ?? 0,
    narrationEnabled: profile.narrationEnabled ?? false,
    narrationVoice: profile.narrationVoice ?? 'female',
    narrationSpeed: profile.narrationSpeed ?? 1,
    maleVoiceVote: profile.maleVoiceVote ?? null,
  };
}
