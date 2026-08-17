/**
 * Emits docs/content-authoring.md — the prompt handed to a model (or a human)
 * that is about to write a lesson.
 *
 * The whole point is that this file is GENERATED. A hand-maintained authoring
 * guide drifts from the code the first time the schema changes, and the
 * failure is silent: the prompt keeps describing a field that no longer
 * exists, the model keeps emitting it, and the validator rejects every lesson
 * until someone notices the doc is lying. So everything here is derived —
 * the JSON Schema from the Zod schema, the vocabularies from the same
 * constants the app imports, the word budgets from PROSE_BUDGET, the valid
 * cross-link ids from content/ itself, and the worked example from a real
 * lesson file on disk.
 *
 * Editorial policy — card mix, tone, the accuracy and copyright rules — lives
 * in the CONSTRAINTS block below, because it has nowhere else to live. That
 * block is the only prose in this pipeline anyone should edit by hand.
 *
 * Run: npm run gen:authoring-prompt
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { z } from 'zod';
import {
  LessonSchema,
  GLYPH_NAMES,
  PALETTE_PRESETS,
  COURSE_CATEGORIES,
  PROSE_BUDGET,
} from '../src/content/schema';

const ROOT = resolve(__dirname, '..');
const CONTENT = join(ROOT, 'content');
const OUT = join(ROOT, 'docs', 'content-authoring.md');

/** The lesson used as the worked example. Read verbatim so it cannot drift. */
const GOLD_STANDARD = join(CONTENT, 'lessons', 'market-foundations', 'what-is-a-stock.json');

/* ------------------------------------------------------------------ *
 * Derived vocabulary
 * ------------------------------------------------------------------ */

function idsIn(dir: string): string[] {
  const full = join(CONTENT, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
}

function lessonRefs(): string[] {
  const dir = join(CONTENT, 'lessons');
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const course of readdirSync(dir)) {
    const courseDir = join(dir, course);
    if (!statSync(courseDir).isDirectory()) continue;
    for (const file of readdirSync(courseDir)) {
      if (file.endsWith('.json')) out.push(`${course}/${file.replace(/\.json$/, '')}`);
    }
  }
  return out.sort();
}

/**
 * Zod 4 emits JSON Schema natively. `unrepresentable: 'any'` keeps the
 * `.refine()` on the line ChartSpec from throwing — a cross-field invariant
 * has no JSON Schema equivalent, so it degrades to `any` here and is restated
 * in prose under CONSTRAINTS instead.
 */
function lessonJsonSchema(): string {
  const schema = z.toJSONSchema(LessonSchema, {
    unrepresentable: 'any',
    io: 'input',
    // ArtSpec appears in every one of the seven card types. Inlined, it
    // dominates the document; hoisted into $defs it is stated once.
    reused: 'ref',
  });
  return JSON.stringify(schema, null, 2);
}

/* ------------------------------------------------------------------ *
 * Editorial policy — the one hand-written block
 * ------------------------------------------------------------------ */

const CONSTRAINTS = `
### Shape of a lesson

- **10–13 cards.** The schema permits 8–15; aim for the middle. A chapter is
  about two minutes.
- **Card 1 is a \`concept\` hook** — the reason to care, not a definition.
- **At least one \`diagram\`.** On a diagram card the visual *is* the content,
  so the caption explains what the reader is looking at rather than repeating it.
- **At least two interactive cards** (\`binary_choice\`, \`fill_blank\`, or
  \`sticker_reveal\`). Spread them through the lesson; do not stack them at the end.
- **\`main_idea\` is the penultimate card**, and its bullets recap what was
  taught rather than introducing anything new.
- **\`key_insight\` is the final card.** It must read as a standalone aphorism —
  it is the card people screenshot and share, so it has to make sense with no
  surrounding context.

### Voice

Short declarative sentences. Second person. Concrete numbers over adjectives.
No hype, no exclamation marks, no "imagine if". If a sentence would survive
being cut, cut it. The word budgets below are enforced by the validator and are
ceilings, not targets.

### Art

- \`ArtSpec\` inside a card may only be \`chart\`, \`palette\`, or \`glyph\`.
  **\`image\` is rejected by the validator inside lesson cards** — bitmaps are
  for course and book covers only.
- Prefer \`chart\`. Finance is diagrammatic: a compounding curve, a drawdown, a
  candlestick pattern is the concept itself, and it is authorable as numbers.
- Chart numbers must be **arithmetically true**. If the caption says a stock
  fell 50% and needs 100% to recover, the series has to actually do that. A
  chart that contradicts its caption is worse than no chart.
- \`line.compareSeries\` must have exactly the same number of points as
  \`series\`. The two share one computed domain, so unequal lengths would
  silently compress one curve and misstate the gap the card is making a point about.
- Reuse glyphs freely. Repetition across a course reads as a design system;
  novelty for its own sake reads as inconsistency.

### Rich text

Only three markups are legal, and the validator rejects anything else:

- \`**bold**\`
- \`[[1]]\` — the fill-blank slot. Exactly one per \`fill_blank.body\`, and
  \`answer\` must appear verbatim in \`wordBank\`.
- \`{{trader:buffett|Buffett}}\` — a cross-link. The id before the pipe must
  exist in the registry below.

### Accuracy and copyright — non-negotiable

- **Never reproduce copyrighted text.** No quotations from books. Summarise
  ideas in original words. The schema has no field for excerpts, deliberately.
- A claim about a **named real person** needs a checkable source. Never
  "widely reported".
- **Nothing may read as advice.** No "you should buy", no naming a specific
  security as a recommendation, no implied return. Teach the mechanism and let
  the reader apply it. This is the single most common failure mode in
  finance content, and the report sheet in the app has a dedicated
  "This reads like advice" reason because of it.
`.trim();

/* ------------------------------------------------------------------ *
 * Emit
 * ------------------------------------------------------------------ */

const budgetRows = Object.entries(PROSE_BUDGET)
  .map(([field, max]) => `| \`${field}\` | ${max} |`)
  .join('\n');

const traders = idsIn('traders');
const strategies = idsIn('strategies');
const books = idsIn('books');
const lessons = lessonRefs();

const refList = (prefix: string, ids: string[]) =>
  ids.length ? ids.map((id) => `\`${prefix}:${id}\``).join(' · ') : '_(none yet)_';

const gold = existsSync(GOLD_STANDARD)
  ? readFileSync(GOLD_STANDARD, 'utf8').trim()
  : '// gold-standard lesson not found';

const doc = `<!--
  AUTO-GENERATED by scripts/generate-authoring-prompt.ts — DO NOT EDIT.
  Regenerate with \`npm run gen:authoring-prompt\`.
  Editorial policy lives in the CONSTRAINTS block of that script.
-->

# Authoring a StockiQ lesson

Everything below is derived from \`src/content/schema.ts\` and the current
contents of \`content/\`, so it cannot drift from what the validator will
accept. Hand the whole file to the model as context, then run
\`npm run validate:content\` and feed any failures back verbatim — the
messages name the file, card, field, and offending value, and the loop
normally converges in one or two turns.

## Output format

A single JSON object per lesson, written to
\`content/lessons/<courseId>/<lessonId>.json\`. \`id\` must equal the filename
without its extension, and \`courseId\` must match the directory.

${CONSTRAINTS}

## Word budgets

Enforced by pass 5 of the validator. Exceeding one is a warning, not an error —
but warnings are the thing that keeps a card deck feeling like Imprint rather
than a textbook, so treat them as errors.

| Field | Max words |
|---|---|
${budgetRows}

## Vocabularies

**Course categories:** ${COURSE_CATEGORIES.map((c) => `\`${c}\``).join(' · ')}

**Palette presets:** ${PALETTE_PRESETS.map((p) => `\`${p}\``).join(' · ')}

**Glyph names** (${GLYPH_NAMES.length} available — reuse is encouraged):

${GLYPH_NAMES.map((g) => `\`${g}\``).join(' · ')}

## Cross-link registry

Only these ids exist. A \`{{...}}\` or \`refs\` entry pointing anywhere else is
a validation error.

**Traders:** ${refList('trader', traders)}

**Strategies:** ${refList('strategy', strategies)}

**Books:** ${refList('book', books)}

**Lessons:** ${refList('lesson', lessons)}

## JSON Schema

\`\`\`json
${lessonJsonSchema()}
\`\`\`

## Worked example

\`${relative(ROOT, GOLD_STANDARD)}\` — a complete, validating lesson. Match its
rhythm: hook, build, check understanding, recap, aphorism.

\`\`\`json
${gold}
\`\`\`
`;

writeFileSync(OUT, doc, 'utf8');
console.log(
  `✔  Wrote ${relative(ROOT, OUT)} — ${traders.length} trader(s), ` +
    `${strategies.length} strategy(ies), ${books.length} book(s), ${lessons.length} lesson(s) in registry.`,
);
