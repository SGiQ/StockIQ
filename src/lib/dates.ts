/**
 * Local-calendar date helpers for the streak system.
 *
 * Streaks are reasoned about in the learner's own timezone, so everything
 * here works on 'YYYY-MM-DD' strings built from local getters — never from
 * toISOString(), which would silently shift the day boundary by the UTC
 * offset and break streaks for anyone west of Greenwich in the evening.
 */

export type DayISO = string; // 'YYYY-MM-DD'

const pad = (n: number) => String(n).padStart(2, '0');

export function toDayISO(date: Date = new Date()): DayISO {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDayISO(day: DayISO): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(day: DayISO, delta: number): DayISO {
  const date = fromDayISO(day);
  date.setDate(date.getDate() + delta);
  return toDayISO(date);
}

/** Whole calendar days between two local dates (b - a). */
export function daysBetween(a: DayISO, b: DayISO): number {
  const MS_PER_DAY = 86_400_000;
  const diff = fromDayISO(b).getTime() - fromDayISO(a).getTime();
  return Math.round(diff / MS_PER_DAY);
}

export const isConsecutive = (previous: DayISO, next: DayISO): boolean =>
  daysBetween(previous, next) === 1;

/** Single-letter weekday initials, matching the streak row in the screenshots. */
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export interface StreakDay {
  day: DayISO;
  initial: string;
  active: boolean;
  isToday: boolean;
}

/**
 * The trailing week ending today, for the flame row. Imprint shows a short
 * window rather than a full calendar — enough to make the streak feel
 * present without turning it into a habit tracker.
 */
export function trailingWeek(activeDays: DayISO[], today: DayISO = toDayISO()): StreakDay[] {
  const active = new Set(activeDays);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    return {
      day,
      initial: WEEKDAY_INITIALS[fromDayISO(day).getDay()],
      active: active.has(day),
      isToday: day === today,
    };
  });
}
