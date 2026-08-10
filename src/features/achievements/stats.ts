/**
 * The single snapshot every badge and the readiness score is computed from.
 *
 * Pure: it takes already-hydrated store state plus the static content graph
 * and returns numbers. No repository, no async, no I/O — which is what lets
 * both the badge evaluator (in the store) and the readiness meter (a screen
 * selector) share one definition and never drift.
 *
 * Coverage is measured against real *course* lessons only. Book and strategy
 * guides play in the same lesson player and can leave progress rows behind, but
 * counting them would make "42 of 37 lessons complete" possible, so they are
 * excluded from every denominator here.
 */
import { listCourses, listLessonsInCourse, listStrategies } from '@/content/registry';
import { progressId } from '@/store/repository';
import type { CourseId } from '@/content/types';
import type { LessonProgress, ReviewState, SavedCard, StreakState, UserProfile } from '@/store/repository';

export interface AchievementStatsInput {
  progress: Record<string, LessonProgress>;
  streak: StreakState | null;
  saved: SavedCard[];
  unlockedStrategies: string[];
  profile: UserProfile | null;
  /** Spaced-review rows; drives the retention (keep-sharp) signal. */
  reviews?: ReviewState[];
  /** Clock for the due-review calculation; defaults to now. */
  now?: number;
}

export interface AchievementStats {
  lessonsCompleted: number;
  totalLessons: number;
  /** Ids of courses in which every lesson is complete. */
  coursesCompletedIds: CourseId[];
  coursesCompleted: number;
  /** Courses with at least one completed lesson. */
  coursesTouched: number;
  totalCourses: number;
  /** Lessons finished with a perfect (starred) run. */
  perfectLessons: number;
  quizCorrect: number;
  quizTotal: number;
  /** Correct / total across every answered interactive card, 0 when none. */
  quizAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  strategiesUnlocked: number;
  totalStrategies: number;
  savedCount: number;
  /** Best assessment result 0..1, 0 when never taken. */
  assessmentBestScore: number;
  assessmentTaken: boolean;
  /** Review cards scheduled (live rows). */
  totalReviews: number;
  /** Of those, how many are due now — the "keep sharp" backlog. */
  dueReviews: number;
  /**
   * Review freshness 0..1: 1 when caught up, drifting toward 0 as cards fall
   * due, back to 1 when cleared. 0 when nothing is scheduled yet — a fresh
   * learner has nothing to keep sharp and earns no credit here.
   */
  retention: number;
}

export function computeAchievementStats(input: AchievementStatsInput): AchievementStats {
  const { progress, streak, saved, unlockedStrategies, profile, reviews = [], now = Date.now() } = input;
  const courses = listCourses();

  const liveReviews = reviews.filter((r) => r.deletedAt === null);
  const totalReviews = liveReviews.length;
  const dueReviews = liveReviews.filter((r) => r.dueAt <= now).length;
  const retention = totalReviews === 0 ? 0 : Math.max(0, Math.min(1, 1 - dueReviews / totalReviews));

  let totalLessons = 0;
  let lessonsCompleted = 0;
  let perfectLessons = 0;
  let coursesTouched = 0;
  const coursesCompletedIds: CourseId[] = [];
  // Attempts are stored as the latest attempt per interactive card, so summing
  // them across lessons gives one data point per question the learner faced.
  let quizCorrect = 0;
  let quizTotal = 0;
  // Derived from the progress rows, never read from a stored counter — see
  // totalEarnedXp for why the counter drifts to 0 across a sign-in.
  let totalXp = 0;

  for (const course of courses) {
    const lessons = listLessonsInCourse(course.id);
    let completedInCourse = 0;

    for (const lesson of lessons) {
      totalLessons += 1;
      const record = progress[progressId(course.id, lesson.id)];
      if (record?.status !== 'completed') continue;

      completedInCourse += 1;
      lessonsCompleted += 1;
      totalXp += record.xpAwarded ?? 0;
      if (record.starred) perfectLessons += 1;
      for (const attempt of record.attempts) {
        quizTotal += 1;
        if (attempt.correct) quizCorrect += 1;
      }
    }

    if (completedInCourse > 0) coursesTouched += 1;
    if (lessons.length > 0 && completedInCourse === lessons.length) {
      coursesCompletedIds.push(course.id);
    }
  }

  return {
    lessonsCompleted,
    totalLessons,
    coursesCompletedIds,
    coursesCompleted: coursesCompletedIds.length,
    coursesTouched,
    totalCourses: courses.length,
    perfectLessons,
    quizCorrect,
    quizTotal,
    quizAccuracy: quizTotal > 0 ? quizCorrect / quizTotal : 0,
    currentStreak: streak?.currentStreak ?? 0,
    longestStreak: streak?.longestStreak ?? 0,
    totalXp,
    strategiesUnlocked: unlockedStrategies.length,
    totalStrategies: listStrategies().length,
    savedCount: saved.filter((c) => c.deletedAt === null).length,
    assessmentBestScore: profile?.assessmentBestScore ?? 0,
    assessmentTaken: (profile?.assessmentAttempts ?? 0) > 0,
    totalReviews,
    dueReviews,
    retention,
  };
}
