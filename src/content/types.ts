/**
 * Public content types.
 *
 * Every one of these is inferred from the Zod schemas in ./schema, so the
 * types and the runtime validation can never disagree. Import from here
 * rather than from ./schema in app code — it keeps zod out of component
 * files and makes the dependency direction obvious.
 */
export type {
  ArtSpec,
  Book,
  BookId,
  BinaryChoiceCard,
  Candle,
  Card,
  CardId,
  CardType,
  ChartMarker,
  ChartMotion,
  ChartSpec,
  ChoiceOption,
  ConceptCard,
  Course,
  CourseCategory,
  CourseId,
  DiagramCard,
  EntityRef,
  FillBlankCard,
  GlyphName,
  KeyInsightCard,
  Lesson,
  LessonId,
  LessonPath,
  MainIdeaCard,
  OptionLeg,
  PalettePreset,
  RichText,
  StickerRevealCard,
  Strategy,
  StrategyFamily,
  StrategyId,
  Trader,
  TraderId,
  Unit,
  UnitId,
} from './schema';

export {
  COURSE_CATEGORIES,
  GLYPH_NAMES,
  PALETTE_PRESETS,
  PROSE_BUDGET,
  STRATEGY_FAMILIES,
} from './schema';
