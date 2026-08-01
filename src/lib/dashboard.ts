import type { LessonProgress } from '@/store/repository';

export interface DashboardMetrics {
  completed: LessonProgress[];
  completedCount: number;
  starredCount: number;
  completion: number;
  recent: LessonProgress[];
}

/** Pure dashboard arithmetic, shared with tests so UI labels cannot drift. */
export function deriveDashboardMetrics(
  progress: LessonProgress[],
  totalLessons: number,
): DashboardMetrics {
  const completed = progress.filter((lesson) => lesson.status === 'completed');
  const recent = completed
    .filter((lesson) => lesson.completedAt !== null)
    .toSorted((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .slice(0, 3);

  return {
    completed,
    completedCount: completed.length,
    starredCount: completed.filter((lesson) => lesson.starred).length,
    completion: totalLessons > 0 ? Math.min(1, completed.length / totalLessons) : 0,
    recent,
  };
}
