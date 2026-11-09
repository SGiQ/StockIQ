/**
 * The ambient backdrop behind the desktop phone frame.
 *
 * Native never renders a stage, so this is a no-op; the web build resolves
 * `StageBackdrop.web.tsx` instead, which paints the gradient and the drift.
 */
export function StageBackdrop() {
  return null;
}
