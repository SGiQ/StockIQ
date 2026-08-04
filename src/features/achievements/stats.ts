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
import type { LessonProgress, SavedCard, StreakState, UserProfile } from '@/store/repository';

export interface AchievementStatsInput {
  progress: Record<string, LessonProgress>;
  streak: StreakState | null;
  saved: SavedCard[];
  unlockedStrategies: string[];
  profile: UserProfile | null;
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
}

export function computeAchievementStats(input: AchievementStatsInput): AchievementStats {
  const { progress, streak, saved, unlockedStrategies, profile } = input;
  const courses = listCourses();

  let totalLessons = 0;
  let lessonsCompleted = 0;
  let perfectLessons = 0;
  let coursesTouched = 0;
  const coursesCompletedIds: CourseId[] = [];
  // Attempts are stored as the latest attempt per interactive card, so summing
  // them across lessons gives one data point per question the learner faced.
  let quizCorrect = 0;
  let quizTotal = 0;

  for (const course of courses) {
    const lessons = listLessonsInCourse(course.id);
    let completedInCourse = 0;

    for (const lesson of lessons) {
      totalLessons += 1;
      const record = progress[progressId(course.id, lesson.id)];
      if (record?.status !== 'completed') continue;

      completedInCourse += 1;
      lessonsCompleted += 1;
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
    totalXp: profile?.totalXp ?? 0,
    strategiesUnlocked: unlockedStrategies.length,
    totalStrategies: listStrategies().length,
    savedCount: saved.filter((c) => c.deletedAt === null).length,
    assessmentBestScore: profile?.assessmentBestScore ?? 0,
    assessmentTaken: (profile?.assessmentAttempts ?? 0) > 0,
  };
}
