import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveDashboardMetrics } from '../src/lib/dashboard';
import type { LessonProgress } from '../src/store/repository';

const lesson = (
  id: string,
  status: LessonProgress['status'],
  completedAt: number | null,
  starred = false,
): LessonProgress => ({
  id,
  courseId: 'course',
  lessonId: id,
  status,
  lastCardIndex: 0,
  starred,
  xpAwarded: status === 'completed' ? 20 : 0,
  completedAt,
  attempts: [],
  updatedAt: completedAt ?? 1,
  deletedAt: null,
});

test('dashboard counts only completed lessons and caps completion', () => {
  const metrics = deriveDashboardMetrics([
    lesson('one', 'completed', 100, true),
    lesson('two', 'in_progress', null),
    lesson('three', 'completed', 300),
  ], 2);

  assert.equal(metrics.completedCount, 2);
  assert.equal(metrics.starredCount, 1);
  assert.equal(metrics.completion, 1);
});

test('dashboard recent activity is newest-first and limited to three', () => {
  const metrics = deriveDashboardMetrics([
    lesson('one', 'completed', 100),
    lesson('two', 'completed', 400),
    lesson('three', 'completed', 200),
    lesson('four', 'completed', 300),
    lesson('unfinished', 'in_progress', null),
  ], 10);

  assert.deepEqual(metrics.recent.map((item) => item.id), ['two', 'four', 'three']);
});

test('empty dashboard has finite zero completion', () => {
  const metrics = deriveDashboardMetrics([], 0);
  assert.equal(metrics.completion, 0);
  assert.equal(Number.isFinite(metrics.completion), true);
});
