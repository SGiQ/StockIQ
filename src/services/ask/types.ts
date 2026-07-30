import type { Card } from '@/content/types';

export interface AskContext {
  card: Card;
  lessonTitle: string;
  courseTitle: string;
}

export type AskFailure =
  | 'not_configured'
  | 'bad_key'
  | 'rate_limited'
  | 'offline'
  | 'refused'
  | 'unknown';

export class AskError extends Error {
  constructor(
    readonly reason: AskFailure,
    message: string,
  ) {
    super(message);
    this.name = 'AskError';
  }
}

export interface AskService {
  /**
   * Streams an answer, calling `onDelta` with each text chunk. Resolves with
   * the full text. Throws an AskError with a reason the UI can act on.
   */
  ask(
    question: string,
    context: AskContext,
    onDelta: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string>;

  isConfigured(): Promise<boolean>;
  saveKey(key: string): Promise<void>;
  clearKey(): Promise<void>;
}

/** Starter chips shown before the learner types anything. */
export const SUGGESTED_QUESTIONS = [
  'Explain this more simply',
  'Give me a concrete example',
  'Why does this matter?',
] as const;
