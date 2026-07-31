/**
 * StockIQ content validator.
 *
 * Five passes, run in order. Passes 1–4 produce errors (exit 1); pass 5
 * produces warnings. Every message is written to be actionable by whoever
 * — human or LLM — has to fix it, because the authoring loop is
 *
 *     generate -> validate -> feed failures back verbatim -> regenerate
 *
 * and it only converges quickly if the messages name the file, the card,
 * the field, and the offending value.
 *
 *   1. Shape                — every file against its Zod schema
 *   2. Referential integrity — every cross-link resolves to a real entity
 *   3. Semantic invariants   — the rules Zod alone cannot express
 *   4. Rich-text lint        — markup the parser refuses
 *   5. Prose budget          — cards that are too long to feel like Imprint
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import {
  BookSchema,
  CourseSchema,
  LessonSchema,
  PROSE_BUDGET,
  StrategySchema,
  TraderSchema,
  type Book,
  type Card,
  type Course,
  type EntityRef,
  type Lesson,
  type Strategy,
  type Trader,
} from '../src/content/schema';
import { countWords, parseRichText } from '../src/content/richtext';

const ROOT = resolve(__dirname, '..');

/**
 * Defaults to content/, but accepts an override so the broken fixture in
 * tests/fixtures/ can be validated without ever living in the shipped
 * content tree. `--expect-failure` inverts the exit code, which is what
 * makes that fixture a real regression test for the authoring loop.
 */
const args = process.argv.slice(2);
const expectFailure = args.includes('--expect-failure');
const contentArg = args.find((a) => !a.startsWith('--'));
const CONTENT = contentArg ? resolve(ROOT, contentArg) : join(ROOT, 'content');

/* ------------------------------------------------------------------ */

const errors: string[] = [];
const warnings: string[] = [];

const err = (file: string, message: string) =>
  errors.push(`${relative(ROOT, file)}: ${message}`);
const warn = (file: string, message: string) =>
  warnings.push(`${relative(ROOT, file)}: ${message}`);

/** Locates a card so error messages point at something findable. */
const at = (card: Card, field?: string) =>
  `card "${card.id}" (${card.type})${field ? ` field "${field}"` : ''}`;

/* ------------------------------------------------------------------ *
 * Loading
 * ------------------------------------------------------------------ */

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

interface Loaded<T> {
  file: string;
  data: T;
}

/** Pass 1: parse + schema-check one collection. */
function load<T>(dir: string, schema: { safeParse: (v: unknown) => any }, label: string): Loaded<T>[] {
  const out: Loaded<T>[] = [];
  for (const file of jsonFilesIn(dir)) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      err(file, `invalid JSON — ${(e as Error).message}`);
      continue;
    }
    const result = schema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.length ? issue.path.join('.') : '(root)';
        err(file, `${label} schema: at "${path}" — ${issue.message}`);
      }
      continue;
    }
    out.push({ file, data: result.data as T });
  }
  return out;
}

const courses = load<Course>(join(CONTENT, 'courses'), CourseSchema, 'Course');
const lessons = load<Lesson>(join(CONTENT, 'lessons'), LessonSchema, 'Lesson');
const traders = load<Trader>(join(CONTENT, 'traders'), TraderSchema, 'Trader');
const strategies = load<Strategy>(join(CONTENT, 'strategies'), StrategySchema, 'Strategy');
const books = load<Book>(join(CONTENT, 'books'), BookSchema, 'Book');

const courseById = new Map(courses.map((c) => [c.data.id, c]));
const lessonByPath = new Map(lessons.map((l) => [`${l.data.courseId}/${l.data.id}`, l]));
const traderById = new Map(traders.map((t) => [t.data.id, t]));
const strategyById = new Map(strategies.map((s) => [s.data.id, s]));
const bookById = new Map(books.map((b) => [b.data.id, b]));

/* ------------------------------------------------------------------ *
 * Pass 2 — referential integrity
 * ------------------------------------------------------------------ */

/** The check that catches the overwhelming majority of LLM output errors. */
function checkRef(file: string, ref: EntityRef, where: string): void {
  const [kind, rest] = [ref.slice(0, ref.indexOf(':')), ref.slice(ref.indexOf(':') + 1)];
  const exists =
    kind === 'trader'
      ? traderById.has(rest)
      : kind === 'strategy'
        ? strategyById.has(rest)
        : kind === 'book'
          ? bookById.has(rest)
          : lessonByPath.has(rest);
  if (!exists) {
    err(file, `${where}: unresolved reference "${ref}" — no such ${kind}`);
  }
}

function checkIdList(
  file: string,
  ids: string[],
  index: Map<string, unknown>,
  kind: string,
  where: string,
): void {
  for (const id of ids) {
    if (!index.has(id)) err(file, `${where}: unresolved ${kind} id "${id}"`);
  }
}

// Courses <-> lessons
for (const { file, data: course } of courses) {
  const seenLessons = new Set<string>();
  for (const unit of course.units) {
    for (const lessonId of unit.lessonIds) {
      const path = `${course.id}/${lessonId}`;
      if (!lessonByPath.has(path)) {
        err(
          file,
          `unit "${unit.id}": lesson "${lessonId}" is listed but content/lessons/${course.id}/${lessonId}.json does not exist`,
        );
      }
      if (seenLessons.has(lessonId)) {
        err(file, `lesson "${lessonId}" appears in more than one unit`);
      }
      seenLessons.add(lessonId);
    }
  }
}

for (const { file, data: lesson } of lessons) {
  const course = courseById.get(lesson.courseId);
  if (!course) {
    err(file, `courseId "${lesson.courseId}" does not match any course`);
  } else {
    const listed = course.data.units.some((u) => u.lessonIds.includes(lesson.id));
    if (!listed) {
      err(
        file,
        `lesson "${lesson.id}" is not listed in any unit of course "${lesson.courseId}" — it would be unreachable`,
      );
    }
  }
  for (const ref of lesson.unlocks ?? []) checkRef(file, ref, 'unlocks');
  for (const ref of lesson.refs ?? []) checkRef(file, ref, 'refs');
  for (const card of lesson.cards) {
    for (const ref of card.refs ?? []) checkRef(file, ref, at(card, 'refs'));
  }
}

for (const { file, data: trader } of traders) {
  checkIdList(file, trader.signatureStrategies, strategyById, 'strategy', 'signatureStrategies');
  checkIdList(file, trader.recommendedReading, bookById, 'book', 'recommendedReading');
  checkIdList(file, trader.relatedTraders ?? [], traderById, 'trader', 'relatedTraders');
  if ((trader.relatedTraders ?? []).includes(trader.id)) {
    err(file, `relatedTraders lists the trader themself ("${trader.id}")`);
  }
}

for (const { file, data: strategy } of strategies) {
  checkIdList(file, strategy.practicedBy, traderById, 'trader', 'practicedBy');
  checkIdList(file, strategy.furtherReading, bookById, 'book', 'furtherReading');
  for (const path of strategy.prerequisiteLessons) {
    if (!lessonByPath.has(path)) {
      err(file, `prerequisiteLessons: unresolved lesson "${path}"`);
    }
  }
}

for (const { file, data: book } of books) {
  checkIdList(file, book.relatedTraders ?? [], traderById, 'trader', 'relatedTraders');
  checkIdList(file, book.relatedStrategies ?? [], strategyById, 'strategy', 'relatedStrategies');
  for (const card of book.guideCards) {
    for (const ref of card.refs ?? []) checkRef(file, ref, at(card, 'refs'));
  }
}

// Strategy guides are the same Card union, so they get the same reference
// integrity check — a guide is content, not decoration.
for (const { file, data: strategy } of strategies) {
  for (const card of strategy.guideCards ?? []) {
    for (const ref of card.refs ?? []) checkRef(file, ref, at(card, 'refs'));
  }
}

/* ------------------------------------------------------------------ *
 * Pass 3 — semantic invariants
 * ------------------------------------------------------------------ */

/** Card rules that hold wherever cards appear (lessons and book guides). */
function checkCards(file: string, cards: Card[], context: string): void {
  const ids = new Set<string>();

  for (const card of cards) {
    if (ids.has(card.id)) err(file, `${context}: duplicate card id "${card.id}"`);
    ids.add(card.id);

    switch (card.type) {
      case 'binary_choice': {
        const correct = card.options.filter((o) => o.correct);
        if (correct.length !== 1) {
          err(
            file,
            `${at(card)}: exactly one option must have correct: true, found ${correct.length}`,
          );
        }
        if (card.options[0].id === card.options[1].id) {
          err(file, `${at(card)}: both options share the id "${card.options[0].id}"`);
        }
        break;
      }

      case 'fill_blank': {
        const { blanks } = parseRichText(card.body);
        if (blanks.length !== 1) {
          err(
            file,
            `${at(card, 'body')}: must contain exactly one [[1]] slot, found ${blanks.length}`,
          );
        } else if (blanks[0] !== 1) {
          err(file, `${at(card, 'body')}: the slot must be [[1]], found [[${blanks[0]}]]`);
        }
        if (!card.wordBank.includes(card.answer)) {
          err(
            file,
            `${at(card)}: answer "${card.answer}" not present in wordBank ${JSON.stringify(card.wordBank)}`,
          );
        }
        if (new Set(card.wordBank).size !== card.wordBank.length) {
          err(file, `${at(card, 'wordBank')}: contains duplicate words`);
        }
        break;
      }

      case 'sticker_reveal': {
        const labels = card.stickers.map((s) => s.label);
        if (new Set(labels).size !== labels.length) {
          err(file, `${at(card, 'stickers')}: duplicate sticker labels`);
        }
        break;
      }
    }

    // Bitmaps are for covers only. Inside a card, art must be computed.
    const art = 'art' in card ? card.art : undefined;
    if (art && art.kind === 'image') {
      err(
        file,
        `${at(card, 'art')}: kind "image" is not allowed inside cards — use "chart", "glyph", or "palette"`,
      );
    }
    if (card.type === 'sticker_reveal') {
      for (const [i, sticker] of card.stickers.entries()) {
        if (sticker.art.kind === 'image') {
          err(file, `${at(card)}: sticker ${i} uses art kind "image" — not allowed inside cards`);
        }
      }
    }
  }
}

// Global id uniqueness across every collection.
function checkUniqueIds<T extends { id: string }>(items: Loaded<T>[], label: string): void {
  const seen = new Map<string, string>();
  for (const { file, data } of items) {
    const prior = seen.get(data.id);
    if (prior) {
      err(file, `duplicate ${label} id "${data.id}" — already defined in ${relative(ROOT, prior)}`);
    }
    seen.set(data.id, file);
  }
}
checkUniqueIds(courses, 'course');
checkUniqueIds(traders, 'trader');
checkUniqueIds(strategies, 'strategy');
checkUniqueIds(books, 'book');

for (const { file, data: course } of courses) {
  const unitIds = course.units.map((u) => u.id);
  if (new Set(unitIds).size !== unitIds.length) err(file, 'duplicate unit ids');

  const indices = course.units.map((u) => u.index).sort((a, b) => a - b);
  const expected = indices.map((_, i) => i + 1);
  if (indices.join(',') !== expected.join(',')) {
    err(file, `unit indices must be 1..${course.units.length}, found ${indices.join(',')}`);
  }

  const sum = course.units
    .flatMap((u) => u.lessonIds)
    .reduce((acc, id) => acc + (lessonByPath.get(`${course.id}/${id}`)?.data.xp ?? 0), 0);
  if (sum !== course.totalXp) {
    err(file, `totalXp is ${course.totalXp} but its lessons sum to ${sum}`);
  }
}

for (const { file, data: lesson } of lessons) {
  checkCards(file, lesson.cards, `lesson "${lesson.id}"`);

  const last = lesson.cards[lesson.cards.length - 1];
  if (last && last.type !== 'key_insight') {
    warn(file, `the last card is "${last.type}" — lessons read best ending on a key_insight`);
  }
  const hasInteractive = lesson.cards.some(
    (c) => c.type === 'binary_choice' || c.type === 'fill_blank',
  );
  if (!hasInteractive) {
    warn(file, 'no interactive card (binary_choice or fill_blank) — the lesson is passive');
  }
  const mainIdeas = lesson.cards.filter((c) => c.type === 'main_idea');
  if (mainIdeas.length > 1) {
    err(file, `${mainIdeas.length} main_idea cards — a lesson should recap exactly once`);
  }
}

for (const { file, data: book } of books) {
  checkCards(file, book.guideCards, `book "${book.id}"`);
}

for (const { file, data: strategy } of strategies) {
  if (strategy.guideCards) {
    checkCards(file, strategy.guideCards, `strategy "${strategy.id}"`);
  }
}

// Prerequisite cycles: a strategy gated behind a lesson that its own
// prerequisite chain unlocks would be permanently unreachable.
{
  const unlockedBy = new Map<string, string[]>(); // strategyId -> lesson paths that unlock it
  for (const { data: lesson } of lessons) {
    for (const ref of lesson.unlocks ?? []) {
      if (ref.startsWith('strategy:')) {
        const id = ref.slice('strategy:'.length);
        unlockedBy.set(id, [...(unlockedBy.get(id) ?? []), `${lesson.courseId}/${lesson.id}`]);
      }
    }
  }
  for (const { file, data: strategy } of strategies) {
    const gates = new Set(strategy.prerequisiteLessons);
    for (const path of unlockedBy.get(strategy.id) ?? []) {
      if (!gates.has(path)) {
        warn(
          file,
          `lesson "${path}" declares it unlocks this strategy, but "${path}" is not in prerequisiteLessons — the unlock and the gate disagree`,
        );
      }
    }
  }
}

// Orphans: entities nothing links to are invisible in the app.
{
  const referenced = new Set<string>();
  const note = (ref: string) => referenced.add(ref);

  for (const { data: lesson } of lessons) {
    for (const ref of [...(lesson.unlocks ?? []), ...(lesson.refs ?? [])]) note(ref);
    for (const card of lesson.cards) {
      for (const ref of card.refs ?? []) note(ref);
      for (const value of richTextFieldsOf(card)) {
        for (const ref of parseRichText(value).refs) note(ref);
      }
    }
  }
  for (const { data: trader } of traders) {
    trader.signatureStrategies.forEach((id) => note(`strategy:${id}`));
    trader.recommendedReading.forEach((id) => note(`book:${id}`));
    (trader.relatedTraders ?? []).forEach((id) => note(`trader:${id}`));
  }
  for (const { data: strategy } of strategies) {
    strategy.practicedBy.forEach((id) => note(`trader:${id}`));
    strategy.furtherReading.forEach((id) => note(`book:${id}`));
  }
  for (const { data: book } of books) {
    (book.relatedTraders ?? []).forEach((id) => note(`trader:${id}`));
    (book.relatedStrategies ?? []).forEach((id) => note(`strategy:${id}`));
  }

  for (const { file, data } of traders) {
    if (!referenced.has(`trader:${data.id}`)) {
      warn(file, `trader "${data.id}" is not referenced by any lesson, strategy, or book`);
    }
  }
  for (const { file, data } of strategies) {
    if (!referenced.has(`strategy:${data.id}`)) {
      warn(file, `strategy "${data.id}" is not referenced anywhere`);
    }
  }
  for (const { file, data } of books) {
    if (!referenced.has(`book:${data.id}`)) {
      warn(file, `book "${data.id}" is not referenced anywhere`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Passes 4 & 5 — rich-text lint and prose budget
 * ------------------------------------------------------------------ */

/** Every RichText-typed field on a card, paired with its field name. */
function richTextFieldsOf(card: Card): string[] {
  return richTextEntriesOf(card).map(([, value]) => value);
}

function richTextEntriesOf(card: Card): Array<[string, string]> {
  switch (card.type) {
    case 'concept':
      return [
        ['headline', card.headline],
        ['body', card.body],
      ];
    case 'diagram':
      return [['caption', card.caption]];
    case 'sticker_reveal':
      return [['body', card.body]];
    case 'binary_choice':
      return [
        ['prompt', card.prompt],
        ['explanation', card.explanation],
      ];
    case 'fill_blank':
      return [
        ['body', card.body],
        ...(card.explanation ? ([['explanation', card.explanation]] as Array<[string, string]>) : []),
      ];
    case 'main_idea':
      return [
        ['summary', card.summary],
        ...card.bullets.map((b, i) => [`bullets[${i}]`, b] as [string, string]),
      ];
    case 'key_insight':
      return [];
  }
}

/** Budgets by card type and field. Exceeding these is a warning, not an error. */
function budgetFor(card: Card, field: string): number | undefined {
  switch (card.type) {
    case 'concept':
      return field === 'body' ? PROSE_BUDGET.conceptBody : PROSE_BUDGET.conceptHeadline;
    case 'diagram':
      return PROSE_BUDGET.diagramCaption;
    case 'sticker_reveal':
      return PROSE_BUDGET.stickerBody;
    case 'binary_choice':
      return field === 'prompt' ? PROSE_BUDGET.choicePrompt : undefined;
    case 'fill_blank':
      return field === 'body' ? PROSE_BUDGET.fillBlankBody : undefined;
    case 'main_idea':
      return field === 'summary' ? PROSE_BUDGET.mainIdeaSummary : PROSE_BUDGET.mainIdeaBullet;
    default:
      return undefined;
  }
}

function lintCards(file: string, cards: Card[]): void {
  for (const card of cards) {
    for (const [field, value] of richTextEntriesOf(card)) {
      // Pass 4
      const { errors: markupErrors } = parseRichText(value);
      for (const message of markupErrors) {
        err(file, `${at(card, field)}: ${message}`);
      }
      // Pass 5
      const budget = budgetFor(card, field);
      if (budget !== undefined) {
        const words = countWords(value);
        if (words > budget) {
          warn(
            file,
            `${at(card, field)}: ${words} words exceeds the ${budget}-word budget — Imprint-style cards stay short`,
          );
        }
      }
    }

    if (card.type === 'key_insight') {
      const words = countWords(card.insight);
      if (words > PROSE_BUDGET.keyInsight) {
        warn(
          file,
          `${at(card, 'insight')}: ${words} words exceeds the ${PROSE_BUDGET.keyInsight}-word budget — an insight must stand alone as one line`,
        );
      }
      if (/\{\{|\[\[|\*\*/.test(card.insight)) {
        err(file, `${at(card, 'insight')}: must be plain text (it is rendered as a shareable image)`);
      }
    }
  }
}

for (const { file, data } of lessons) lintCards(file, data.cards);
for (const { file, data } of books) lintCards(file, data.guideCards);
for (const { file, data } of strategies) if (data.guideCards) lintCards(file, data.guideCards);

// Knowledge-base prose gets the markup lint too, but no word budget.
function lintRich(file: string, where: string, values: string[]): void {
  for (const [i, value] of values.entries()) {
    for (const message of parseRichText(value).errors) {
      err(file, `${where}[${i}]: ${message}`);
    }
  }
}
for (const { file, data } of traders) {
  lintRich(file, 'bio', [data.bio]);
  lintRich(file, 'philosophy', data.philosophy);
  lintRich(file, 'famousTrades.story', (data.famousTrades ?? []).map((t) => t.story));
}
for (const { file, data } of strategies) {
  lintRich(file, 'thesis', [data.thesis]);
  lintRich(file, 'entryRules', data.entryRules);
  lintRich(file, 'exitRules', data.exitRules);
  lintRich(file, 'riskManagement', data.riskManagement);
}
for (const { file, data } of books) lintRich(file, 'summary', [data.summary]);

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

const counts = `${courses.length} course(s), ${lessons.length} lesson(s), ${traders.length} trader(s), ${strategies.length} strategy(ies), ${books.length} book(s)`;

if (warnings.length) {
  console.log(`\n⚠  ${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`   ${w}`);
}

if (errors.length) {
  console.error(`\n✖  ${errors.length} error(s):`);
  for (const e of errors) console.error(`   ${e}`);
  console.error(`\nContent validation failed. Checked ${counts}.\n`);
  process.exit(expectFailure ? 0 : 1);
}

if (expectFailure) {
  console.error(
    `\n✖  Expected validation to fail but it passed. The broken fixture no longer trips the validator — a check has regressed.\n`,
  );
  process.exit(1);
}

console.log(`\n✔  Content valid — ${counts}.\n`);
