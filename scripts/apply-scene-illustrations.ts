/**
 * Swaps animated `scene` art for paper-craft `illustration` art, one scene at
 * a time, as the images land.
 *
 *     npm run art:apply-scenes            # convert every scene whose image exists
 *     npm run art:apply-scenes -- --dry-run   # report only, write nothing
 *
 * A scene card is rewritten to an illustration ONLY when
 * public/lesson-art/{scene}.jpg is present. Anything still missing is left as
 * a working animated scene and listed as pending, so this is safe to run
 * repeatedly while art is generated in batches — it never creates a broken
 * reference, and the validator's existence check is the backstop if one slips
 * through.
 *
 * The scene's `alt` carries straight over to the illustration; it was already
 * written as a plain-language description of the same picture.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const LESSONS = join(ROOT, 'content', 'lessons');
const ART_DIR = join(ROOT, 'public', 'lesson-art');
const dryRun = process.argv.includes('--dry-run');

function lessonFiles(): string[] {
  const out: string[] = [];
  for (const course of readdirSync(LESSONS, { withFileTypes: true })) {
    if (!course.isDirectory()) continue;
    const dir = join(LESSONS, course.name);
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.json')) out.push(join(dir, f));
    }
  }
  return out;
}

const converted: string[] = [];
const pending = new Set<string>();

for (const file of lessonFiles()) {
  const raw = readFileSync(file, 'utf8');
  const lesson = JSON.parse(raw);
  let changed = false;

  for (const card of lesson.cards ?? []) {
    const art = card.art;
    if (!art || art.kind !== 'scene') continue;

    const name: string = art.name;
    if (existsSync(join(ART_DIR, `${name}.jpg`))) {
      card.art = {
        kind: 'illustration',
        source: `/lesson-art/${name}.jpg`,
        alt: art.alt,
      };
      converted.push(`${lesson.id} · ${name}`);
      changed = true;
    } else {
      pending.add(name);
    }
  }

  if (changed && !dryRun) {
    // 2-space indent + trailing newline to match the rest of content/.
    writeFileSync(file, `${JSON.stringify(lesson, null, 2)}\n`);
  }
}

console.log(
  `\n  ${dryRun ? '[dry run] ' : ''}converted ${converted.length} scene card(s) to illustrations` +
    `\n  ${pending.size} scene image(s) still missing\n`,
);
for (const c of converted) console.log(`  ✓ ${c}`);
if (pending.size > 0) {
  console.log(`\n  still to generate (public/lesson-art/<name>.jpg):`);
  for (const name of [...pending].sort()) console.log(`    ${name}.jpg`);
}
if (converted.length > 0 && !dryRun) {
  console.log(`\n  Next: npm run gen:content   (validate + regenerate the index)\n`);
}
