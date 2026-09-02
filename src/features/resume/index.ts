/**
 * Where the learner left off.
 *
 * Progress rows already carry everything needed to resume — a status, the
 * last card reached, and an `updatedAt` stamp — so nothing new is stored.
 * This picks the single most recently touched lesson that is still open,
 * which is what "pick up where you left off" should mean on launch.
 */
import type { LessonProgress } from '@/store/repository';

export type ResumeTarget = Pick<LessonProgress, 'courseId' | 'lessonId' | 'lastCardIndex' | 'updatedAt'>;

/** The most recently touched in-progress lesson, or null when nothing is open. */
export function latestInProgress(
  progress: Record<string, LessonProgress | undefined>,
): ResumeTarget | null {
  let best: LessonProgress | null = null;
  for (const record of Object.values(progress)) {
    if (!record || record.deletedAt !== null || record.status !== 'in_progress') continue;
    if (!best || record.updatedAt > best.updatedAt) best = record;
  }
  if (!best) return null;
  const { courseId, lessonId, lastCardIndex, updatedAt } = best;
  return { courseId, lessonId, lastCardIndex, updatedAt };
}
