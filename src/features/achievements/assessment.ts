/**
 * Builds the Market Readiness check from real lesson questions.
 *
 * Rather than maintain a separate question bank that could drift from the
 * curriculum, the assessment samples `binary_choice` cards that already ship in
 * the lessons — so every question is one the app actually teaches, and the pool
 * grows automatically as courses are added. Sampling is balanced across the
 * five topics so the score reflects breadth, not just whichever course has the
 * most quiz cards.
 */
import { listCourses, listLessonsInCourse } from '@/content/registry';
import type { BinaryChoiceCard, CourseId } from '@/content/types';

export interface AssessmentQuestion {
  /** Stable within a run; combines course, lesson, and card ids. */
  id: string;
  courseId: CourseId;
  courseTitle: string;
  prompt: string;
  options: { id: string; label: string; correct: boolean }[];
  explanation: string;
}

/** Fisher–Yates. Runtime `Math.random` is fine here (not a workflow script). */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function buildAssessment(count = 8): AssessmentQuestion[] {
  const courses = listCourses();
  const perCourse = Math.max(1, Math.ceil(count / Math.max(1, courses.length)));

  const sampled: AssessmentQuestion[] = [];
  for (const course of courses) {
    const pool: AssessmentQuestion[] = [];
    for (const lesson of listLessonsInCourse(course.id)) {
      for (const card of lesson.cards) {
        if (card.type !== 'binary_choice') continue;
        const bc = card as BinaryChoiceCard;
        pool.push({
          id: `${course.id}/${lesson.id}#${bc.id}`,
          courseId: course.id,
          courseTitle: course.title,
          prompt: bc.prompt,
          options: bc.options.map((o) => ({ id: o.id, label: o.label, correct: o.correct })),
          explanation: bc.explanation,
        });
      }
    }
    sampled.push(...shuffle(pool).slice(0, perCourse));
  }

  return shuffle(sampled).slice(0, count);
}
