/**
 * The content graph, indexed for lookup.
 *
 * All content is bundled with the app, so these are plain synchronous
 * lookups over Maps built once at module load. Nothing here touches
 * persistence — progress and unlock state live behind the Repository
 * (see src/store/repository.ts). Keeping them separate is what lets the
 * same content render for a signed-out local user today and a synced
 * account later.
 */
import {
  allBooks,
  allCourses,
  allLessons as rawLessons,
  allStrategies,
  allTerms,
  allTraders,
} from './index.generated';
import { applyLessonArtwork } from './lessonArtwork';
import type {
  Book,
  BookId,
  Card,
  Course,
  CourseId,
  EntityRef,
  Lesson,
  LessonId,
  LessonPath,
  Strategy,
  StrategyId,
  Term,
  TermId,
  Trader,
  TraderId,
  Unit,
} from './types';

export const lessonPath = (courseId: CourseId, lessonId: LessonId): LessonPath =>
  `${courseId}/${lessonId}`;

const allLessons = rawLessons.map(applyLessonArtwork);
const coursesById = new Map<CourseId, Course>(allCourses.map((c) => [c.id, c]));
const lessonsByPath = new Map<LessonPath, Lesson>(
  allLessons.map((l) => [lessonPath(l.courseId, l.id), l]),
);
const tradersById = new Map<TraderId, Trader>(allTraders.map((t) => [t.id, t]));
const strategiesById = new Map<StrategyId, Strategy>(allStrategies.map((s) => [s.id, s]));
const booksById = new Map<BookId, Book>(allBooks.map((b) => [b.id, b]));
const termsById = new Map<TermId, Term>(allTerms.map((t) => [t.id, t]));

/* ------------------------------------------------------------------ *
 * Lookups
 * ------------------------------------------------------------------ */

export const getCourse = (id: CourseId): Course | undefined => coursesById.get(id);
export const getTrader = (id: TraderId): Trader | undefined => tradersById.get(id);
export const getStrategy = (id: StrategyId): Strategy | undefined => strategiesById.get(id);
export const getBook = (id: BookId): Book | undefined => booksById.get(id);
export const getTerm = (id: TermId): Term | undefined => termsById.get(id);

export const getLesson = (courseId: CourseId, lessonId: LessonId): Lesson | undefined =>
  lessonsByPath.get(lessonPath(courseId, lessonId));

export const getLessonByPath = (path: LessonPath): Lesson | undefined => lessonsByPath.get(path);

/* ------------------------------------------------------------------ *
 * Collections
 * ------------------------------------------------------------------ */

/** Courses in authored display order. */
export const listCourses = (): Course[] => [...allCourses].sort((a, b) => a.order - b.order);

export const listTraders = (): Trader[] =>
  [...allTraders].sort((a, b) => a.name.localeCompare(b.name));

export const listStrategies = (): Strategy[] =>
  [...allStrategies].sort((a, b) => a.name.localeCompare(b.name));

export const listBooks = (): Book[] => [...allBooks].sort((a, b) => a.year - b.year);

/** Glossary terms A→Z by display term (case-insensitive). */
export const listTerms = (): Term[] =>
  [...allTerms].sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' }));

/** Every lesson of a course, flattened in unit order. */
export function listLessonsInCourse(courseId: CourseId): Lesson[] {
  const course = coursesById.get(courseId);
  if (!course) return [];
  return course.units
    .slice()
    .sort((a, b) => a.index - b.index)
    .flatMap((unit) =>
      unit.lessonIds
        .map((id) => lessonsByPath.get(lessonPath(courseId, id)))
        .filter((l): l is Lesson => l !== undefined),
    );
}

/** The unit a lesson belongs to, for breadcrumbs and the path view. */
export function getUnitForLesson(courseId: CourseId, lessonId: LessonId): Unit | undefined {
  return coursesById.get(courseId)?.units.find((u) => u.lessonIds.includes(lessonId));
}

/**
 * The lesson immediately after this one within its course, or undefined at
 * the end. Drives the "next lesson" affordance on the completion screen.
 */
export function getNextLesson(courseId: CourseId, lessonId: LessonId): Lesson | undefined {
  const ordered = listLessonsInCourse(courseId);
  const index = ordered.findIndex((l) => l.id === lessonId);
  return index >= 0 ? ordered[index + 1] : undefined;
}

/* ------------------------------------------------------------------ *
 * Cross-links
 * ------------------------------------------------------------------ */

export interface ResolvedRef {
  ref: EntityRef;
  kind: 'trader' | 'strategy' | 'book' | 'term' | 'lesson';
  id: string;
  title: string;
  /** The expo-router href for this entity. */
  href: string;
}

/**
 * Resolves an EntityRef to something renderable. Returns undefined for a
 * dangling ref rather than throwing — the validator already guarantees
 * these resolve at build time, so a miss at runtime should degrade to
 * "don't render the chip" rather than crash the lesson.
 */
export function resolveRef(ref: EntityRef): ResolvedRef | undefined {
  const separator = ref.indexOf(':');
  const kind = ref.slice(0, separator) as ResolvedRef['kind'];
  const id = ref.slice(separator + 1);

  switch (kind) {
    case 'trader': {
      const trader = tradersById.get(id);
      return trader && { ref, kind, id, title: trader.name, href: `/kb/trader/${id}` };
    }
    case 'strategy': {
      const strategy = strategiesById.get(id);
      return strategy && { ref, kind, id, title: strategy.name, href: `/kb/strategy/${id}` };
    }
    case 'book': {
      const book = booksById.get(id);
      return book && { ref, kind, id, title: book.title, href: `/kb/book/${id}` };
    }
    case 'term': {
      const term = termsById.get(id);
      return term && { ref, kind, id, title: term.term, href: `/kb/term/${id}` };
    }
    case 'lesson': {
      const lesson = lessonsByPath.get(id as LessonPath);
      return lesson && { ref, kind, id, title: lesson.title, href: `/lesson/${id}` };
    }
    default:
      return undefined;
  }
}

/** Strategies whose gate includes this lesson — shown on the completion screen. */
export function strategiesUnlockedBy(courseId: CourseId, lessonId: LessonId): Strategy[] {
  const path = lessonPath(courseId, lessonId);
  return allStrategies.filter((s) => s.prerequisiteLessons.includes(path));
}

/** Traders who practise a strategy, for the strategy detail screen. */
export function tradersPractising(strategyId: StrategyId): Trader[] {
  return allTraders.filter((t) => t.signatureStrategies.includes(strategyId));
}

/* ------------------------------------------------------------------ *
 * Cards
 * ------------------------------------------------------------------ */

/**
 * Finds a card anywhere in the content graph. Saved cards persist only
 * their coordinates (course / lesson / card id), never a copy of the card
 * body, so that content edits flow through to already-saved cards.
 */
export function findCard(
  courseId: CourseId,
  lessonId: LessonId,
  cardId: string,
): Card | undefined {
  const lesson = getLesson(courseId, lessonId);
  if (lesson) return lesson.cards.find((c) => c.id === cardId);
  // Guides address their cards with a reserved courseId and the entity id, so
  // saving and sharing route through the same storage path as lesson cards
  // rather than needing a parallel one.
  if (courseId === 'book') return booksById.get(lessonId)?.guideCards.find((c) => c.id === cardId);
  if (courseId === 'strategy') {
    return strategiesById.get(lessonId)?.guideCards?.find((c) => c.id === cardId);
  }
  return undefined;
}

export const totalCourseCount = (): number => allCourses.length;
