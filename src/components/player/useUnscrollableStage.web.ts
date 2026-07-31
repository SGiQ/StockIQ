import { useEffect } from 'react';

/**
 * Stops the browser from scrolling the card stage on web.
 *
 * The stage clips its overflow and lays cards out at `left: i * width`, so to
 * the browser it is a 390px box wrapping ~1170px of content. `overflow:
 * hidden` blocks *user* scrolling but still creates a scroll container, and
 * focusing a tap zone makes the browser scroll that container to reveal the
 * focused element. The deck positions itself with a transform, so any scroll
 * offset is pure desynchronisation — the card slides out of register and each
 * later tap adds to the error. On the deployed build this left the opening
 * card clipped mid-word with the next card bleeding in beside it.
 *
 * `overflow: clip` clips identically but creates no scroll container at all,
 * so the offset cannot become non-zero in the first place. That is why this
 * sets a property rather than listening: `scroll` events do not fire on these
 * boxes, so a reactive fix has nothing to react to — measured directly, both
 * `scroll` and `focusin` fired zero times while `scrollLeft` moved to 65.
 *
 * Applied here rather than in `StyleSheet` because React Native's `overflow`
 * type accepts only `visible | hidden | scroll`, and found by id rather than
 * by ref because the stage is a `GestureDetector` child, which claims its
 * child's ref — the same reason the deck measures its width on the root.
 *
 * Keyboard and screen-reader users keep working tap zones: the buttons stay
 * focusable, the box just no longer scrolls under them.
 */
export function useUnscrollableStage(stageId: string) {
  useEffect(() => {
    const el = document.getElementById(stageId);
    if (!el) return;

    el.style.overflow = 'clip';

    // Pre-2022 browsers ignore `clip` and leave a scroll container behind.
    // Element-level scroll events never fire here, but focus still bubbles to
    // the document, which is enough to undo the one thing that moves it.
    if (getComputedStyle(el).overflowX !== 'clip') {
      const undo = () => {
        if (el.scrollLeft !== 0) el.scrollLeft = 0;
        if (el.scrollTop !== 0) el.scrollTop = 0;
      };
      document.addEventListener('focusin', undo, true);
      return () => document.removeEventListener('focusin', undo, true);
    }
  }, [stageId]);
}
