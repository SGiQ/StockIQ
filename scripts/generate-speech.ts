/**
 * Renders every card's narration to audio with OpenAI text-to-speech.
 *
 *     OPENAI_API_KEY=sk-... npm run gen:speech
 *
 * Build-time, not runtime. The content is static and authored ahead of time,
 * so speech can be rendered once and shipped as files. That choice is what
 * keeps the API key on the author's machine: an API key cannot be shipped
 * inside a client app (the same wall ASK hit, which is why a proxy Worker
 * exists for it), and here the problem simply does not arise. Playback is also
 * instant and works offline, and every clip can be listened to before a
 * learner hears it.
 *
 * Output is content-addressed: the filename is a hash of model + voice + the
 * exact text. Editing one card's copy re-renders that card and nothing else,
 * and two cards that happen to share a line share a file. Re-running with no
 * content change costs nothing and calls no API.
 */
import { createHash } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { allBooks, allLessons, allStrategies } from '../src/content/index.generated';
import {
  narrationFeedbackCardId,
  narrationTextFor,
  quizFeedbackNarrationTextFor,
} from '../src/content/narration';
import type { Card } from '../src/content/types';

/**
 * The two voices offered in settings.
 *
 * `onyx` and `nova` are the closest to a documentary narrator in OpenAI's
 * set — the register the lessons are written in. They are labelled by the
 * choice a learner makes, not by the vendor's name, so swapping a voice later
 * does not change the stored preference.
 */
const VOICES = {
  male: 'onyx',
  female: 'nova',
} as const;

export type NarrationVoice = keyof typeof VOICES;

/**
 * `gpt-4o-mini-tts` is the current model and the cheapest of the three; at
 * this volume the whole library renders for a few dollars in both voices.
 */
const MODEL = 'gpt-4o-mini-tts';

/**
 * Steers delivery. The lessons teach rather than sell, and the default read is
 * a shade too bright for the subject.
 */
const INSTRUCTIONS =
  'Read as a calm, clear documentary narrator teaching a concept. Measured pace, ' +
  'natural pauses at punctuation. Do not sound like an advertisement.';

const OUT_DIR = path.join(process.cwd(), 'public', 'speech');
const MANIFEST = path.join(process.cwd(), 'src', 'content', 'speech.generated.ts');
const ENDPOINT = 'https://api.openai.com/v1/audio/speech';

// `tsx` does not load Expo's local environment files. Load the ignored root
// `.env` explicitly so authors do not need to place a secret in the command.
try {
  loadEnvFile(path.join(process.cwd(), '.env'));
} catch (error) {
  const code = (error as NodeJS.ErrnoException).code;
  if (code !== 'ENOENT') throw error;
}

/** Deck-qualified so a card id only has to be unique within its own deck. */
function cardKey(deckId: string, cardId: string): string {
  return `${deckId}#${cardId}`;
}

function hashFor(voice: string, text: string): string {
  return createHash('sha256')
    .update(`${MODEL}\0${voice}\0${INSTRUCTIONS}\0${text}`)
    .digest('hex')
    .slice(0, 16);
}

interface Job {
  key: string;
  text: string;
  voice: NarrationVoice;
  hash: string;
}

function collectDecks(): { id: string; cards: Card[] }[] {
  return [
    ...allLessons.map((l) => ({ id: `lesson:${l.courseId}/${l.id}`, cards: l.cards })),
    ...allBooks.map((b) => ({ id: `book:${b.id}`, cards: (b.guideCards ?? []) as Card[] })),
    ...allStrategies.map((s) => ({
      id: `strategy:${s.id}`,
      cards: (s.guideCards ?? []) as Card[],
    })),
  ];
}

async function synthesise(apiKey: string, voice: string, text: string): Promise<Buffer> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      voice,
      input: text,
      instructions: INSTRUCTIONS,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    // The body carries OpenAI's own message, which is far more actionable than
    // the status alone — an unfunded account and a bad key both return 401.
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenAI TTS ${response.status}: ${detail.slice(0, 400)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const check = process.argv.includes('--check');

  // Fail loudly rather than silently emitting a half-empty manifest, matching
  // how the mailer treats missing configuration.
  if (!apiKey && !check) {
    console.error(
      '\n✖  OPENAI_API_KEY is not set.\n\n' +
        '   Speech is rendered on your machine, so the key never ships in the app.\n' +
        '   Create a key at https://platform.openai.com/api-keys, then either:\n\n' +
        '     OPENAI_API_KEY=sk-... npm run gen:speech\n\n' +
        '   or add OPENAI_API_KEY to .env (already git-ignored).\n\n' +
        '   Run `npm run gen:speech -- --check` to see what would be generated\n' +
        '   and what it costs, without a key and without calling the API.\n',
    );
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const manifest: Record<string, Record<string, string>> = {};
  const jobs: Job[] = [];
  const wanted = new Set<string>();

  for (const deck of collectDecks()) {
    for (const card of deck.cards) {
      const scripts = [
        { cardId: card.id, text: narrationTextFor(card) },
        { cardId: narrationFeedbackCardId(card.id, true), text: quizFeedbackNarrationTextFor(card, true) },
        { cardId: narrationFeedbackCardId(card.id, false), text: quizFeedbackNarrationTextFor(card, false) },
      ];

      for (const script of scripts) {
        if (!script.text) continue;
        const key = cardKey(deck.id, script.cardId);

        for (const voice of Object.keys(VOICES) as NarrationVoice[]) {
          const hash = hashFor(VOICES[voice], script.text);
          (manifest[key] ??= {})[voice] = hash;
          wanted.add(`${voice}/${hash}.mp3`);

          const file = path.join(OUT_DIR, voice, `${hash}.mp3`);
          const exists = await readFile(file).then(
            () => true,
            () => false,
          );
          if (!exists) jobs.push({ key, text: script.text, voice, hash });
        }
      }
    }
  }

  const chars = jobs.reduce((n, j) => n + j.text.length, 0);
  console.log(
    `\n  cards with narration: ${Object.keys(manifest).length}\n` +
      `  clips needed:         ${wanted.size}\n` +
      `  to generate now:      ${jobs.length} (${chars.toLocaleString()} chars)\n` +
      `  estimated cost:       $${((chars / 1_000_000) * 12).toFixed(2)}\n`,
  );

  if (check) {
    console.log('  --check: nothing generated, no API calls made.\n');
    return;
  }

  let done = 0;
  for (const job of jobs) {
    const audio = await synthesise(apiKey!, VOICES[job.voice], job.text);
    await mkdir(path.join(OUT_DIR, job.voice), { recursive: true });
    await writeFile(path.join(OUT_DIR, job.voice, `${job.hash}.mp3`), audio);
    done++;
    if (done % 20 === 0 || done === jobs.length) {
      console.log(`  ${done}/${jobs.length} rendered`);
    }
  }

  // Copy edits leave the old clip behind; without this the directory only ever
  // grows, and every orphan is deployed.
  let pruned = 0;
  for (const voice of Object.keys(VOICES)) {
    const dir = path.join(OUT_DIR, voice);
    const files = await readdir(dir).catch(() => [] as string[]);
    for (const f of files) {
      if (!f.endsWith('.mp3')) continue;
      if (!wanted.has(`${voice}/${f}`)) {
        await unlink(path.join(dir, f));
        pruned++;
      }
    }
  }
  if (pruned > 0) console.log(`  pruned ${pruned} orphaned clip(s)`);

  const body =
    `/**\n` +
    ` * GENERATED by scripts/generate-speech.ts — do not edit.\n` +
    ` *\n` +
    ` * Maps a deck-qualified card key to the content hash of its audio, per\n` +
    ` * voice. Files live at /speech/{voice}/{hash}.mp3.\n` +
    ` */\n\n` +
    `export type NarrationVoice = 'male' | 'female';\n\n` +
    `export const SPEECH_MANIFEST: Record<string, Record<NarrationVoice, string>> = ${JSON.stringify(
      manifest,
      null,
      2,
    )};\n`;
  await writeFile(MANIFEST, body);

  console.log(`\n✔  Wrote ${path.relative(process.cwd(), MANIFEST)}\n`);
}

main().catch((error) => {
  console.error(`\n✖  ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
