import type { Card } from './types';
import { parseRichText } from './richtext';

/**
 * What a card sounds like when read aloud.
 *
 * This is deliberately NOT `toPlainText`. That projection renders a fill-blank
 * slot as `____`, which a screen reader or a TTS engine pronounces as a run of
 * underscores; spoken, the slot has to become the word "blank" for the
 * sentence to survive. Word counts and ASK context still want the visual
 * projection, so the two stay separate rather than one growing a flag.
 */
function speak(rich: string): string {
  return parseRichText(rich)
    .nodes.map((n) => {
      switch (n.kind) {
        case 'text':
        case 'bold':
        // A cross-link reads as its label. The fact that it is tappable is not
        // audible, and announcing it would interrupt the sentence.
        case 'link':
          return n.text;
        case 'blank':
          return 'blank';
      }
    })
    .join('');
}

/**
 * Joins the spoken parts of a card.
 *
 * Segments are separated by a full stop rather than a space because TTS uses
 * punctuation for prosody: without it a headline runs straight into the body
 * in one breath, which is the single thing that makes narration sound
 * synthetic. Segments that already end in terminal punctuation are left alone
 * so nothing is read as "shares..".
 */
function join(segments: (string | undefined | null)[]): string | null {
  const parts = segments
    .map((s) => (s ?? '').trim())
    .filter((s) => s.length > 0)
    .map((s) => (/[.!?:]$/.test(s) ? s : `${s}.`));

  return parts.length > 0 ? parts.join(' ') : null;
}

/** Must stay identical to the generated manifest's feedback-key convention. */
export const narrationFeedbackCardId = (cardId: string, correct: boolean): string =>
  `${cardId}:feedback-${correct ? 'correct' : 'incorrect'}`;

/**
 * The narration script for one card, or null when a card has nothing to say.
 *
 * Scope is the teaching prose and nothing else. Answer options, word banks and
 * explanations are excluded from this pre-answer script: narration runs as
 * the card appears, so reading them aloud would hand over the answer before
 * the learner has had a chance at it.
 *
 * The question on an interactive card *is* read, because hearing the prompt is
 * how an audio-first learner knows what is being asked — it sets the problem
 * without giving it away.
 */
export function narrationTextFor(card: Card): string | null {
  switch (card.type) {
    case 'concept':
      return join([speak(card.headline), speak(card.body)]);

    case 'diagram':
      // The art carries the content here, so the caption is the whole script.
      return join([card.title, speak(card.caption)]);

    case 'sticker_reveal':
      // Sticker labels are the reveal itself — they arrive as the learner taps,
      // so speaking them up front would pre-empt the interaction.
      return join([speak(card.body)]);

    case 'binary_choice':
      return join([speak(card.prompt)]);

    case 'fill_blank':
      // Reads the sentence with "blank" where the slot is, which is exactly how
      // a person would read it aloud. The word bank stays unspoken.
      return join([speak(card.body)]);

    case 'main_idea':
      return join([card.title, speak(card.summary), ...card.bullets.map(speak)]);

    case 'key_insight':
      // `insight` is plain text by schema, not rich — no parsing needed.
      return join([card.insight, card.attribution?.source]);

    default: {
      // Adding a card type without deciding how it sounds is a compile error,
      // matching CardRenderer's guard.
      const exhaustive: never = card;
      return exhaustive;
    }
  }
}

/**
 * Spoken only after a learner commits to a quiz answer.
 *
 * Keeping this separate from `narrationTextFor` is the anti-spoiler boundary:
 * no correct answer or explanation can enter the clip loaded before Check
 * Answer. A wrong fill-blank response includes the answer because the same
 * information is now visible on screen; a correct response avoids repeating
 * it and moves straight to the explanation.
 */
export function quizFeedbackNarrationTextFor(card: Card, correct: boolean): string | null {
  switch (card.type) {
    case 'binary_choice':
      return join([correct ? 'Correct' : 'Not quite', speak(card.explanation)]);
    case 'fill_blank':
      return join([
        correct ? 'Correct' : `Not quite. The answer is ${card.answer}`,
        card.explanation ? speak(card.explanation) : null,
      ]);
    default:
      return null;
  }
}
