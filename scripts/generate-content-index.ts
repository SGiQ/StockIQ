/**
 * Emits src/content/index.generated.ts.
 *
 * Metro cannot resolve `require(someVariable)`, so content genuinely cannot
 * be loaded dynamically at runtime in a React Native bundle. Every JSON file
 * has to be reachable through a statically analysable import. This script
 * walks content/ and writes those imports out.
 *
 * Run via `npm run gen:content`, which is itself wired into `prestart`, so
 * adding a JSON file to content/ is all an author ever has to do.
 *
 * The emitted file casts through `unknown` because TypeScript infers JSON
 * string fields as `string` rather than the literal types the discriminated
 * unions need. That cast is safe precisely because validate-content.ts runs
 * immediately before this script and fails the build on any shape error.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const CONTENT = join(ROOT, 'content');
const OUT = join(ROOT, 'src', 'content', 'index.generated.ts');
const LESSON_ART = join(ROOT, 'public', 'lesson-art');

function jsonFilesIn(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...jsonFilesIn(full));
    else if (entry.endsWith('.json')) out.push(full);
  }
  return out.sort();
}

/** "market-foundations/what-is-a-stock.json" -> "lesson_marketFoundations_whatIsAStock" */
function identifier(prefix: string, file: string, dir: string): string {
  const rel = relative(dir, file).replace(/\.json$/, '');
  const camel = rel
    .split(/[/\\]/)
    .map((segment) =>
      segment
        .split('-')
        .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
        .join(''),
    )
    .join('_');
  return `${prefix}_${camel}`;
}

/** Import specifier relative to src/content/, POSIX-separated for Metro. */
function importPath(file: string): string {
  const rel = relative(join(ROOT, 'src', 'content'), file).split('\\').join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

interface Collection {
  dir: string;
  prefix: string;
  type: string;
  /** Emitted export name for the array of all entries. */
  arrayName: string;
}

const COLLECTIONS: Collection[] = [
  { dir: 'courses', prefix: 'course', type: 'Course', arrayName: 'allCourses' },
  { dir: 'lessons', prefix: 'lesson', type: 'Lesson', arrayName: 'allLessons' },
  { dir: 'traders', prefix: 'trader', type: 'Trader', arrayName: 'allTraders' },
  { dir: 'strategies', prefix: 'strategy', type: 'Strategy', arrayName: 'allStrategies' },
  { dir: 'books', prefix: 'book', type: 'Book', arrayName: 'allBooks' },
  { dir: 'terms', prefix: 'term', type: 'Term', arrayName: 'allTerms' },
  { dir: 'weekly-notes', prefix: 'note', type: 'WeeklyNote', arrayName: 'allWeeklyNotes' },
];

const imports: string[] = [];
const exports: string[] = [];
let total = 0;

for (const collection of COLLECTIONS) {
  const dir = join(CONTENT, collection.dir);
  const files = jsonFilesIn(dir);
  total += files.length;

  const names = files.map((file) => {
    const name = identifier(collection.prefix, file, dir);
    imports.push(`import ${name} from '${importPath(file)}';`);
    return name;
  });

  const body = names.length
    ? `[\n${names.map((n) => `  ${n} as unknown as ${collection.type},`).join('\n')}\n]`
    : '[]';

  exports.push(`export const ${collection.arrayName}: ${collection.type}[] = ${body};`);
}

// Reads pixel dimensions straight out of the file header — no `sips`, no
// image library, no native binary. Runs on Linux CI as happily as on the
// author's Mac. Handles JPEG (scan for the SOFn marker) and PNG (IHDR chunk
// starts at byte 16), which is all this repo ships.
function imageSize(path: string): { w: number; h: number } | null {
  const fd = openSync(path, 'r');
  try {
    const head = Buffer.alloc(24);
    readSync(fd, head, 0, 24, 0);

    // PNG: 89 50 4E 47 0D 0A 1A 0A, then IHDR at 16 with width/height u32be
    if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
      return { w: head.readUInt32BE(16), h: head.readUInt32BE(20) };
    }

    // JPEG: FF D8 then a chain of FF <marker> <len:u16be> [payload]. The first
    // SOF0/1/2 marker (0xC0..0xCF except DHT/DAC/DNL/DHP/EXP) has height at
    // payload+1 and width at payload+3.
    if (head[0] === 0xff && head[1] === 0xd8) {
      let offset = 2;
      while (true) {
        const marker = Buffer.alloc(4);
        if (readSync(fd, marker, 0, 4, offset) < 4) break;
        if (marker[0] !== 0xff) break;
        const code = marker[1];
        const segLen = marker.readUInt16BE(2);
        // SOF0..SOF15 excluding DHT (C4), JPG (C8), DAC (CC)
        if (code >= 0xc0 && code <= 0xcf && code !== 0xc4 && code !== 0xc8 && code !== 0xcc) {
          const sof = Buffer.alloc(5);
          readSync(fd, sof, 0, 5, offset + 4);
          return { h: sof.readUInt16BE(1), w: sof.readUInt16BE(3) };
        }
        offset += 2 + segLen;
      }
    }
    return null;
  } finally {
    closeSync(fd);
  }
}

// Lesson-art aspect ratios (width / height) keyed by /lesson-art/<file>.jpg.
// Cards that need to frame an illustration at its true shape (key_insight
// posters) look this up so they don't cover-crop a landscape image to fit a
// square hole. Generated from the on-disk bitmap so authors never have to
// hand-maintain a parallel dimensions file.
const artRatios: Record<string, number> = {};
if (existsSync(LESSON_ART)) {
  for (const name of readdirSync(LESSON_ART)) {
    if (!/\.(jpe?g|png)$/i.test(name)) continue;
    const dim = imageSize(join(LESSON_ART, name));
    if (dim && dim.w > 0 && dim.h > 0) {
      artRatios[`/lesson-art/${name}`] = +(dim.w / dim.h).toFixed(4);
    }
  }
}

const artRatiosBody = Object.entries(artRatios)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `  '${k}': ${v},`)
  .join('\n');

const banner = `/**
 * AUTO-GENERATED by scripts/generate-content-index.ts — DO NOT EDIT.
 *
 * Regenerate with \`npm run gen:content\` (also runs on \`npm start\`).
 * Metro requires statically analysable imports, so every content file is
 * listed explicitly here rather than loaded dynamically.
 */
/* eslint-disable */
import type { Book, Course, Lesson, Strategy, Term, Trader, WeeklyNote } from './schema';
`;

const output = [
  banner,
  imports.join('\n'),
  '',
  exports.join('\n\n'),
  '',
  `export const lessonArtRatios: Record<string, number> = {\n${artRatiosBody}\n};`,
  '',
].join('\n');

writeFileSync(OUT, output, 'utf8');
console.log(
  `✔  Wrote ${relative(ROOT, OUT)} (${total} content file(s), ${Object.keys(artRatios).length} art dimensions).`,
);
