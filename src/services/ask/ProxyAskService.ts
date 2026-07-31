import { fetch as expoFetch } from 'expo/fetch';
import { ASK_PROXY_URL } from '@/config';
import { getDeviceId } from '@/lib/deviceId';
import { describeCard } from './cardContext';
import { AskError, type AskContext, type AskService } from './types';

/**
 * ASK via the Cloudflare Worker.
 *
 * As promised in Phase 4, this differs from `BYOKeyAskService` only in where
 * the request goes: no key on the device, no Anthropic SDK, and the system
 * prompt lives on the server where a modified client cannot strip the
 * not-advice rules.
 *
 * `expo/fetch` again rather than the global: React Native's built-in `fetch`
 * returns a null `response.body`, so the stream could not be read
 * incrementally and the answer would arrive in one block after a long pause.
 */
export class ProxyAskService implements AskService {
  constructor(private readonly baseUrl: string = ASK_PROXY_URL) {}

  /** The proxy holds the key, so there is nothing on-device to configure. */
  async isConfigured(): Promise<boolean> {
    return this.baseUrl.length > 0;
  }

  /** No key lives on the device in this mode; both are deliberate no-ops. */
  async saveKey(): Promise<void> {}
  async clearKey(): Promise<void> {}

  async ask(
    question: string,
    context: AskContext,
    onDelta: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    if (!this.baseUrl) {
      throw new AskError('not_configured', 'No ASK proxy URL is configured.');
    }

    let response: Response;
    try {
      response = (await expoFetch(`${this.baseUrl}/v1/ask`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': await getDeviceId(),
        },
        body: JSON.stringify({
          question,
          card: describeCard(context.card),
          lessonTitle: context.lessonTitle,
          courseTitle: context.courseTitle,
        }),
        signal,
      })) as unknown as Response;
    } catch (error) {
      if (signal?.aborted) return '';
      throw new AskError(
        'offline',
        error instanceof Error ? error.message : 'Could not reach the tutor.',
      );
    }

    if (response.status === 429) {
      throw new AskError('rate_limited', 'You have reached today’s question limit.');
    }
    if (!response.ok) {
      throw new AskError('unknown', `The tutor is unavailable (${response.status}).`);
    }
    if (!response.body) {
      throw new AskError('unknown', 'The tutor returned no response body.');
    }

    return this.readStream(response.body, onDelta, signal);
  }

  /**
   * Reads Anthropic's SSE stream.
   *
   * Chunks split anywhere, including mid-line and mid-UTF-8-character, so the
   * decoder is streaming and the tail of a partial line is carried into the
   * next chunk. Parsing per-chunk instead would silently drop or mangle text.
   */
  private async readStream(
    body: ReadableStream<Uint8Array>,
    onDelta: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (signal?.aborted) break;

        buffer += decoder.decode(value, { stream: true });

        // Keep the final element: it is either an empty string (clean break)
        // or an incomplete line that the next chunk finishes.
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;

          let event: { type?: string; delta?: { type?: string; text?: string } };
          try {
            event = JSON.parse(data);
          } catch {
            continue; // a keep-alive or a comment line, not an event
          }

          // Only surface visible text. `thinking_delta` events also arrive on
          // this stream and must never be shown to the learner.
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            const text = event.delta.text ?? '';
            if (text) {
              full += text;
              onDelta(text);
            }
          }
        }
      }
    } finally {
      await reader.cancel().catch(() => {});
    }

    return full;
  }
}
