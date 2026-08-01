import { Platform } from 'react-native';
import { SPEECH_URL } from '@/config';
import {
  SPEECH_MANIFEST,
  type NarrationVoice,
} from '@/content/speech.generated';

export type NarrationDeckId =
  | `lesson:${string}/${string}`
  | `book:${string}`
  | `strategy:${string}`;

/** Must stay identical to scripts/generate-speech.ts's key convention. */
export const narrationCardKey = (deckId: NarrationDeckId, cardId: string): string =>
  `${deckId}#${cardId}`;

export function narrationPathFor(
  deckId: NarrationDeckId,
  cardId: string,
  voice: NarrationVoice,
): string | null {
  const hash = SPEECH_MANIFEST[narrationCardKey(deckId, cardId)]?.[voice];
  return hash ? `/speech/${voice}/${hash}.mp3` : null;
}

/**
 * Resolves a static clip without ever exposing an API credential.
 *
 * On web, speech is served beside the exported app. Native cannot address a
 * web `public/` directory, so it uses the configured public deployment/CDN
 * origin. Missing configuration or a manifest miss intentionally returns
 * null: narration is an enhancement and must never block a lesson.
 */
export function narrationUrlFor(
  deckId: NarrationDeckId,
  cardId: string,
  voice: NarrationVoice,
): string | null {
  const path = narrationPathFor(deckId, cardId, voice);
  if (!path) return null;
  // `public/speech` maps to `/speech` in a same-origin web build. The R2
  // bucket stores that directory's contents at its root, so its public URL is
  // `/female/hash.mp3` or `/male/hash.mp3`, without the local folder prefix.
  if (SPEECH_URL) return `${SPEECH_URL}${path.replace(/^\/speech/, '')}`;
  return Platform.OS === 'web' ? path : null;
}

export type { NarrationVoice };
