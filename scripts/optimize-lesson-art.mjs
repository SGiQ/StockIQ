/**
 * Right-sizes lesson-art bitmaps for the app.
 *
 *     npm run art:optimize
 *
 * Generated paper-craft art tends to arrive at ~1536px and 3 MB, but the card
 * art panel is ~340 CSS px — under 700px even on a 2x phone. Shipping the full
 * file means every learner downloads ~10x more than the panel can show, and 45
 * of them would bloat the repo and every deploy by well over 100 MB.
 *
 * This resizes anything wider than the target (or heavier than the budget) to
 * 1200px wide at JPEG quality 80 — the size and quality of the existing heroes
 * — in place. It is idempotent: already-small files are skipped, so it is safe
 * to run after every art drop.
 *
 * Uses macOS `sips` (this is an author-machine step, like gen:speech). If you
 * build art on another OS, swap the resize command for ImageMagick or sharp.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const DIR = join(process.cwd(), 'public', 'lesson-art');
const MAX_WIDTH = 1200; // plenty for a ~340px panel at 3x
const QUALITY = 80;
// Only touch clearly-oversized drops (freshly generated art is ~1536px / 3 MB).
// Existing hand-tuned art near the target is left alone, so re-running never
// re-compresses good files and loses a generation of quality.
const WIDTH_TRIGGER = 1500;
const SIZE_TRIGGER = 1024 * 1024;

const widthOf = (file) =>
  Number(
    execFileSync('sips', ['-g', 'pixelWidth', file], { encoding: 'utf8' })
      .match(/pixelWidth:\s*(\d+)/)?.[1] ?? 0,
  );

let optimized = 0;
let skipped = 0;
let savedBytes = 0;

for (const name of readdirSync(DIR)) {
  if (!/\.(jpe?g)$/i.test(name)) continue; // PNGs are rare here; leave them
  const file = join(DIR, name);
  const before = statSync(file).size;
  const width = widthOf(file);

  if (width <= WIDTH_TRIGGER && before <= SIZE_TRIGGER) {
    skipped++;
    continue;
  }

  execFileSync('sips', [
    '--resampleWidth', String(MAX_WIDTH),
    '-s', 'format', 'jpeg',
    '-s', 'formatOptions', String(QUALITY),
    file,
  ], { stdio: 'ignore' });

  const after = statSync(file).size;
  savedBytes += before - after;
  optimized++;
  const kb = (n) => `${Math.round(n / 1024)}KB`;
  console.log(`  ${name}: ${width}px ${kb(before)} -> ${MAX_WIDTH}px ${kb(after)}`);
}

console.log(
  `\n  optimized ${optimized}, skipped ${skipped} (already small); ` +
    `saved ${(savedBytes / 1024 / 1024).toFixed(1)} MB\n`,
);
