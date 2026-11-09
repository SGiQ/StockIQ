/**
 * How one ASK request ended, in terms a screen can render.
 *
 * Pure over what the service returned, whether the learner aborted, and the
 * screen's own fallback copy — so the "New mid-stream shows an error" class of
 * bug is checked by a unit test rather than by tapping fast.
 */
import { AskError } from '@/services/ask/types';

export type AskOutcome =
  /** The answer streamed to the end and is worth recording. */
  | { status: 'answered'; answer: string }
  /** The learner stopped it (Stop, New, closing the sheet, leaving the screen). */
  | { status: 'aborted' }
  /** The daily allowance is used up; the upsell was shown instead. */
  | { status: 'blocked' }
  /** A real failure the screen should show. */
  | { status: 'failed'; error: AskError };

export type AskSettled = { ok: true; answer: string } | { ok: false; error: unknown };

export function settleAsk(settled: AskSettled, aborted: boolean, fallbackMessage: string): AskOutcome {
  // An abort is the learner's choice, never a failure — whatever the service
  // did with it (threw, or resolved with a partial answer).
  if (aborted) return { status: 'aborted' };
  if (!settled.ok) {
    return {
      status: 'failed',
      error: settled.error instanceof AskError ? settled.error : new AskError('unknown', fallbackMessage),
    };
  }
  if (settled.answer.trim().length === 0) return { status: 'aborted' };
  return { status: 'answered', answer: settled.answer };
}
