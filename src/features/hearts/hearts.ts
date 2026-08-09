/**
 * Pure hearts logic: regeneration, spending, and display.
 *
 * The stored record keeps only a count and the timestamp that count was
 * accurate as of (`since`). Everything time-dependent — how many hearts have
 * regenerated, when the next one lands — is DERIVED here rather than stored, so
 * there is no timer to keep running and the same answer falls out on any device
 * that holds the same record. This mirrors how XP and readiness are derived
 * rather than accumulated (see the store's selector notes).
 *
 * `since` is advanced by whole elapsed intervals, never reset to "now" while
 * partly regenerated — so missing a second question does not throw away the
 * progress already made toward the next heart. It resets only when hearts reach
 * full (the clock is meaningless there) or when a heart is spent from full.
 */
import type { HeartsValue } from '@/store/repository';
import { HEART_REGEN_MS, MAX_HEARTS } from './constants';

export interface HeartsSnapshot {
  /** Hearts available right now, 0..MAX_HEARTS. */
  count: number;
  /** Milliseconds until the next heart regenerates; 0 when full. */
  nextInMs: number;
  full: boolean;
  empty: boolean;
}

/** Clamp a possibly-corrupt stored count into range, degrading to full. */
function clampHearts(n: number): number {
  if (!Number.isFinite(n)) return MAX_HEARTS;
  return Math.max(0, Math.min(MAX_HEARTS, Math.floor(n)));
}

/**
 * The stored value with accrued regeneration folded in as of `now`.
 *
 * Returns a value equivalent to `state` but with `hearts` caught up and
 * `since` advanced past the intervals already consumed.
 */
export function settle(state: HeartsValue, now: number): HeartsValue {
  const hearts = clampHearts(state.hearts);
  // Full: nothing regenerates, and a stale `since` would only drift. Anchor it
  // to now so the next spend starts a clean interval.
  if (hearts >= MAX_HEARTS) return { hearts: MAX_HEARTS, since: now };

  const elapsed = Math.max(0, now - state.since);
  const gained = Math.floor(elapsed / HEART_REGEN_MS);
  if (gained <= 0) return { hearts, since: state.since };

  const next = Math.min(MAX_HEARTS, hearts + gained);
  return {
    hearts: next,
    // Back to full → reset the clock; otherwise keep the un-consumed remainder
    // so the countdown to the following heart stays honest.
    since: next >= MAX_HEARTS ? now : state.since + gained * HEART_REGEN_MS,
  };
}

/** Everything a screen needs to render hearts, derived at `now`. */
export function snapshot(state: HeartsValue, now: number): HeartsSnapshot {
  const s = settle(state, now);
  const full = s.hearts >= MAX_HEARTS;
  const nextInMs = full ? 0 : HEART_REGEN_MS - ((now - s.since) % HEART_REGEN_MS);
  return { count: s.hearts, nextInMs, full, empty: s.hearts <= 0 };
}

/**
 * Spend one heart. Settles first, so regeneration is always accounted for
 * before deducting. Returns `spent: false` when already empty — the caller can
 * treat that as "the gate is closed" without a separate check.
 */
export function spendOne(state: HeartsValue, now: number): { value: HeartsValue; spent: boolean } {
  const s = settle(state, now);
  if (s.hearts <= 0) return { value: s, spent: false };
  const wasFull = s.hearts >= MAX_HEARTS;
  return {
    value: {
      hearts: s.hearts - 1,
      // Dropping below full for the first time starts the regen clock; a spend
      // while already regenerating leaves the running clock untouched.
      since: wasFull ? now : s.since,
    },
    spent: true,
  };
}

/** A brimming refill — for Pro (unlimited) and future practice-to-earn. */
export function refill(now: number): HeartsValue {
  return { hearts: MAX_HEARTS, since: now };
}

/** Compact human countdown, e.g. "3h 12m", "12m 05s", "42s", "now". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}
