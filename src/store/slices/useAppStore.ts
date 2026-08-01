/**
 * The in-memory cache over the Repository.
 *
 * Deliberately one store rather than several: completing a lesson touches
 * progress, XP, the streak, and unlock state in a single atomic user action,
 * and splitting that across stores would only add cross-store orchestration
 * for no isolation benefit at this size.
 *
 * The invariant that matters: every mutator awaits the repository first and
 * only then updates memory. No component ever awaits storage directly, and
 * no component ever imports AsyncStorage.
 */
import { create } from 'zustand';
import { getLesson, lessonPath, listLessonsInCourse } from '@/content/registry';
import type { CardId, CourseId, EntityRef, LessonId, StrategyId } from '@/content/types';
import { toDayISO } from '@/lib/dates';
import { repository } from '../index';
import {
  progressId,
  savedCardId,
  type CardAttempt,
  type LessonProgress,
  type LikedItem,
  type CardReport,
  type ReportReason,
  type SavedCard,
  type StreakState,
  type UserProfile,
} from '../repository';

export interface LessonCompletion {
  xpAwarded: number;
  starred: boolean;
  streak: StreakState;
  /** True when this completion extended the streak (drives the celebration). */
  streakExtended: boolean;
  unlockedStrategies: StrategyId[];
}

interface AppState {
  hydrated: boolean;

  profile: UserProfile | null;
  streak: StreakState | null;
  /** Keyed by "courseId/lessonId". */
  progress: Record<string, LessonProgress>;
  saved: SavedCard[];
  liked: LikedItem[];
  reports: CardReport[];
  unlockedStrategies: StrategyId[];

  hydrate: () => Promise<void>;

  startLesson: (courseId: CourseId, lessonId: LessonId) => Promise<void>;
  recordCardIndex: (courseId: CourseId, lessonId: LessonId, index: number) => Promise<void>;
  recordAttempt: (
    courseId: CourseId,
    lessonId: LessonId,
    attempt: CardAttempt,
  ) => Promise<void>;
  completeLesson: (courseId: CourseId, lessonId: LessonId) => Promise<LessonCompletion>;

  toggleSavedCard: (courseId: CourseId, lessonId: LessonId, cardId: CardId) => Promise<void>;
  isCardSaved: (courseId: CourseId, lessonId: LessonId, cardId: CardId) => boolean;

  toggleLiked: (ref: EntityRef) => Promise<void>;
  isLiked: (ref: EntityRef) => boolean;

  reportCard: (
    courseId: CourseId,
    lessonId: LessonId,
    cardId: CardId,
    reason: ReportReason,
  ) => Promise<void>;

  acknowledgeDisclaimer: () => Promise<void>;
  markTutorialSeen: () => Promise<void>;
  selectCourse: (courseId: CourseId) => Promise<void>;
  setNarrationEnabled: (enabled: boolean) => Promise<void>;
  setNarrationVoice: (voice: UserProfile['narrationVoice']) => Promise<void>;
  resetAll: () => Promise<void>;
}

const EMPTY_ATTEMPTS: CardAttempt[] = [];

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  profile: null,
  streak: null,
  progress: {},
  saved: [],
  liked: [],
  reports: [],
  unlockedStrategies: [],

  hydrate: async () => {
    const [profile, streak, progressList, saved, liked, reports, unlockedStrategies] =
      await Promise.all([
        repository.profile.get(),
        repository.streak.get(),
        repository.progress.listAll(),
        repository.saved.list(),
        repository.liked.list(),
        repository.reports.list(),
        repository.unlocks.listUnlockedStrategies(),
      ]);

    set({
      hydrated: true,
      profile,
      streak,
      progress: Object.fromEntries(progressList.map((p) => [p.id, p])),
      saved,
      liked,
      reports,
      unlockedStrategies,
    });
  },

  startLesson: async (courseId, lessonId) => {
    const key = progressId(courseId, lessonId);
    const existing = get().progress[key];
    // Re-entering a completed lesson must not demote it back to in_progress.
    if (existing?.status === 'completed') return;

    const record = await repository.progress.upsert({
      courseId,
      lessonId,
      status: 'in_progress',
      lastCardIndex: existing?.lastCardIndex ?? 0,
      starred: existing?.starred ?? false,
      xpAwarded: existing?.xpAwarded ?? 0,
      completedAt: existing?.completedAt ?? null,
      attempts: existing?.attempts ?? EMPTY_ATTEMPTS,
    });

    set((state) => ({ progress: { ...state.progress, [key]: record } }));
  },

  recordCardIndex: async (courseId, lessonId, index) => {
    const key = progressId(courseId, lessonId);
    const existing = get().progress[key];
    if (!existing) return;
    // Only ever move the resume point forward.
    if (index <= existing.lastCardIndex) return;

    const record = await repository.progress.upsert({ ...existing, lastCardIndex: index });
    set((state) => ({ progress: { ...state.progress, [key]: record } }));
  },

  recordAttempt: async (courseId, lessonId, attempt) => {
    const key = progressId(courseId, lessonId);
    const existing = get().progress[key];
    if (!existing) return;

    const record = await repository.progress.upsert({
      ...existing,
      attempts: [...existing.attempts.filter((a) => a.cardId !== attempt.cardId), attempt],
    });
    set((state) => ({ progress: { ...state.progress, [key]: record } }));
  },

  completeLesson: async (courseId, lessonId) => {
    const key = progressId(courseId, lessonId);
    const lesson = getLesson(courseId, lessonId);
    const existing = get().progress[key];
    const previousStreak = get().streak;

    const interactiveIds = new Set(
      (lesson?.cards ?? [])
        .filter((c) => c.type === 'binary_choice' || c.type === 'fill_blank')
        .map((c) => c.id),
    );
    const attempts = existing?.attempts ?? EMPTY_ATTEMPTS;
    // The star is for a clean run: every interactive card answered, all correct.
    const starred =
      interactiveIds.size > 0 &&
      [...interactiveIds].every((id) => attempts.some((a) => a.cardId === id && a.correct));

    // XP is minted once. A replay records progress but awards nothing.
    const alreadyAwarded = existing?.xpAwarded ?? 0;
    const xpAwarded = alreadyAwarded > 0 ? alreadyAwarded : (lesson?.xp ?? 0);
    const xpDelta = xpAwarded - alreadyAwarded;

    const record = await repository.progress.upsert({
      courseId,
      lessonId,
      status: 'completed',
      lastCardIndex: Math.max(existing?.lastCardIndex ?? 0, (lesson?.cards.length ?? 1) - 1),
      starred,
      xpAwarded,
      completedAt: existing?.completedAt ?? Date.now(),
      attempts,
    });

    const today = toDayISO();
    const streak = await repository.streak.recordActivity(today);
    const streakExtended = previousStreak?.lastActiveDay !== today;

    const profile =
      xpDelta > 0
        ? await repository.profile.update({
            totalXp: (get().profile?.totalXp ?? 0) + xpDelta,
          })
        : get().profile;

    const unlockedStrategies = await repository.unlocks.listUnlockedStrategies();
    const newlyUnlocked = unlockedStrategies.filter(
      (id) => !get().unlockedStrategies.includes(id),
    );

    set((state) => ({
      progress: { ...state.progress, [key]: record },
      streak,
      profile,
      unlockedStrategies,
    }));

    return { xpAwarded: xpDelta, starred, streak, streakExtended, unlockedStrategies: newlyUnlocked };
  },

  toggleSavedCard: async (courseId, lessonId, cardId) => {
    const id = savedCardId(courseId, lessonId, cardId);
    const isSaved = get().saved.some((c) => c.id === id);

    if (isSaved) await repository.saved.remove(id);
    else await repository.saved.add({ courseId, lessonId, cardId });

    set({ saved: await repository.saved.list() });
  },

  isCardSaved: (courseId, lessonId, cardId) => {
    const id = savedCardId(courseId, lessonId, cardId);
    return get().saved.some((c) => c.id === id);
  },

  toggleLiked: async (ref) => {
    await repository.liked.toggle(ref);
    set({ liked: await repository.liked.list() });
  },

  isLiked: (ref) => get().liked.some((l) => l.ref === ref),

  reportCard: async (courseId, lessonId, cardId, reason) => {
    await repository.reports.add({ courseId, lessonId, cardId, reason });
    set({ reports: await repository.reports.list() });
  },

  acknowledgeDisclaimer: async () => {
    set({ profile: await repository.profile.update({ disclaimerAcknowledgedAt: Date.now() }) });
  },

  markTutorialSeen: async () => {
    set({ profile: await repository.profile.update({ hasSeenPlayerTutorial: true }) });
  },

  selectCourse: async (courseId) => {
    set({ profile: await repository.profile.update({ selectedCourseId: courseId }) });
  },

  setNarrationEnabled: async (enabled) => {
    set({ profile: await repository.profile.update({ narrationEnabled: enabled }) });
  },

  setNarrationVoice: async (voice) => {
    set({ profile: await repository.profile.update({ narrationVoice: voice }) });
  },

  resetAll: async () => {
    await repository.reset();
    await get().hydrate();
  },
}));

/* ------------------------------------------------------------------ *
 * Derived selectors
 * ------------------------------------------------------------------ */

/**
 * Derivations are PURE FUNCTIONS over the progress map, not Zustand
 * selectors.
 *
 * A selector that builds a fresh object every call fails Zustand's identity
 * check on every store read, which re-renders, which reads again — an
 * infinite loop that surfaces as "Maximum update depth exceeded". Screens
 * therefore subscribe to the stable `progress` map and memoise these.
 */
export type ProgressMap = Record<string, LessonProgress>;

export const getLessonProgress = (
  progress: ProgressMap,
  courseId: CourseId,
  lessonId: LessonId,
): LessonProgress | undefined => progress[progressId(courseId, lessonId)];

export type LessonNodeStatus = 'locked' | 'available' | 'in_progress' | 'completed';

/**
 * Lesson gating for the unit path: lessons open in order, and the next one
 * unlocks when its predecessor is completed. The first lesson of a course is
 * always available so a new learner never faces a wall of locks.
 */
export function courseNodeStatuses(
  progress: ProgressMap,
  courseId: CourseId,
): Record<LessonId, LessonNodeStatus> {
  const ordered = listLessonsInCourse(courseId);
  const result: Record<LessonId, LessonNodeStatus> = {};
  let previousCompleted = true;

  for (const lesson of ordered) {
    const record = progress[progressId(courseId, lesson.id)];
    const completed = record?.status === 'completed';

    result[lesson.id] = completed
      ? 'completed'
      : !previousCompleted
        ? 'locked'
        : record?.status === 'in_progress'
          ? 'in_progress'
          : 'available';

    previousCompleted = completed;
  }
  return result;
}

/** Course completion as a 0..1 fraction. */
export function courseCompletion(progress: ProgressMap, courseId: CourseId): number {
  const lessons = listLessonsInCourse(courseId);
  if (lessons.length === 0) return 0;
  const done = lessons.filter(
    (l) => progress[progressId(courseId, l.id)]?.status === 'completed',
  ).length;
  return done / lessons.length;
}

/** The first lesson not yet completed — the "Continue" target. */
export function nextLessonId(progress: ProgressMap, courseId: CourseId): LessonId | null {
  const lessons = listLessonsInCourse(courseId);
  const next = lessons.find((l) => progress[progressId(courseId, l.id)]?.status !== 'completed');
  return next?.id ?? null;
}

/** XP actually banked in a course, for its header. */
export function courseEarnedXp(progress: ProgressMap, courseId: CourseId): number {
  return listLessonsInCourse(courseId).reduce(
    (sum, l) => sum + (progress[progressId(courseId, l.id)]?.xpAwarded ?? 0),
    0,
  );
}

export { lessonPath };
