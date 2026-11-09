/**
 * Easing curves that stay inside [0, 1] no matter what progress they are fed.
 *
 * Reanimated computes a timing frame as `start + (to - start) * easing(t)`,
 * and on web the first frame after `withTiming` can arrive with a timestamp
 * EARLIER than the start time (the rAF timestamp is the frame's vsync, which
 * precedes a start that happened mid-frame after a long React commit). That
 * makes `t` negative, and `Easing.out(Easing.cubic)` is a polynomial, so a
 * negative `t` yields a negative progress: a counter about to fall from
 * $10,000 to $9,456 first flashed $10,383. Clamping `t` here means the worst
 * such frame simply shows the start value.
 */

/** Ease-out cubic, clamped. Same shape as `Easing.out(Easing.cubic)`. */
export function easeOutCubic(t: number): number {
  'worklet';
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return 1 - (1 - c) * (1 - c) * (1 - c);
}

/** Ease-out quad, clamped. Same shape as `Easing.out(Easing.quad)`. */
export function easeOutQuad(t: number): number {
  'worklet';
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return 1 - (1 - c) * (1 - c);
}

/** Linear, clamped. For shakes and timelines where `Easing.linear` would run negative on web's first frame. */
export function linearClamped(t: number): number {
  'worklet';
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
