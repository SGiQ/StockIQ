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
import type { Card, CardId, CourseId, EntityRef, LessonId, StrategyId } from '@/content/types';
import { toDayISO } from '@/lib/dates';
import {
  computeAchievementStats,
  computeReadiness,
  evaluateNewBadges,
  type BadgeDef,
  type MarketReadiness,
} from '@/features/achievements';
import { advance as advanceReview, seed as seedReview } from '@/features/review';
import { repository } from '../index';
import {
  progressId,
  savedCardId,
  type BadgeAward,
  type CardAttempt,
  type ExperienceLevel,
  type LearningGoal,
  type LessonProgress,
  type LikedItem,
  type CardReport,
  type ReportReason,
  type ReviewState,
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
  /** Badges earned by this completion, surfaced on the completion screen. */
  newBadges: BadgeDef[];
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
  badges: BadgeAward[];
  reviews: ReviewState[];

  hydrate: () => Promise<void>;

  startLesson: (courseId: CourseId, lessonId: LessonId) => Promise<void>;
  recordCardIndex: (courseId: CourseId, lessonId: LessonId, index: number) => Promise<void>;
  recordAttempt: (
    courseId: CourseId,
    lessonId: LessonId,
    attempt: CardAttempt,
  ) => Promise<void>;
  completeLesson: (
    courseId: CourseId,
    lessonId: LessonId,
    cardsOverride?: Card[],
  ) => Promise<LessonCompletion>;

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

  /** Records a spaced-repetition answer and reschedules the card. */
  recordReview: (
    courseId: CourseId,
    lessonId: LessonId,
    cardId: CardId,
    correct: boolean,
  ) => Promise<void>;

  /** Recompute badge criteria and award any newly earned. Returns the new ones. */
  refreshAchievements: () => Promise<BadgeDef[]>;
  /** Records an assessment result (best-of) and re-evaluates badges. */
  recordAssessment: (score: number) => Promise<BadgeDef[]>;
  setExperience: (level: ExperienceLevel, goal: LearningGoal) => Promise<void>;

  acknowledgeDisclaimer: () => Promise<void>;
  markTutorialSeen: () => Promise<void>;
  selectCourse: (courseId: CourseId) => Promise<void>;
  setNarrationEnabled: (enabled: boolean) => Promise<void>;
  setNarrationVoice: (voice: UserProfile['narrationVoice']) => Promise<void>;
  setNarrationSpeed: (speed: UserProfile['narrationSpeed']) => Promise<void>;
  setMaleVoiceVote: (voice: NonNullable<UserProfile['maleVoiceVote']>) => Promise<void>;
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
  badges: [],
  reviews: [],

  hydrate: async () => {
    const [profile, streak, progressList, saved, liked, reports, unlockedStrategies, badges, reviews] =
      await Promise.all([
        repository.profile.get(),
        repository.streak.get(),
        repository.progress.listAll(),
        repository.saved.list(),
        repository.liked.list(),
        repository.reports.list(),
        repository.unlocks.listUnlockedStrategies(),
        repository.badges.list(),
        repository.reviews.list(),
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
      badges,
      reviews,
    });

    // Backfill: award any badges the learner already qualifies for but never
    // received (e.g. badges added in an update, or earned before this system
    // shipped). Cheap, and it means the shelf is correct on first open.
    await get().refreshAchievements();
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

  completeLesson: async (courseId, lessonId, cardsOverride) => {
    const key = progressId(courseId, lessonId);
    const lesson = getLesson(courseId, lessonId);
    const existing = get().progress[key];
    const previousStreak = get().streak;

    const completionCards = cardsOverride ?? lesson?.cards ?? [];
    const interactiveIds = new Set(
      completionCards
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
      lastCardIndex: Math.max(existing?.lastCardIndex ?? 0, Math.max(0, completionCards.length - 1)),
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

    // Enrol this lesson's interactive cards into spaced review, seeded from how
    // they went. Only new cards are added — a replay must not reset the spacing
    // on cards already scheduled, or review would never let anything mature.
    const seenReviewIds = new Set(get().reviews.map((r) => r.id));
    const reviewNow = Date.now();
    let seededReview = false;
    for (const card of completionCards) {
      if (card.type !== 'binary_choice' && card.type !== 'fill_blank') continue;
      if (seenReviewIds.has(savedCardId(courseId, lessonId, card.id))) continue;
      const attempt = attempts.find((a) => a.cardId === card.id);
      if (!attempt) continue;
      const { box, dueAt } = seedReview(attempt.correct, reviewNow);
      await repository.reviews.upsert({
        courseId,
        lessonId,
        cardId: card.id,
        box,
        dueAt,
        lastReviewedAt: reviewNow,
        lastCorrect: attempt.correct,
      });
      seededReview = true;
    }
    if (seededReview) set({ reviews: await repository.reviews.list() });

    // Evaluated after the state above lands, so the snapshot sees this
    // completion (its XP, star, streak bump, and any freshly unlocked strategy).
    const newBadges = await get().refreshAchievements();

    return {
      xpAwarded: xpDelta,
      starred,
      streak,
      streakExtended,
      unlockedStrategies: newlyUnlocked,
      newBadges,
    };
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

  recordReview: async (courseId, lessonId, cardId, correct) => {
    const id = savedCardId(courseId, lessonId, cardId);
    const current = get().reviews.find((r) => r.id === id);
    const at = Date.now();
    const { box, dueAt } = advanceReview(current?.box ?? 0, correct, at);
    await repository.reviews.upsert({
      courseId,
      lessonId,
      cardId,
      box,
      dueAt,
      lastReviewedAt: at,
      lastCorrect: correct,
    });
    set({ reviews: await repository.reviews.list() });
  },

  refreshAchievements: async () => {
    const { progress, streak, saved, unlockedStrategies, profile, badges } = get();
    const stats = computeAchievementStats({ progress, streak, saved, unlockedStrategies, profile });
    const earnedIds = new Set(badges.map((b) => b.id));
    const newDefs = evaluateNewBadges(stats, earnedIds);
    if (newDefs.length === 0) return [];

    for (const def of newDefs) await repository.badges.award(def.id);
    set({ badges: await repository.badges.list() });
    return newDefs;
  },

  recordAssessment: async (score) => {
    const current = get().profile;
    const best = Math.max(current?.assessmentBestScore ?? 0, score);
    const profile = await repository.profile.update({
      assessmentBestScore: best,
      assessmentLastTakenAt: Date.now(),
      assessmentAttempts: (current?.assessmentAttempts ?? 0) + 1,
    });
    set({ profile });
    // The assessment feeds both the score and the "Checked out" badge.
    return get().refreshAchievements();
  },

  setExperience: async (level, goal) => {
    set({ profile: await repository.profile.update({ experienceLevel: level, primaryGoal: goal }) });
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

  setNarrationSpeed: async (speed) => {
    set({ profile: await repository.profile.update({ narrationSpeed: speed }) });
  },

  setMaleVoiceVote: async (voice) => {
    set({ profile: await repository.profile.update({ maleVoiceVote: voice }) });
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

/**
 * Market Readiness, derived the same way the other selectors are — a pure
 * function over store slices, memoised by the screen. Nothing is stored; the
 * score is always recomputed from progress, streak, saves, unlocks and the
 * assessment result, so it can never fall out of step with them.
 */
export function selectReadiness(state: {
  progress: ProgressMap;
  streak: StreakState | null;
  saved: SavedCard[];
  unlockedStrategies: StrategyId[];
  profile: UserProfile | null;
}): MarketReadiness {
  return computeReadiness(
    computeAchievementStats({
      progress: state.progress,
      streak: state.streak,
      saved: state.saved,
      unlockedStrategies: state.unlockedStrategies,
      profile: state.profile,
    }),
  );
}

export { lessonPath };
