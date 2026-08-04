/**
 * Market Readiness — a 0..100 measure of how much of the StockIQ curriculum a
 * learner has mastered.
 *
 * IMPORTANT FRAMING: this is an *educational* score, not a signal to trade. It
 * says "you have built this much of the foundation", never "you are cleared to
 * buy or sell". The UI must always show it beside the not-advice line, because
 * a number that implied a green light to trade would be personalized financial
 * advice — exactly what this app does not give.
 *
 * Five components, each 0..1, weighted to 100:
 *   coverage    0.40  how many lessons completed
 *   mastery     0.25  quiz accuracy on what was attempted
 *   breadth     0.15  how many of the topics touched (rewards not siloing)
 *   assessment  0.10  the retakeable readiness check ("prove it")
 *   consistency 0.10  a week of streak maxes it (rewards the habit)
 */
import { palette } from '@/theme/tokens';
import type { AchievementStats } from './stats';

export interface ReadinessComponent {
  key: 'coverage' | 'mastery' | 'breadth' | 'assessment' | 'consistency';
  label: string;
  /** 0..1 raw value. */
  value: number;
  /** 0..1 weight in the final score. */
  weight: number;
}

export interface ReadinessTier {
  label: string;
  /** Inclusive lower bound on the 0..100 score. */
  min: number;
  color: string;
  /** One line shown under the meter. Educational, never a trade cue. */
  caption: string;
}

export interface MarketReadiness {
  /** 0..100, rounded. */
  score: number;
  tier: ReadinessTier;
  components: ReadinessComponent[];
}

/** Ordered high → low so the first tier at or below the score wins. */
export const READINESS_TIERS: ReadinessTier[] = [
  {
    label: 'Strong foundation',
    min: 80,
    color: palette.forestDeep,
    caption: 'You have covered the curriculum thoroughly. Keep it sharp.',
  },
  {
    label: 'Well grounded',
    min: 60,
    color: palette.emeraldDeep,
    caption: 'Most of the fundamentals are in place. A few topics left to round out.',
  },
  {
    label: 'Finding your footing',
    min: 40,
    color: palette.violet,
    caption: 'You are past the basics and building real breadth.',
  },
  {
    label: 'Building basics',
    min: 20,
    color: palette.azure,
    caption: 'The groundwork is forming. Keep completing lessons.',
  },
  {
    label: 'Just starting',
    min: 0,
    color: palette.slate,
    caption: 'Everyone starts here. Finish a lesson to move the needle.',
  },
];

export function tierForScore(score: number): ReadinessTier {
  return READINESS_TIERS.find((t) => score >= t.min) ?? READINESS_TIERS[READINESS_TIERS.length - 1]!;
}

export function computeReadiness(stats: AchievementStats): MarketReadiness {
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  const components: ReadinessComponent[] = [
    {
      key: 'coverage',
      label: 'Lessons completed',
      weight: 0.4,
      value: stats.totalLessons > 0 ? clamp01(stats.lessonsCompleted / stats.totalLessons) : 0,
    },
    {
      key: 'mastery',
      label: 'Quiz accuracy',
      weight: 0.25,
      value: clamp01(stats.quizAccuracy),
    },
    {
      key: 'breadth',
      label: 'Topics explored',
      weight: 0.15,
      value: stats.totalCourses > 0 ? clamp01(stats.coursesTouched / stats.totalCourses) : 0,
    },
    {
      key: 'assessment',
      label: 'Readiness check',
      weight: 0.1,
      value: clamp01(stats.assessmentBestScore),
    },
    {
      key: 'consistency',
      label: 'Daily habit',
      weight: 0.1,
      value: clamp01(stats.currentStreak / 7),
    },
  ];

  const raw = components.reduce((sum, c) => sum + c.value * c.weight, 0);
  const score = Math.round(raw * 100);

  return { score, tier: tierForScore(score), components };
}
