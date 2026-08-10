/**
 * Pure formatting for quotes — kept out of the components so the display rules
 * (how a price, a change, and its direction read) are tested in one place.
 */

/** "$1,234.56" */
export function formatPrice(price: number): string {
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type ChangeTone = 'up' | 'down' | 'flat';

/** Direction of the day's move. Exactly zero (or NaN) reads as flat. */
export function changeTone(change: number): ChangeTone {
  if (!Number.isFinite(change) || change === 0) return 'flat';
  return change > 0 ? 'up' : 'down';
}

/** "+1.23 (+0.98%)" / "-0.50 (-0.40%)" / "0.00 (0.00%)" */
export function formatChange(change: number, changePercent: number): string {
  const sign = change > 0 ? '+' : change < 0 ? '-' : '';
  return `${sign}${Math.abs(change).toFixed(2)} (${sign}${Math.abs(changePercent).toFixed(2)}%)`;
}
