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
import { useMemo } from 'react';
import { create } from 'zustand';
import {
  getLesson,
  lessonPath,
  listCourses,
  listLessonsInCourse,
  listWeeklyNotes,
} from '@/content/registry';
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
import { MAX_HEARTS, refill, settle, spendOne } from '@/features/hearts';
import {
  GEMS_DAILY_QUEST,
  GEMS_PER_REVIEW,
  HEART_REFILL_COST,
  STREAK_FREEZE_COST,
  lessonGemReward,
  deductGems,
} from '@/features/gems';
import { crossedMilestone, grantFreeze } from '@/features/streak';
import { buy as paperBuy, sell as paperSell, emptyPortfolio, type Portfolio, type TradeResult } from '@/features/paper';
import { recordTrade, clearTrades } from '@/features/paper/tradeHistory';
import { recordSnapshot, clearSnapshots } from '@/features/paper/valueHistory';
import {
  dailyStats,
  questClaimKey,
  questDone,
  questsForDay,
  type QuestDef,
} from '@/features/daily';
import { resolveEntitlement, type Entitlement } from '@/features/entitlement';
import { repository } from '../index';
import {
  progressId,
  savedCardId,
  type AskThread,
  type WatchlistItem,
  type BadgeAward,
  type CardAttempt,
  type EntitlementState,
  type ExperienceLevel,
  type GemsState,
  type HeartsState,
  type LearningGoal,
  type LessonProgress,
  type LikedItem,
  type CardReport,
  type PlanId,
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
  /** Gems minted by this completion (0 on a replay). */
  gemsAwarded: number;
  /** The streak milestone this completion crossed, if any (7, 30, …). */
  streakMilestone: number | null;
}

interface AppState {
  hydrated: boolean;

  profile: UserProfile | null;
  streak: StreakState | null;
  hearts: HeartsState | null;
  gems: GemsState | null;
  /** Server-authored subscription entitlement; free until Stripe writes it. */
  entitlement: EntitlementState | null;
  /** __DEV__-only local plan override; never synced. Null in production use. */
  entitlementOverride: PlanId | null;
  /** Keyed by "courseId/lessonId". */
  progress: Record<string, LessonProgress>;
  saved: SavedCard[];
  liked: LikedItem[];
  reports: CardReport[];
  unlockedStrategies: StrategyId[];
  badges: BadgeAward[];
  reviews: ReviewState[];
  askThreads: AskThread[];
  watchlist: WatchlistItem[];
  portfolio: Portfolio;

  hydrate: () => Promise<void>;

  /**
   * Spends one heart on a wrong answer. Regeneration is settled first, so a
   * heart earned back by waiting is credited before this deducts. A no-op when
   * already empty. Returns the count remaining after the spend.
   */
  loseHeart: () => Promise<number>;

  /** Adds gems to the balance. Returns the new balance. */
  awardGems: (amount: number) => Promise<number>;
  /** Spends gems if affordable. Returns true on success, false if too poor. */
  spendGems: (amount: number) => Promise<boolean>;
  /** Buys a full heart refill with gems. Returns false if unaffordable. */
  refillHeartsWithGems: () => Promise<boolean>;
  /** Buys one streak freeze with gems (capped). Returns false if unaffordable or at cap. */
  buyStreakFreeze: () => Promise<boolean>;
  /**
   * Closes a review session: awards review gems and, if hearts are below full,
   * gives one back — the "practice to earn a heart" loop. Returns what happened
   * so the review summary can show it.
   */
  finishReviewSession: () => Promise<{ gemsAwarded: number; heartRefilled: boolean }>;

  /**
   * Pays out gems for any of today's quests now complete but unclaimed. Called
   * after a completion so the reward lands the moment the quest is met. Returns
   * the quests newly completed, for a celebration.
   */
  evaluateDailyQuests: () => Promise<QuestDef[]>;

  /**
   * __DEV__-only: overrides the effective plan locally for testing paid gates
   * before billing exists. Pass null (or 'free') to clear. Never synced.
   */
  setEntitlementOverride: (plan: PlanId | null) => Promise<void>;

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
  setExperience: (level: ExperienceLevel, goals: LearningGoal[]) => Promise<void>;
  setDailyGoal: (minutes: number) => Promise<void>;
  /** Marks the This Week feed as seen up to the newest note (clears the badge). */
  markWeeklyNotesSeen: () => Promise<void>;

  /**
   * Records a completed advisor exchange: bumps today's ask count (resetting on
   * a new day) and saves the Q&A to history. The daily cap is enforced at the
   * call site via the entitlement + `asksRemaining`, not here.
   */
  recordAsk: (question: string, answer: string) => Promise<void>;

  /** Adds a symbol to the watchlist (idempotent, upper-cased). */
  addToWatchlist: (symbol: string) => Promise<void>;
  removeFromWatchlist: (symbol: string) => Promise<void>;

  /** Simulated buy/sell at `price`. Returns the result so the UI can show why one failed. */
  buyShares: (symbol: string, price: number, shares: number) => Promise<TradeResult>;
  sellShares: (symbol: string, price: number, shares: number) => Promise<TradeResult>;
  /** Wipes the paper portfolio back to the starting cash. */
  resetPortfolio: () => Promise<void>;

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
  hearts: null,
  gems: null,
  entitlement: null,
  entitlementOverride: null,
  progress: {},
  saved: [],
  liked: [],
  reports: [],
  unlockedStrategies: [],
  badges: [],
  reviews: [],
  askThreads: [],
  watchlist: [],
  portfolio: emptyPortfolio(),

  hydrate: async () => {
    const [
      profile,
      streak,
      hearts,
      gems,
      entitlement,
      entitlementOverride,
      progressList,
      saved,
      liked,
      reports,
      unlockedStrategies,
      badges,
      reviews,
      askThreads,
      watchlist,
      paper,
    ] = await Promise.all([
      repository.profile.get(),
      repository.streak.get(),
      repository.hearts.get(),
      repository.gems.get(),
      repository.entitlement.get(),
      repository.entitlement.getDevOverride(),
      repository.progress.listAll(),
      repository.saved.list(),
      repository.liked.list(),
      repository.reports.list(),
      repository.unlocks.listUnlockedStrategies(),
      repository.badges.list(),
      repository.reviews.list(),
      repository.advisor.list(),
      repository.watchlist.list(),
      repository.paper.get(),
    ]);

    set({
      hydrated: true,
      profile,
      streak,
      hearts,
      gems,
      entitlement,
      entitlementOverride,
      progress: Object.fromEntries(progressList.map((p) => [p.id, p])),
      saved,
      liked,
      reports,
      unlockedStrategies,
      badges,
      reviews,
      askThreads,
      watchlist,
      portfolio: { cash: paper.cash, positions: paper.positions },
    });

    // Backfill: award any badges the learner already qualifies for but never
    // received (e.g. badges added in an update, or earned before this system
    // shipped). Cheap, and it means the shelf is correct on first open.
    await get().refreshAchievements();
  },

  loseHeart: async () => {
    const current = get().hearts ?? (await repository.hearts.get());
    const { value, spent } = spendOne(current, Date.now());
    if (!spent) {
      // Already empty. Keep the settled value in memory so the gate reads 0.
      set({ hearts: { ...current, ...value } });
      return 0;
    }
    const saved = await repository.hearts.set(value);
    set({ hearts: saved });
    return saved.hearts;
  },

  awardGems: async (amount) => {
    if (amount <= 0) return get().gems?.balance ?? 0;
    const current = get().gems ?? (await repository.gems.get());
    const saved = await repository.gems.set({ balance: current.balance + amount });
    set({ gems: saved });
    return saved.balance;
  },

  spendGems: async (amount) => {
    const current = get().gems ?? (await repository.gems.get());
    const remaining = deductGems(current.balance, amount);
    if (remaining === null) return false;
    const saved = await repository.gems.set({ balance: remaining });
    set({ gems: saved });
    return true;
  },

  refillHeartsWithGems: async () => {
    if (!(await get().spendGems(HEART_REFILL_COST))) return false;
    const saved = await repository.hearts.set(refill(Date.now()));
    set({ hearts: saved });
    return true;
  },

  buyStreakFreeze: async () => {
    const streak = get().streak ?? (await repository.streak.get());
    if (grantFreeze(streak.freezes ?? 0) === null) return false;
    if (!(await get().spendGems(STREAK_FREEZE_COST))) return false;
    const saved = await repository.streak.addFreezes(1);
    set({ streak: saved });
    return true;
  },

  finishReviewSession: async () => {
    await get().awardGems(GEMS_PER_REVIEW);

    // Practice earns a heart back — but only when there's room for one.
    const current = get().hearts ?? (await repository.hearts.get());
    const settled = settle(current, Date.now());
    let heartRefilled = false;
    if (settled.hearts < MAX_HEARTS) {
      const saved = await repository.hearts.set({
        hearts: settled.hearts + 1,
        since: settled.since,
      });
      set({ hearts: saved });
      heartRefilled = true;
    }
    return { gemsAwarded: GEMS_PER_REVIEW, heartRefilled };
  },

  evaluateDailyQuests: async () => {
    const today = toDayISO();
    const quests = questsForDay(today);
    const stats = dailyStats(get().progress, today);
    const claimed = new Set(get().profile?.questClaims ?? []);

    const newlyDone: QuestDef[] = [];
    for (const quest of quests) {
      const key = questClaimKey(today, quest.id);
      if (questDone(quest, stats) && !claimed.has(key)) {
        claimed.add(key);
        newlyDone.push(quest);
      }
    }
    if (newlyDone.length === 0) return [];

    await get().awardGems(GEMS_DAILY_QUEST * newlyDone.length);
    // Only today's claims matter; yesterday's quests are a different set and are
    // never re-evaluated, so drop them and keep the stored list tiny.
    const kept = [...claimed].filter((k) => k.startsWith(`${today}#`));
    set({ profile: await repository.profile.update({ questClaims: kept }) });
    return newlyDone;
  },

  setEntitlementOverride: async (plan) => {
    await repository.entitlement.setDevOverride(plan);
    set({ entitlementOverride: plan });
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

    // Gems are minted alongside XP — once per lesson, with a perfect-run bonus.
    const gemsAwarded = xpDelta > 0 ? lessonGemReward(starred) : 0;
    if (gemsAwarded > 0) {
      const currentGems = get().gems ?? (await repository.gems.get());
      set({ gems: await repository.gems.set({ balance: currentGems.balance + gemsAwarded }) });
    }

    // A milestone only counts when the streak actually advanced today.
    const streakMilestone = crossedMilestone(
      previousStreak?.currentStreak ?? 0,
      streak.currentStreak,
    );

    // Today's quests can be met by this very completion — pay out now.
    await get().evaluateDailyQuests();

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
      gemsAwarded,
      streakMilestone,
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

  setExperience: async (level, goals) => {
    set({
      profile: await repository.profile.update({
        experienceLevel: level,
        learningGoals: goals,
        // Keep the single primary in step for anything that wants just one.
        primaryGoal: goals[0] ?? null,
      }),
    });
  },

  setDailyGoal: async (minutes) => {
    set({ profile: await repository.profile.update({ dailyGoalMinutes: minutes }) });
  },

  recordAsk: async (question, answer) => {
    const today = toDayISO();
    const profile = get().profile;
    const used = profile?.askDay === today ? profile.askCount : 0;
    const [updated, thread] = await Promise.all([
      repository.profile.update({ askDay: today, askCount: used + 1 }),
      repository.advisor.add({ question, answer }),
    ]);
    set({ profile: updated, askThreads: [thread, ...get().askThreads] });
  },

  addToWatchlist: async (symbol) => {
    const s = symbol.trim().toUpperCase();
    if (!s) return;
    const item = await repository.watchlist.add(s);
    set({ watchlist: [item, ...get().watchlist.filter((w) => w.id !== item.id)] });
  },

  removeFromWatchlist: async (symbol) => {
    const id = symbol.trim().toUpperCase();
    await repository.watchlist.remove(id);
    set({ watchlist: get().watchlist.filter((w) => w.id !== id) });
  },

  buyShares: async (symbol, price, shares) => {
    const sym = symbol.trim().toUpperCase();
    const res = paperBuy(get().portfolio, sym, price, shares);
    if (res.ok) {
      const saved = await repository.paper.set(res.portfolio);
      set({ portfolio: { cash: saved.cash, positions: saved.positions } });
      void recordTrade(sym, 'buy', shares, price);
      const posValue = res.portfolio.positions.reduce((s, p) => s + p.shares * (p.symbol === sym ? price : p.avgCost), 0);
      void recordSnapshot(res.portfolio.cash + posValue);
    }
    return res;
  },

  sellShares: async (symbol, price, shares) => {
    const sym = symbol.trim().toUpperCase();
    const res = paperSell(get().portfolio, sym, price, shares);
    if (res.ok) {
      const saved = await repository.paper.set(res.portfolio);
      set({ portfolio: { cash: saved.cash, positions: saved.positions } });
      void recordTrade(sym, 'sell', shares, price);
      const posValue = res.portfolio.positions.reduce((s, p) => s + p.shares * (p.symbol === sym ? price : p.avgCost), 0);
      void recordSnapshot(res.portfolio.cash + posValue);
    }
    return res;
  },

  resetPortfolio: async () => {
    const saved = await repository.paper.set(emptyPortfolio());
    set({ portfolio: { cash: saved.cash, positions: saved.positions } });
    void clearTrades();
    void clearSnapshots();
  },

  markWeeklyNotesSeen: async () => {
    const newest = listWeeklyNotes()[0]?.publishedOn;
    if (!newest) return;
    if ((get().profile?.lastSeenWeeklyNoteDate ?? '') >= newest) return;
    set({ profile: await repository.profile.update({ lastSeenWeeklyNoteDate: newest }) });
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
 * Total XP banked across every course, derived from the progress rows.
 *
 * XP is NOT read from a stored counter. The per-lesson `xpAwarded` on the
 * (synced) progress rows is the source of truth; a running total on the profile
 * would be an accumulator on a singleton row under last-write-wins sync, so
 * signing in on a second device could let a newer-but-emptier profile clobber
 * it to 0 while the progress rows themselves survived — which is exactly what
 * happened. Deriving keeps this number in step with the course headers and the
 * lessons-completed count by construction, and self-heals any drifted account.
 */
export function totalEarnedXp(progress: ProgressMap): number {
  return listCourses().reduce((sum, c) => sum + courseEarnedXp(progress, c.id), 0);
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
  reviews: ReviewState[];
}): MarketReadiness {
  return computeReadiness(
    computeAchievementStats({
      progress: state.progress,
      streak: state.streak,
      saved: state.saved,
      unlockedStrategies: state.unlockedStrategies,
      profile: state.profile,
      reviews: state.reviews,
      now: Date.now(),
    }),
  );
}

/**
 * The learner's effective entitlement, resolved from the synced row and the
 * dev override.
 *
 * A hook rather than a plain selector because it derives a fresh object: it
 * subscribes to the two STABLE slices (the entitlement row and the override
 * string) and memoises the resolution, so it never trips Zustand's identity
 * check the way a selector returning `resolveEntitlement(...)` inline would.
 * Every gate reads this — hearts today, ASK and the Knowledge Base next.
 */
export function useEntitlement(): Entitlement {
  const entitlement = useAppStore((s) => s.entitlement);
  const override = useAppStore((s) => s.entitlementOverride);
  return useMemo(
    () => resolveEntitlement(entitlement, override, Date.now()),
    [entitlement, override],
  );
}

/**
 * How many This Week notes are newer than the learner has seen — drives the
 * "new" badge. Pure over the profile + the (static) note list.
 */
export function unseenWeeklyNoteCount(profile: UserProfile | null): number {
  const seen = profile?.lastSeenWeeklyNoteDate ?? '';
  return listWeeklyNotes().filter((n) => n.publishedOn > seen).length;
}

export { lessonPath };
