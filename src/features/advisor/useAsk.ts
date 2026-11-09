/**
 * The one way a screen asks the advisor.
 *
 * Every ASK surface — the in-lesson sheet, the Ask screen, portfolio coaching,
 * the watchlist move explainer — needs the same plumbing: check the daily
 * allowance and show the upsell when it is spent, hold an AbortController that
 * is cancelled on unmount, treat an abort as silence rather than an error, and
 * record the question once a non-empty answer has landed. Four copies of that
 * drifted (the lesson sheet never metered at all), so it lives here once.
 *
 * Screens keep their own streaming text and error presentation; this hook only
 * returns an `AskOutcome` for them to render.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { askService, type AskContext } from '@/services/ask';
import { useAppStore, useEntitlement } from '@/store/slices/useAppStore';
import { toDayISO } from '@/lib/dates';
import { asksRemaining, canAsk } from './index';
import { settleAsk, type AskOutcome, type AskSettled } from './outcome';

export interface AskRequest {
  /** The text actually sent to the advisor (may carry folded-in context). */
  question: string;
  context: AskContext;
  onDelta: (delta: string) => void;
  /** What to file in history; defaults to `question`. */
  historyQuestion?: string;
  /** Copy for a failure the service did not classify. */
  fallbackMessage?: string;
  /** Runs once the allowance check has passed, just before the request starts. */
  onStart?: () => void;
}

export function useAsk() {
  const profile = useAppStore((s) => s.profile);
  const recordAsk = useAppStore((s) => s.recordAsk);
  const unlimited = useEntitlement().unlimitedAsk;
  const [upsellOpen, setUpsellOpen] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const today = toDayISO();
  const remaining = asksRemaining(profile, today, unlimited);
  const allowed = canAsk(profile, today, unlimited);

  // Leaving the screen (or unmounting the sheet) must stop paying for tokens
  // nobody will read.
  useEffect(() => () => controller.current?.abort(), []);

  const abort = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
  }, []);

  const ask = useCallback(
    async ({ question, context, onDelta, historyQuestion, fallbackMessage, onStart }: AskRequest): Promise<AskOutcome> => {
      // Read the live profile: the memoised `allowed` can lag a just-recorded ask.
      if (!canAsk(useAppStore.getState().profile, toDayISO(), unlimited)) {
        setUpsellOpen(true);
        return { status: 'blocked' };
      }

      controller.current?.abort();
      const next = new AbortController();
      controller.current = next;
      onStart?.();

      let settled: AskSettled;
      try {
        settled = { ok: true, answer: await askService.ask(question, context, onDelta, next.signal) };
      } catch (error) {
        settled = { ok: false, error };
      } finally {
        if (controller.current === next) controller.current = null;
      }

      const outcome = settleAsk(settled, next.signal.aborted, fallbackMessage ?? 'Something went wrong.');
      if (outcome.status === 'answered') {
        await recordAsk(historyQuestion ?? question, outcome.answer);
      }
      return outcome;
    },
    [recordAsk, unlimited],
  );

  const openUpsell = useCallback(() => setUpsellOpen(true), []);
  const closeUpsell = useCallback(() => setUpsellOpen(false), []);

  // A stable object, so screens can list it as a single dependency.
  return useMemo(
    () => ({ ask, abort, allowed, remaining, unlimited, upsellOpen, openUpsell, closeUpsell }),
    [ask, abort, allowed, remaining, unlimited, upsellOpen, openUpsell, closeUpsell],
  );
}
