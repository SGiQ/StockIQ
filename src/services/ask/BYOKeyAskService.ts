import Anthropic from '@anthropic-ai/sdk';
import { fetch as expoFetch } from 'expo/fetch';
import * as SecureStore from 'expo-secure-store';
import { describeCard } from './cardContext';
import { AskError, type AskContext, type AskService } from './types';

const KEY_STORE = 'stockiq_anthropic_api_key';

/**
 * Claude Opus 4.8. Adaptive thinking with low effort: these are short,
 * tightly-scoped explanations, so low effort keeps latency down — and leaving
 * adaptive thinking ON (rather than omitting the parameter) avoids Opus 4.8's
 * tendency to write its reasoning into the visible answer when thinking is
 * off.
 */
const MODEL = 'claude-opus-4-8';

/**
 * Deliberately short. A tutor answer that runs long stops being a tutor
 * answer — the learner is mid-lesson on a phone.
 */
const MAX_TOKENS = 1024;

const SYSTEM_PROMPT = `You are the StockiQ tutor. A learner is part-way through a short card-based lesson on the stock market and has tapped ASK on the card described below.

Rules:
- Answer only about the concept on the current card and ideas directly adjacent to it. If the question is off-topic, say so in one sentence and point back to the card.
- 120 words maximum. Plain language. No headings, no markdown, at most three short bullets.
- Explain, do not quiz. The learner asked because something did not land.
- You are NOT a financial adviser. Never recommend a specific security, never suggest buying or selling anything, never give allocation or position-sizing advice for the learner personally, and never predict a price. If asked, say plainly that you teach concepts and cannot advise, then offer the underlying concept instead.
- Reply with the final answer only. No preamble, no restating the question, no meta-commentary about your process.`;

export class BYOKeyAskService implements AskService {
  async isConfigured(): Promise<boolean> {
    return Boolean(await this.readKey());
  }

  async saveKey(key: string): Promise<void> {
    await SecureStore.setItemAsync(KEY_STORE, key.trim(), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  async clearKey(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY_STORE);
  }

  private async readKey(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(KEY_STORE);
    } catch {
      // SecureStore is unavailable on web; treat as unconfigured rather than
      // crashing the sheet.
      return null;
    }
  }

  async ask(
    question: string,
    context: AskContext,
    onDelta: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const apiKey = await this.readKey();
    if (!apiKey) {
      throw new AskError('not_configured', 'No API key saved.');
    }

    const client = new Anthropic({
      apiKey,
      /**
       * React Native's built-in fetch cannot stream a response body — it
       * buffers the whole thing, so SDK streaming silently degrades to a long
       * pause followed by everything at once. expo/fetch is WinterCG-compliant
       * and streams for real. This fails quietly if missed, which is why it is
       * pinned here rather than left to the default.
       */
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      // React Native is a browser-like environment as far as the SDK is
      // concerned. The key is the learner's own, held in the device keychain.
      dangerouslyAllowBrowser: true,
      maxRetries: 1,
    });

    /*
     * No cache_control breakpoint here on purpose: Opus 4.8's minimum
     * cacheable prefix is 4096 tokens and this system prompt is a few hundred,
     * so a breakpoint would silently never cache while still implying it does.
     */
    try {
      const stream = client.messages.stream(
        {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          thinking: { type: 'adaptive' },
          output_config: { effort: 'low' },
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: [
                    `Course: ${context.courseTitle}`,
                    `Lesson: ${context.lessonTitle}`,
                    '',
                    'The card currently on screen:',
                    describeCard(context.card),
                    '',
                    `Learner's question: ${question}`,
                  ].join('\n'),
                },
              ],
            },
          ],
        },
        { signal },
      );

      stream.on('text', onDelta);

      const message = await stream.finalMessage();

      // Opus 4.8 can decline outright; content is empty or partial when it
      // does, so this has to be checked before reading the text.
      if (message.stop_reason === 'refusal') {
        throw new AskError(
          'refused',
          'Claude declined to answer that one. Try rephrasing it around the concept.',
        );
      }

      return message.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');
    } catch (error) {
      throw toAskError(error);
    }
  }
}

/**
 * Maps SDK errors onto reasons the sheet can act on. Ordered most-specific
 * first, and APIConnectionError before APIError because in the TypeScript SDK
 * it is a subclass.
 */
function toAskError(error: unknown): AskError {
  if (error instanceof AskError) return error;

  if (error instanceof Anthropic.AuthenticationError) {
    return new AskError('bad_key', 'That API key was rejected. Check it in Settings.');
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return new AskError('bad_key', 'That key does not have access to this model.');
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AskError('rate_limited', 'Rate limited by the API. Try again in a moment.');
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AskError('offline', 'Could not reach the API. Check your connection.');
  }
  if (error instanceof Anthropic.APIError) {
    return new AskError('unknown', error.message);
  }
  return new AskError('unknown', error instanceof Error ? error.message : 'Something went wrong.');
}
