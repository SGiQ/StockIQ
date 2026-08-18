/**
 * The badge catalog.
 *
 * Definitions live in code (name, glyph, how to earn); only the *fact* that a
 * badge was earned is persisted (see `BadgeAward`). That split means the
 * catalog can grow or be reworded in a release without a data migration, and a
 * newly added badge is simply awarded the next time its criteria are met.
 *
 * Every predicate reads the shared `AchievementStats` snapshot, so a badge can
 * only ever depend on numbers the readiness score also sees — the two can never
 * disagree about what the learner has done.
 */
import { listCourses } from '@/content/registry';
import type { GlyphName } from '@/content/types';
import type { AchievementStats } from './stats';

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export interface BadgeDef {
  id: string;
  name: string;
  /** What earning it means / how to earn it. Shown on the badges screen. */
  description: string;
  glyph: GlyphName;
  tier: BadgeTier;
  earned: (s: AchievementStats) => boolean;
}

/** Course-completion badges, generated so they stay in lockstep with content. */
const COURSE_BADGES: BadgeDef[] = listCourses().map((course) => ({
  id: `course:${course.id}`,
  name: `${course.title} complete`,
  description: `Finish every lesson in ${course.title}.`,
  glyph: 'ladder',
  tier: 'silver',
  earned: (s) => s.coursesCompletedIds.includes(course.id),
}));

/** Milestone badges independent of any single course. */
const MILESTONE_BADGES: BadgeDef[] = [
  {
    id: 'first-lesson',
    name: 'First steps',
    description: 'Complete your very first lesson.',
    glyph: 'seed',
    tier: 'bronze',
    earned: (s) => s.lessonsCompleted >= 1,
  },
  {
    id: 'streak-7',
    name: 'One week strong',
    description: 'Keep a 7-day learning streak.',
    glyph: 'flag',
    tier: 'silver',
    earned: (s) => s.longestStreak >= 7,
  },
  {
    id: 'streak-30',
    name: 'Habit formed',
    description: 'Keep a 30-day learning streak.',
    glyph: 'calendar',
    tier: 'gold',
    earned: (s) => s.longestStreak >= 30,
  },
  {
    id: 'perfect-lesson',
    name: 'Flawless',
    description: 'Finish a lesson answering every question correctly first try.',
    glyph: 'star',
    tier: 'bronze',
    earned: (s) => s.perfectLessons >= 1,
  },
  {
    id: 'perfect-ten',
    name: 'Sharp shooter',
    description: 'Earn a perfect run on ten lessons.',
    glyph: 'target',
    tier: 'gold',
    earned: (s) => s.perfectLessons >= 10,
  },
  {
    id: 'accuracy',
    name: 'Marksman',
    description: 'Answer 90% of questions correctly across at least 20 questions.',
    glyph: 'check',
    tier: 'silver',
    earned: (s) => s.quizTotal >= 20 && s.quizAccuracy >= 0.9,
  },
  {
    id: 'first-strategy',
    name: 'Strategist',
    description: 'Unlock your first investing strategy.',
    glyph: 'compass',
    tier: 'silver',
    earned: (s) => s.strategiesUnlocked >= 1,
  },
  {
    id: 'all-strategies',
    name: 'Full playbook',
    description: 'Unlock every strategy in the knowledge base.',
    glyph: 'key',
    tier: 'gold',
    earned: (s) => s.totalStrategies > 0 && s.strategiesUnlocked >= s.totalStrategies,
  },
  {
    id: 'assessment-pass',
    name: 'Checked out',
    description: 'Score 80% or higher on the Market Readiness check.',
    glyph: 'shield',
    tier: 'gold',
    earned: (s) => s.assessmentBestScore >= 0.8,
  },
  {
    id: 'collector',
    name: 'Curator',
    description: 'Save ten cards to your collection.',
    glyph: 'heart',
    tier: 'bronze',
    earned: (s) => s.savedCount >= 10,
  },
  {
    id: 'xp-500',
    name: 'Scholar',
    description: 'Earn 500 XP.',
    glyph: 'lightbulb',
    tier: 'silver',
    earned: (s) => s.totalXp >= 500,
  },
  {
    id: 'curriculum',
    name: 'Full curriculum',
    description: 'Complete every course in StockiQ.',
    glyph: 'tree',
    tier: 'gold',
    earned: (s) => s.totalCourses > 0 && s.coursesCompleted >= s.totalCourses,
  },
];

/** First steps first, then course badges, then the harder milestones. */
export const BADGES: BadgeDef[] = [
  MILESTONE_BADGES[0]!, // first-lesson
  ...COURSE_BADGES,
  ...MILESTONE_BADGES.slice(1),
];

export const getBadge = (id: string): BadgeDef | undefined => BADGES.find((b) => b.id === id);

/** Badges whose criteria are now met but which have not yet been awarded. */
export function evaluateNewBadges(stats: AchievementStats, earnedIds: Set<string>): BadgeDef[] {
  return BADGES.filter((badge) => !earnedIds.has(badge.id) && badge.earned(stats));
}
