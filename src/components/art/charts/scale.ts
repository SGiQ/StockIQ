/**
 * Shared chart geometry.
 *
 * Every chart draws into the same fixed viewBox and inset, so a compounding
 * curve and a candlestick panel line up visually even though they render
 * completely different marks. That consistency is the whole reason charts
 * replace illustration here — one renderer means one look.
 */

export const VB = { width: 320, height: 240 } as const;

/** Room for axis labels on the left and tick labels underneath. */
export const INSET = { top: 18, right: 16, bottom: 34, left: 40 } as const;

export const PLOT = {
  x0: INSET.left,
  y0: INSET.top,
  x1: VB.width - INSET.right,
  y1: VB.height - INSET.bottom,
  width: VB.width - INSET.left - INSET.right,
  height: VB.height - INSET.top - INSET.bottom,
} as const;

export interface Domain {
  min: number;
  max: number;
}

/** Pads a domain so marks never touch the plot edge. Handles the flat case. */
export function domainOf(values: number[], padding = 0.1): Domain {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const magnitude = Math.abs(min) || 1;
    return { min: min - magnitude * 0.5, max: max + magnitude * 0.5 };
  }
  const pad = (max - min) * padding;
  return { min: min - pad, max: max + pad };
}

/** Maps an index across n points to an x coordinate. */
export function xAt(index: number, count: number): number {
  if (count <= 1) return PLOT.x0 + PLOT.width / 2;
  return PLOT.x0 + (index / (count - 1)) * PLOT.width;
}

/** Maps a value in `domain` to a y coordinate (SVG y grows downward). */
export function yAt(value: number, domain: Domain): number {
  const t = (value - domain.min) / (domain.max - domain.min);
  return PLOT.y1 - t * PLOT.height;
}

/** Evenly spaced band centres, for bar and candle charts. */
export function bandAt(index: number, count: number): { centre: number; width: number } {
  const slot = PLOT.width / count;
  return { centre: PLOT.x0 + slot * (index + 0.5), width: slot };
}

/**
 * A Catmull-Rom-derived cubic path. Straight polylines read as "data dump";
 * a gently smoothed curve reads as a designed illustration, which is the
 * whole point of computing the art rather than drawing it.
 */
export function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length < 3) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  }

  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : points.length - 1];

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Fits an axis label into the width available to it.
 *
 * SVG text does not wrap, so a label like "OPERATING INCOME" happily runs
 * over its neighbours. This splits on whitespace into at most two lines and
 * shrinks the type until the longest line fits the band, which keeps
 * multi-word category labels readable without the author having to
 * hand-abbreviate them.
 */
export function fitLabel(
  label: string,
  bandWidth: number,
): { lines: string[]; fontSize: number } {
  const text = label.toUpperCase();
  const MAX = 10;
  const MIN = 6.5;
  // Bold condensed caps run at roughly 0.62em per character.
  const widthOf = (s: string, size: number) => s.length * size * 0.62;

  if (widthOf(text, MAX) <= bandWidth) return { lines: [text], fontSize: MAX };

  const words = text.split(/\s+/);
  if (words.length > 1) {
    // Split at the point that minimises the longer half.
    let best = { lines: [text], longest: text.length };
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const longest = Math.max(a.length, b.length);
      if (longest < best.longest) best = { lines: [a, b], longest };
    }
    const size = Math.max(
      MIN,
      Math.min(MAX, (bandWidth / (best.longest * 0.62)) * 0.98),
    );
    return { lines: best.lines, fontSize: size };
  }

  return {
    lines: [text],
    fontSize: Math.max(MIN, Math.min(MAX, (bandWidth / (text.length * 0.62)) * 0.98)),
  };
}

/** Compact money formatting for axis labels: 1234567 -> "$1.2M". */
export function formatMoney(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${Math.round(value)}`;
}

/**
 * Per-element reveal for a staggered entrance.
 *
 * `progress` is the chart's overall 0..1 entrance; element `i` of `count`
 * starts `staggerFrac` later than the one before it and takes the remaining
 * share of the timeline, so the last element still lands at progress 1.
 * Returns 0..1. At progress 1 everything is 1, which is also the static
 * render (no progress passed) — the charts never draw a partial state unless
 * an entrance is actually running.
 */
export function revealAt(progress: number, i: number, count: number, staggerFrac = 0.6): number {
  if (progress >= 1) return 1;
  if (count <= 1) return Math.max(0, Math.min(1, progress));
  const start = (i / (count - 1)) * staggerFrac;
  const span = 1 - staggerFrac;
  return Math.max(0, Math.min(1, (progress - start) / span));
}

/** Sum of the straight segments through `points`; a smooth path through them is slightly longer. */
export function polylineLength(points: Array<{ x: number; y: number }>): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);
  }
  return total;
}
