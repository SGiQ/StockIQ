/** Uploads generated narration clips to StockiQ's public Cloudflare R2 bucket. */
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const BUCKET = 'stockiq-narration';
const SPEECH_DIR = path.join(process.cwd(), 'public', 'speech');
const WRANGLER = path.join(process.cwd(), 'workers', 'ask', 'node_modules', '.bin', 'wrangler');
const CONCURRENCY = 8;
const MAX_ATTEMPTS = 3;

async function clips(): Promise<string[]> {
  const files: string[] = [];
  for (const voice of ['female', 'male']) {
    const dir = path.join(SPEECH_DIR, voice);
    for (const name of await readdir(dir)) {
      if (name.endsWith('.mp3')) files.push(path.join(dir, name));
    }
  }
  return files;
}

function put(file: string): Promise<void> {
  const key = path.relative(SPEECH_DIR, file).split(path.sep).join('/');
  const args = [
    'r2', 'object', 'put', `${BUCKET}/${key}`,
    '--file', file,
    '--content-type', 'audio/mpeg',
    '--cache-control', 'public, max-age=31536000, immutable',
    '--remote', '--force',
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(WRANGLER, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${key}: ${output.trim() || `wrangler exited ${code}`}`));
    });
  });
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function putWithRetry(file: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await put(file);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await delay(attempt * 1_000);
    }
  }
  throw lastError;
}

async function main() {
  const files = await clips();
  if (files.length === 0) throw new Error('No MP3 files found. Run `npm run gen:speech` first.');

  console.log(`\nUploading ${files.length} narration clips to R2 bucket ${BUCKET}…\n`);
  let next = 0;
  let done = 0;
  const failures: string[] = [];

  async function worker() {
    while (next < files.length) {
      const file = files[next++];
      try {
        await putWithRetry(file);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
      done++;
      if (done % 25 === 0 || done === files.length) console.log(`  ${done}/${files.length} uploaded`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  if (failures.length > 0) {
    throw new Error(`${failures.length} upload(s) failed:\n${failures.slice(0, 10).join('\n')}`);
  }
  console.log('\n✔ Narration upload complete.\n');
}

main().catch((error) => {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
