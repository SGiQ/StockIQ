/** Generate three short male-voice auditions without touching lesson audio. */
import { loadEnvFile } from 'node:process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MODEL = 'gpt-4o-mini-tts-2025-12-15';
const ENDPOINT = 'https://api.openai.com/v1/audio/speech';
const OUT_DIR = path.join(process.cwd(), 'public', 'voice-previews');
const VOICES = ['cedar', 'ash', 'echo'] as const;
const TEXT =
  'A chart plots price against time. Every point records a trade that has already happened. The chart is evidence, not a prediction.';
const INSTRUCTIONS =
  'Read as a calm, confident documentary narrator teaching an investing concept. ' +
  'Measured pace, warm but restrained, with natural pauses. Never sound promotional.';

try {
  loadEnvFile(path.join(process.cwd(), '.env'));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

async function render(apiKey: string, voice: (typeof VOICES)[number]) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      voice,
      input: TEXT,
      instructions: INSTRUCTIONS,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenAI TTS ${response.status}: ${detail.slice(0, 400)}`);
  }

  await writeFile(path.join(OUT_DIR, `${voice}.mp3`), Buffer.from(await response.arrayBuffer()));
  console.log(`  rendered ${voice}`);
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set in the ignored root .env file.');

  await mkdir(OUT_DIR, { recursive: true });
  for (const voice of VOICES) await render(apiKey, voice);
  console.log(`\n✔ Voice auditions written to ${path.relative(process.cwd(), OUT_DIR)}\n`);
}

main().catch((error) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
