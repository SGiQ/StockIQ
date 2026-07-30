/**
 * Scaffolds content/lessons/<courseId>/<lessonId>.json.
 *
 * The stub is deliberately a *valid* lesson — 10 cards in the prescribed
 * order, one of every type, all placeholder prose inside the word budgets —
 * so `npm run validate:content` passes the moment it is created. An author
 * then replaces text rather than fighting the schema, and any structural
 * mistake they introduce shows up as a diff against something that worked.
 *
 * Usage: npm run new:lesson -- <courseId> <lessonId> "Lesson Title"
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

const [courseId, lessonId, ...titleParts] = process.argv.slice(2);
const title = titleParts.join(' ');

if (!courseId || !lessonId || !title) {
  console.error('Usage: npm run new:lesson -- <courseId> <lessonId> "Lesson Title"');
  process.exit(1);
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
for (const [name, value] of [
  ['courseId', courseId],
  ['lessonId', lessonId],
] as const) {
  if (!SLUG.test(value)) {
    console.error(`✖  ${name} "${value}" must be kebab-case (a-z, 0-9, single hyphens).`);
    process.exit(1);
  }
}

const dir = join(ROOT, 'content', 'lessons', courseId);
const file = join(dir, `${lessonId}.json`);

if (existsSync(file)) {
  console.error(`✖  ${relative(ROOT, file)} already exists — refusing to overwrite.`);
  process.exit(1);
}

const lesson = {
  id: lessonId,
  courseId,
  title,
  estimatedMinutes: 2,
  xp: 20,
  cards: [
    {
      id: 'c1',
      type: 'concept',
      headline: 'The hook goes here',
      body: 'Open with the reason to care, not a definition. One or two short sentences.',
      art: { kind: 'glyph', name: 'lightbulb', bg: 'butter' },
    },
    {
      id: 'c2',
      type: 'concept',
      headline: 'Build the idea',
      body: 'Introduce the mechanism plainly. Concrete numbers beat adjectives.',
    },
    {
      id: 'c3',
      type: 'diagram',
      title: 'Show it',
      art: { kind: 'chart', spec: { type: 'bars', values: [3, 5, 8], labels: ['A', 'B', 'C'] } },
      caption: 'Explain what the reader is looking at rather than repeating the numbers.',
    },
    {
      id: 'c4',
      type: 'binary_choice',
      prompt: 'Ask something the previous cards actually answered.',
      options: [
        { id: 'a', label: 'The right answer', correct: true },
        { id: 'b', label: 'A plausible wrong one', correct: false },
      ],
      explanation: 'Say why the right answer is right, and why the wrong one tempts.',
    },
    {
      id: 'c5',
      type: 'concept',
      headline: 'Extend it',
      body: 'Add the second half of the idea now that the first half has been checked.',
    },
    {
      id: 'c6',
      type: 'sticker_reveal',
      body: 'Tap to reveal the parts.',
      stickers: [
        {
          label: 'First part',
          art: { kind: 'glyph', name: 'coin', bg: 'mint' },
          anchor: { x: 0.3, y: 0.35 },
          rotation: -6,
        },
        {
          label: 'Second part',
          art: { kind: 'glyph', name: 'scale', bg: 'lilac' },
          anchor: { x: 0.7, y: 0.6 },
          rotation: 5,
        },
      ],
    },
    {
      id: 'c7',
      type: 'fill_blank',
      body: 'A sentence with exactly one [[1]] slot in it.',
      wordBank: ['blank', 'decoy', 'other'],
      answer: 'blank',
      explanation: 'One line on why that word is the right one.',
    },
    {
      id: 'c8',
      type: 'concept',
      headline: 'The caveat',
      body: 'Name the limit of the idea. Every honest lesson has one.',
    },
    {
      id: 'c9',
      type: 'main_idea',
      summary: 'Recap in one sentence what the reader can now do.',
      bullets: [
        'A point that was actually taught above.',
        'A second point, equally concrete.',
      ],
    },
    {
      id: 'c10',
      type: 'key_insight',
      art: { kind: 'palette', preset: 'forest' },
      insight: 'A standalone line that makes sense with no surrounding context.',
    },
  ],
};

mkdirSync(dir, { recursive: true });
writeFileSync(file, `${JSON.stringify(lesson, null, 2)}\n`, 'utf8');

console.log(`✔  Wrote ${relative(ROOT, file)}`);
console.log(`   Add "${lessonId}" to a unit in content/courses/${courseId}.json,`);
console.log(`   bump that course's totalXp by ${lesson.xp}, then run npm run validate:content.`);
