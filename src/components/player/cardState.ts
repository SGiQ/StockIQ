/**
 * Per-card interaction state and the advance gate.
 *
 * The gate is the mechanic a naive card-deck clone gets wrong. In Imprint,
 * tapping forward on an unanswered question does nothing — the deck refuses
 * until you have committed to an answer. Without that, every quiz card is
 * skippable and the whole retention mechanic evaporates.
 */
import type { Card, CardId } from '@/content/types';

export type CardUiState =
  | { kind: 'passive' }
  | { kind: 'sticker'; revealed: number }
  | { kind: 'choice'; selected?: string; checked: boolean; correct?: boolean }
  | { kind: 'blank'; choicesOpen: boolean; picked?: string; checked: boolean; correct?: boolean };

export type CardStateMap = Record<CardId, CardUiState>;

export function initialStateFor(card: Card): CardUiState {
  switch (card.type) {
    case 'sticker_reveal':
      return { kind: 'sticker', revealed: 0 };
    case 'binary_choice':
      return { kind: 'choice', checked: false };
    case 'fill_blank':
      return { kind: 'blank', choicesOpen: false, checked: false };
    default:
      return { kind: 'passive' };
  }
}

/**
 * Whether a forward tap or swipe may leave this card.
 *
 * Sticker cards consume taps to reveal, and only release the deck once every
 * sticker is out; quiz cards hold until the answer has been checked.
 */
export function canAdvance(card: Card, state: CardUiState | undefined): boolean {
  const resolved = state ?? initialStateFor(card);

  switch (card.type) {
    case 'sticker_reveal':
      return resolved.kind === 'sticker' && resolved.revealed >= card.stickers.length;
    case 'binary_choice':
      return resolved.kind === 'choice' && resolved.checked;
    case 'fill_blank':
      return resolved.kind === 'blank' && resolved.checked;
    default:
      return true;
  }
}

/**
 * Whether a tap on the card body itself should be consumed as an
 * interaction rather than falling through to the forward tap zone. Only
 * sticker cards do this — everything else routes taps to navigation.
 */
export function consumesTap(card: Card, state: CardUiState | undefined): boolean {
  if (card.type !== 'sticker_reveal') return false;
  const resolved = state ?? initialStateFor(card);
  return resolved.kind === 'sticker' && resolved.revealed < card.stickers.length;
}

/** Whether this card counts toward the lesson's clean-run star. */
export const isInteractive = (card: Card): boolean =>
  card.type === 'binary_choice' || card.type === 'fill_blank';

/** Extracts the answer verdict once a quiz card has been checked. */
export function verdictOf(state: CardUiState | undefined): boolean | undefined {
  if (!state) return undefined;
  if (state.kind === 'choice' || state.kind === 'blank') {
    return state.checked ? state.correct : undefined;
  }
  return undefined;
}
