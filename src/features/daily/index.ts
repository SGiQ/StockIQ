/**
 * The daily loop: today's XP progress and the day's quests.
 *
 * Everything here is DERIVED from the progress rows and the date — no new
 * per-day counters to store and no timer. "XP today" is the sum of XP on
 * lessons completed today; quests read the same daily stats. The only thing
 * that must be persisted is which quests have been paid out, and that lives as
 * a small claim list on the profile.
 */
import { toDayISO } from '@/lib/dates';
import type { LessonProgress } from '@/store/repository';

/** How much XP one goal-minute is worth, mapping the daily-goal to a target. */
export const XP_PER_GOAL_MINUTE = 4;

export interface DailyStats {
  xp: number;
  lessons: number;
  perfect: number;
}

type ProgressMap = Record<string, LessonProgress>;

/** Daily stats derived from the progress rows completed on `dayISO`. */
export function dailyStats(progress: ProgressMap, dayISO: string): DailyStats {
  let xp = 0;
  let lessons = 0;
  let perfect = 0;
  for (const p of Object.values(progress)) {
    if (p.status !== 'completed' || p.completedAt == null) continue;
    if (toDayISO(new Date(p.completedAt)) !== dayISO) continue;
    lessons += 1;
    xp += p.xpAwarded;
    if (p.starred) perfect += 1;
  }
  return { xp, lessons, perfect };
}

/** The XP target for the day, from the learner's chosen pace. */
export function dailyXpGoal(dailyGoalMinutes: number | null): number {
  return Math.max(10, (dailyGoalMinutes ?? 5) * XP_PER_GOAL_MINUTE);
}

/* ------------------------------------------------------------------ *
 * Quests
 * ------------------------------------------------------------------ */

export type QuestMetric = 'xp' | 'lessons' | 'perfect';

export interface QuestDef {
  id: string;
  title: string;
  target: number;
  metric: QuestMetric;
}

/** The pool the day's three quests are drawn from. */
const QUEST_POOL: QuestDef[] = [
  { id: 'xp-20', title: 'Earn 20 XP', target: 20, metric: 'xp' },
  { id: 'xp-40', title: 'Earn 40 XP', target: 40, metric: 'xp' },
  { id: 'lessons-1', title: 'Finish a lesson', target: 1, metric: 'lessons' },
  { id: 'lessons-2', title: 'Finish 2 lessons', target: 2, metric: 'lessons' },
  { id: 'perfect-1', title: 'Ace a lesson', target: 1, metric: 'perfect' },
];

/** A stable hash of the day string, so quests are fixed for the whole day. */
function dayHash(dayISO: string): number {
  let h = 0;
  for (let i = 0; i < dayISO.length; i += 1) h = (h * 31 + dayISO.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * The three quests for `dayISO`. Deterministic — the same day always yields the
 * same set, so progress and rewards stay stable across a day and across devices.
 */
export function questsForDay(dayISO: string): QuestDef[] {
  const seed = dayHash(dayISO);
  const chosen: QuestDef[] = [];
  const used = new Set<string>();
  let i = 0;
  while (chosen.length < 3 && i < QUEST_POOL.length * 2) {
    const def = QUEST_POOL[(seed + i) % QUEST_POOL.length];
    if (!used.has(def.id)) {
      used.add(def.id);
      chosen.push(def);
    }
    i += 1;
  }
  return chosen;
}

/** Progress toward a quest from the day's stats (clamped to its target). */
export function questProgress(def: QuestDef, stats: DailyStats): number {
  return Math.min(def.target, stats[def.metric]);
}

export function questDone(def: QuestDef, stats: DailyStats): boolean {
  return stats[def.metric] >= def.target;
}

/** The claim-list key: one quest, one day. */
export function questClaimKey(dayISO: string, questId: string): string {
  return `${dayISO}#${questId}`;
}
