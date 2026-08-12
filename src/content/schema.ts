/**
 * StockIQ content schema — THE single source of truth.
 *
 * Everything downstream derives from this file:
 *   - TypeScript types (via z.infer, re-exported from ./types)
 *   - the runtime validator (scripts/validate-content.ts)
 *   - the JSON Schema handed to the content-authoring LLM (docs/content-authoring.md)
 *
 * Because the authoring prompt is generated from these schemas rather than
 * written by hand, the prompt can never drift from the code.
 *
 * This module must stay dependency-free apart from zod so that it can be
 * imported both by Metro (the app) and by tsx (the build scripts).
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ *
 * Identifiers
 * ------------------------------------------------------------------ */

/** kebab-case slug: "market-foundations", "what-is-a-stock" */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slug = (label: string) =>
  z.string().regex(SLUG, `${label} must be kebab-case (a-z, 0-9, single hyphens)`);

export const CourseIdSchema = slug('courseId');
export const UnitIdSchema = slug('unitId');
export const LessonIdSchema = slug('lessonId');
export const TraderIdSchema = slug('traderId');
export const StrategyIdSchema = slug('strategyId');
export const BookIdSchema = slug('bookId');
export const TermIdSchema = slug('termId');
/** Card ids are lesson-local and short: "c1", "c2", ... */
export const CardIdSchema = z.string().regex(/^c[0-9]+$/, 'cardId must look like "c1"');

export type CourseId = string;
export type UnitId = string;
export type LessonId = string;
export type CardId = string;
export type TraderId = string;
export type StrategyId = string;
export type BookId = string;
export type TermId = string;

/* ------------------------------------------------------------------ *
 * Cross-links
 * ------------------------------------------------------------------ */

/**
 * A tagged reference to any other entity in the content graph. One string
 * form means one parser handles every ref site — lesson cards, trader
 * "signature strategies", book "related traders", and so on.
 */
export type EntityRef =
  | `trader:${TraderId}`
  | `strategy:${StrategyId}`
  | `book:${BookId}`
  | `term:${TermId}`
  | `lesson:${CourseId}/${LessonId}`;

const ENTITY_REF =
  /^(?:(?:trader|strategy|book|term):[a-z0-9]+(?:-[a-z0-9]+)*|lesson:[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*)$/;

export const EntityRefSchema = z.custom<EntityRef>(
  (v) => typeof v === 'string' && ENTITY_REF.test(v),
  {
    message:
      'EntityRef must be "trader:<id>", "strategy:<id>", "book:<id>", "term:<id>", or "lesson:<courseId>/<lessonId>"',
  },
);

/** "courseId/lessonId" — used where a lesson is addressed without the ref tag. */
export const LessonPathSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'lesson path must be "<courseId>/<lessonId>"',
  );
export type LessonPath = `${CourseId}/${LessonId}`;

/* ------------------------------------------------------------------ *
 * Rich text
 * ------------------------------------------------------------------ */

/**
 * Deliberately tiny inline markup. Parsed at render time by ./richtext.
 * Exactly three constructs are legal — anything else is a validation error,
 * which keeps the renderer total and stops authors (human or LLM) from
 * smuggling in arbitrary Markdown or HTML we would have to sanitize.
 *
 *   **bold**
 *   [[1]]                         fill_blank slot
 *   {{trader:buffett|Buffett}}    cross-link, display text optional
 */
export const RichTextSchema = z.string().min(1);
export type RichText = string;

/* ------------------------------------------------------------------ *
 * Art
 * ------------------------------------------------------------------ */

export const PALETTE_PRESETS = [
  'blush',
  'lilac',
  'sky',
  'mint',
  'butter',
  'neon',
  'ink',
  'forest',
  'parchment',
] as const;
export const PalettePresetSchema = z.enum(PALETTE_PRESETS);
export type PalettePreset = (typeof PALETTE_PRESETS)[number];

/**
 * The glyph set. Kept deliberately small and finance-flavoured: every glyph
 * is drawn once as flat SVG and reused heavily. Reuse reads as a design
 * system; one-off illustrations read as inconsistency (see the art strategy
 * note in the build plan).
 */
export const GLYPH_NAMES = [
  'chart-up',
  'chart-down',
  'candle',
  'coin',
  'coins-stack',
  'bank',
  'briefcase',
  'scale',
  'shield',
  'clock',
  'calendar',
  'target',
  'flag',
  'lightbulb',
  'brain',
  'eye',
  'lock',
  'key',
  'magnifier',
  'exchange',
  'percent',
  'dollar',
  'pie',
  'bell',
  'warning',
  'check',
  'cross',
  'heart',
  'star',
  'arrow-up',
  'arrow-down',
  'building',
  'people',
  'handshake',
  'newspaper',
  'ladder',
  'anchor',
  'compass',
  'seed',
  'tree',
] as const;
export const GlyphNameSchema = z.enum(GLYPH_NAMES);
export type GlyphName = (typeof GLYPH_NAMES)[number];

/**
 * Purpose-built teaching scenes. Unlike a decorative glyph, each scene
 * encodes a relationship or process that the learner can read visually.
 */
export const SCENE_NAMES = [
  'ownership-slice',
  'share-ledger',
  'equity-vs-debt',
  'owner-outcomes',
  'capital-journey',
  'ipo-launch',
  'primary-secondary',
  'liquidity-exit',
  'market-cap-equation',
  'price-vs-value',
  'size-spectrum',
  'order-route',
  'matching-engine',
  'broker-agent',
  'order-book',
  'execution-tradeoff',
  'stop-trigger',
  'two-sided-market',
  'spread-toll',
  'liquidity-depth',
  'quote-terminal',
  'price-change',
  'event-gap',
  'quote-signal',
  'trade-agreement',
  'supply-demand',
  'expectations-gap',
  'index-basket',
  'weighting-tower',
  'price-weighted',
  'benchmark-race',
  'cash-vs-profit',
  'accrual-timing',
  'noncash-charge',
  'free-cash-flow',
  'dividend-per-share',
  'payout-pressure',
  'buyback-slices',
  'yield-trap',
  'competition-cycle',
  'moat-defense',
  'customer-moat',
  'moat-erosion',
  'gross-margin',
  'operating-margin',
  'income-waterfall',
  'revenue-profit-diverge',
  'pe-equation',
  'pe-payback',
  'value-trap',
  'coffee-register',
  'coffee-profit-journey',
  'coffee-gross-profit',
  'coffee-operating-costs',
  'coffee-expansion-risk',
] as const;
export const SceneNameSchema = z.enum(SCENE_NAMES);
export type SceneName = (typeof SCENE_NAMES)[number];

/** A labelled point of interest on a chart's x-axis. */
export const ChartMarkerSchema = z.object({
  at: z.number().int().min(0),
  label: z.string().min(1).max(24),
  emphasis: z.boolean().optional(),
});
export type ChartMarker = z.infer<typeof ChartMarkerSchema>;

export const CandleSchema = z.object({
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
  v: z.number().optional(),
});
export type Candle = z.infer<typeof CandleSchema>;

export const OptionLegSchema = z.object({
  kind: z.enum(['call', 'put', 'stock']),
  side: z.enum(['long', 'short']),
  strike: z.number().optional(),
  premium: z.number().optional(),
  quantity: z.number().default(1),
});
export type OptionLeg = z.infer<typeof OptionLegSchema>;

/**
 * Every in-lesson visual is a pure function of numbers rendered as SVG.
 * This is the core art bet: a compounding curve or a candlestick pattern
 * *is* the concept rather than an illustration of it, so it is more
 * accurate than drawn art, perfectly consistent, and reliably authorable
 * by an LLM (which cannot author an illustration).
 */
export const ChartSpecSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('line'),
      series: z.array(z.number()).min(2),
      /**
       * Draws a second, dimmer curve for contrast (e.g. a margin that erodes
       * under competition against one a moat holds flat). Must be the same
       * length as `series` — the two share one computed domain, so unequal
       * lengths would silently compress one of them and misstate the gap.
       */
      compareSeries: z.array(z.number()).min(2).optional(),
      compareLabel: z.string().max(24).optional(),
      xLabels: z.array(z.string()).optional(),
      xLabel: z.string().optional(),
      yLabel: z.string().optional(),
      /** Index from which to shade the area under the curve. */
      shadeFrom: z.number().int().min(0).optional(),
      shadeLabel: z.string().max(24).optional(),
      markers: z.array(ChartMarkerSchema).optional(),
    })
    .refine(
      (spec) =>
        spec.compareSeries === undefined ||
        spec.compareSeries.length === spec.series.length,
      {
        message: 'compareSeries must have the same number of points as series',
        path: ['compareSeries'],
      },
    ),
  z.object({
    type: z.literal('candles'),
    candles: z.array(CandleSchema).min(3).max(30),
    annotations: z.array(ChartMarkerSchema).optional(),
    /** Optional horizontal reference lines, e.g. support / resistance. */
    levels: z
      .array(z.object({ value: z.number(), label: z.string().max(24) }))
      .optional(),
    /** SMA periods to compute and overlay, e.g. [5, 10]. */
    sma: z.array(z.number().int().min(2).max(30)).max(3).optional(),
  }),
  z.object({
    type: z.literal('bars'),
    values: z.array(z.number()).min(2).max(12),
    labels: z.array(z.string()).min(2).max(12),
    highlightIndex: z.number().int().min(0).optional(),
    /**
     * Colours the highlighted bar by meaning: `positive` (green) for a good
     * outcome kept/grown, `negative` (rust) for a cost/loss/risk. Omitted =
     * the neutral accent, for bars that only mark focus (a weight, a volume).
     */
    highlightTone: z.enum(['positive', 'negative']).optional(),
    yLabel: z.string().optional(),
  }),
  z.object({
    type: z.literal('compounding'),
    principal: z.number().positive(),
    rate: z.number(),
    years: z.number().int().positive().max(80),
    contribution: z.number().nonnegative().optional(),
    /** Draws a second, dimmer curve for contrast (e.g. a lower rate). */
    compareRate: z.number().optional(),
  }),
  z.object({
    type: z.literal('payoff'),
    legs: z.array(OptionLegSchema).min(1).max(4),
    spotRange: z.tuple([z.number(), z.number()]).optional(),
  }),
]);
export type ChartSpec = z.infer<typeof ChartSpecSchema>;

export const ChartMotionSchema = z.enum(['draw', 'build', 'sequence', 'focus']);
export type ChartMotion = z.infer<typeof ChartMotionSchema>;

/**
 * A small value shown over an illustration — the number the narration says,
 * kept out of the generated image (image models garble digits) and rendered
 * as crisp, data-driven app text instead. `x`/`y` place the chip's centre as
 * a fraction of the image box, so it tracks any size.
 */
export const ArtLabelToneSchema = z.enum(['green', 'rust', 'ochre', 'slate', 'cream']);
export type ArtLabelTone = z.infer<typeof ArtLabelToneSchema>;

export const ArtLabelSchema = z.object({
  text: z.string().min(1).max(12),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  tone: ArtLabelToneSchema.optional(),
});
export type ArtLabel = z.infer<typeof ArtLabelSchema>;

export const ArtSpecSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('palette'), preset: PalettePresetSchema }),
  z.object({
    kind: z.literal('chart'),
    spec: ChartSpecSchema,
    /** Optional, purposeful entrance motion. Omitted charts remain static. */
    motion: ChartMotionSchema.optional(),
  }),
  z.object({
    kind: z.literal('glyph'),
    name: GlyphNameSchema,
    bg: PalettePresetSchema,
  }),
  z.object({
    kind: z.literal('scene'),
    name: SceneNameSchema,
    palette: PalettePresetSchema,
    /** Short spoken description for screen readers. */
    alt: z.string().min(1).max(160),
  }),
  z.object({
    kind: z.literal('illustration'),
    /** Public path on web; ArtView resolves the production origin on native. */
    source: z.string().regex(/^\/lesson-art\/[a-z0-9-]+\.(?:jpg|png)$/),
    alt: z.string().min(1).max(200),
    focalY: z.number().min(0).max(1).optional(),
    /** Numbers from the narration, overlaid as app text (never baked in). */
    labels: z.array(ArtLabelSchema).max(6).optional(),
  }),
  /**
   * Bitmaps are permitted ONLY for course/book covers, where N is small and
   * bounded. The validator rejects `image` anywhere inside lesson cards.
   */
  z.object({
    kind: z.literal('image'),
    source: z.string().min(1),
    alt: z.string().min(1),
  }),
]);
export type ArtSpec = z.infer<typeof ArtSpecSchema>;

/** A checkable, learner-visible source for educational claims. */
export const ContentSourceSchema = z.object({
  title: z.string().min(1).max(120),
  url: z.string().url(),
  publisher: z.string().min(1).max(80),
});
export type ContentSource = z.infer<typeof ContentSourceSchema>;

/* ------------------------------------------------------------------ *
 * Cards — the seven types the whole product is built around
 * ------------------------------------------------------------------ */

const CardBase = {
  id: CardIdSchema,
  /** Entities this card relates to; powers cross-link chips and KB backlinks. */
  refs: z.array(EntityRefSchema).optional(),
};

export const ConceptCardSchema = z.object({
  ...CardBase,
  type: z.literal('concept'),
  headline: RichTextSchema,
  body: RichTextSchema,
  art: ArtSpecSchema.optional(),
});

export const DiagramCardSchema = z.object({
  ...CardBase,
  type: z.literal('diagram'),
  /** Required — on this card the visual *is* the content. */
  art: ArtSpecSchema,
  caption: RichTextSchema,
  title: z.string().max(60).optional(),
});

export const StickerRevealCardSchema = z.object({
  ...CardBase,
  type: z.literal('sticker_reveal'),
  body: RichTextSchema,
  stickers: z
    .array(
      z.object({
        label: z.string().min(1).max(32),
        art: ArtSpecSchema,
        /** Position as 0..1 fractions of the card box. */
        anchor: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
        rotation: z.number().min(-20).max(20).optional(),
      }),
    )
    .min(1)
    .max(4),
});

export const ChoiceOptionSchema = z.object({
  id: z.string().min(1).max(24),
  label: z.string().min(1).max(48),
  correct: z.boolean(),
});
export type ChoiceOption = z.infer<typeof ChoiceOptionSchema>;

export const BinaryChoiceCardSchema = z.object({
  ...CardBase,
  type: z.literal('binary_choice'),
  prompt: RichTextSchema,
  art: ArtSpecSchema.optional(),
  /** Exactly two — the tuple enforces arity, the validator enforces one correct. */
  options: z.tuple([ChoiceOptionSchema, ChoiceOptionSchema]),
  explanation: RichTextSchema,
});

export const FillBlankCardSchema = z.object({
  ...CardBase,
  type: z.literal('fill_blank'),
  /** Must contain exactly one [[1]] slot — enforced by the validator. */
  body: RichTextSchema,
  wordBank: z.array(z.string().min(1).max(24)).min(3).max(4),
  answer: z.string().min(1).max(24),
  explanation: RichTextSchema.optional(),
});

export const MainIdeaCardSchema = z.object({
  ...CardBase,
  type: z.literal('main_idea'),
  title: z.string().max(40).optional(),
  summary: RichTextSchema,
  bullets: z.array(RichTextSchema).min(2).max(4),
});

export const KeyInsightCardSchema = z.object({
  ...CardBase,
  type: z.literal('key_insight'),
  /** The square art panel above the black insight panel. */
  art: ArtSpecSchema,
  /** Plain text, not rich — this is the shareable line. */
  insight: z.string().min(1),
  attribution: z
    .object({ source: z.string().min(1), detail: z.string().optional() })
    .optional(),
  frame: z.enum(['none', 'gradient']).optional(),
});

export const CardSchema = z.discriminatedUnion('type', [
  ConceptCardSchema,
  DiagramCardSchema,
  StickerRevealCardSchema,
  BinaryChoiceCardSchema,
  FillBlankCardSchema,
  MainIdeaCardSchema,
  KeyInsightCardSchema,
]);

export type ConceptCard = z.infer<typeof ConceptCardSchema>;
export type DiagramCard = z.infer<typeof DiagramCardSchema>;
export type StickerRevealCard = z.infer<typeof StickerRevealCardSchema>;
export type BinaryChoiceCard = z.infer<typeof BinaryChoiceCardSchema>;
export type FillBlankCard = z.infer<typeof FillBlankCardSchema>;
export type MainIdeaCard = z.infer<typeof MainIdeaCardSchema>;
export type KeyInsightCard = z.infer<typeof KeyInsightCardSchema>;
export type Card = z.infer<typeof CardSchema>;
export type CardType = Card['type'];

/* ------------------------------------------------------------------ *
 * Courses, units, lessons
 * ------------------------------------------------------------------ */

export const COURSE_CATEGORIES = [
  'fundamentals',
  'analysis',
  'technicals',
  'risk',
  'psychology',
  'strategies',
  'getting-started',
  'crypto',
  'fixed-income',
  'alternatives',
] as const;
export const CourseCategorySchema = z.enum(COURSE_CATEGORIES);
export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

export const UnitSchema = z.object({
  id: UnitIdSchema,
  index: z.number().int().positive(),
  /** Shown uppercase in the path banner, e.g. "WHAT MOVES A PRICE". */
  name: z.string().min(1).max(40),
  lessonIds: z.array(LessonIdSchema).min(1),
});
export type Unit = z.infer<typeof UnitSchema>;

export const CourseSchema = z.object({
  id: CourseIdSchema,
  title: z.string().min(1).max(80),
  /** Attribution line under the cover in the Explore grid. */
  author: z.string().min(1),
  category: CourseCategorySchema,
  cover: ArtSpecSchema,
  blurb: z.string().min(1).max(240),
  order: z.number().int().nonnegative(),
  isNew: z.boolean().optional(),
  units: z.array(UnitSchema).min(1),
  /** Validated against the sum of its lessons' xp. */
  totalXp: z.number().int().positive(),
});
export type Course = z.infer<typeof CourseSchema>;

export const LessonSchema = z.object({
  id: LessonIdSchema,
  courseId: CourseIdSchema,
  title: z.string().min(1).max(70),
  estimatedMinutes: z.number().positive().max(10),
  xp: z.number().int().positive(),
  /** 8–15 cards keeps a chapter at roughly two minutes. */
  cards: z.array(CardSchema).min(8).max(15),
  /** Completing this lesson may unlock knowledge-base entities. */
  unlocks: z.array(EntityRefSchema).optional(),
  refs: z.array(EntityRefSchema).optional(),
  /** At least one authoritative reference for the lesson's factual claims. */
  sources: z.array(ContentSourceSchema).min(1).max(6),
});
export type Lesson = z.infer<typeof LessonSchema>;

/* ------------------------------------------------------------------ *
 * This Week — timely, dated market notes
 *
 * A short, dated drop (1–6 cards) in the same card format as a lesson, tying a
 * current market moment back to a concept. Deliberately lighter than a lesson:
 * no XP, fewer cards, and it carries a publish date so the feed can order and
 * badge it. Same sourcing rigor as everything else — a market claim still needs
 * a reference.
 * ------------------------------------------------------------------ */

export const WeeklyNoteSchema = z.object({
  id: z.string().min(1).max(60),
  /** 'YYYY-MM-DD' publish date; drives ordering and the "new" badge. */
  publishedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD'),
  title: z.string().min(1).max(70),
  /** One-line teaser shown on the feed card. */
  summary: z.string().min(1).max(160),
  cards: z.array(CardSchema).min(1).max(6),
  /** Optional link back to the lesson whose concept this note applies. */
  relatedLessonPath: LessonPathSchema.optional(),
  sources: z.array(ContentSourceSchema).min(1).max(6),
});
export type WeeklyNote = z.infer<typeof WeeklyNoteSchema>;

/* ------------------------------------------------------------------ *
 * Knowledge base
 * ------------------------------------------------------------------ */

export const TraderSchema = z.object({
  id: TraderIdSchema,
  name: z.string().min(1),
  era: z.string().min(1),
  portrait: ArtSpecSchema,
  oneLiner: z.string().min(1).max(80),
  bio: RichTextSchema,
  philosophy: z.array(RichTextSchema).min(2).max(8),
  trackRecord: z
    .array(
      z.object({
        metric: z.string().min(1),
        value: z.string().min(1),
        note: z.string().optional(),
        /**
         * Track-record claims are stated as fact about real people, so a
         * source is required. Unsourced performance claims are a real
         * defamation and accuracy risk.
         */
        source: z.string().min(1),
        /**
         * Optional deep link to the primary source, when one is genuinely
         * online (an SEC filing, a shareholder letter). Left off for sources
         * that legitimately have no canonical URL — a book, a print interview —
         * where inventing one would be worse than the citation text alone.
         */
        sourceUrl: z.string().url().optional(),
      }),
    )
    .optional(),
  signatureStrategies: z.array(StrategyIdSchema).min(1),
  famousTrades: z
    .array(
      z.object({
        title: z.string().min(1),
        year: z.string().optional(),
        story: RichTextSchema,
        source: z.string().min(1),
        sourceUrl: z.string().url().optional(),
      }),
    )
    .optional(),
  quotes: z
    .array(z.object({ text: z.string().min(1), context: z.string().optional() }))
    .min(1),
  recommendedReading: z.array(BookIdSchema),
  relatedTraders: z.array(TraderIdSchema).optional(),
});
export type Trader = z.infer<typeof TraderSchema>;

export const STRATEGY_FAMILIES = [
  'value',
  'growth',
  'momentum',
  'trend',
  'mean-reversion',
  'income',
  'macro',
] as const;
export const StrategyFamilySchema = z.enum(STRATEGY_FAMILIES);
export type StrategyFamily = (typeof STRATEGY_FAMILIES)[number];

export const StrategySchema = z.object({
  id: StrategyIdSchema,
  name: z.string().min(1).max(60),
  family: StrategyFamilySchema,
  oneLiner: z.string().min(1).max(90),
  thesis: RichTextSchema,
  timeframe: z.enum(['intraday', 'swing', 'position', 'long-term']),
  riskLevel: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  entryRules: z.array(RichTextSchema).min(2),
  exitRules: z.array(RichTextSchema).min(2),
  riskManagement: z.array(RichTextSchema).min(2),
  practicedBy: z.array(TraderIdSchema),
  furtherReading: z.array(BookIdSchema),
  /** THE unlock gate — the strategy stays locked until all are completed. */
  prerequisiteLessons: z.array(LessonPathSchema).min(1),
  /** Evidence or first-party educational material; never promotional copy alone. */
  sources: z.array(ContentSourceSchema).min(1).max(6),
  illustrativeChart: ChartSpecSchema.optional(),
  /**
   * A playable deck, in the same `Card[]` union a lesson uses.
   *
   * The rules above are reference material — the shape of the strategy, there
   * to look up once you already understand it. This is where it is actually
   * *taught*: why the edge is claimed to exist, what it costs, and the
   * conditions under which it stops working.
   *
   * Optional because a strategy page is complete without one and the unlock
   * gate does not depend on it, so guides can land one at a time.
   */
  guideCards: z.array(CardSchema).min(5).max(15).optional(),
});
export type Strategy = z.infer<typeof StrategySchema>;

export const BookSchema = z.object({
  id: BookIdSchema,
  title: z.string().min(1),
  author: z.string().min(1),
  year: z.number().int().min(1500).max(2100),
  /** ORIGINAL art. Never the publisher's jacket. */
  cover: ArtSpecSchema,
  /** Original summary prose. There is deliberately no field for excerpts. */
  summary: RichTextSchema,
  /** Reuses the Card union, so book guides play in the lesson player as-is. */
  guideCards: z.array(CardSchema).min(5).max(15),
  buyLinks: z
    .array(z.object({ label: z.string().min(1), url: z.string().url() }))
    .min(1),
  relatedTraders: z.array(TraderIdSchema).optional(),
  relatedStrategies: z.array(StrategyIdSchema).optional(),
  /** Required and non-empty — attribution is not optional for book guides. */
  attribution: z.string().min(1),
});
export type Book = z.infer<typeof BookSchema>;

/**
 * A glossary term — a reference entry, not a lesson.
 *
 * Deliberately tiny: one short definition and a link back to the lesson that
 * actually teaches it. Keeping the definition to a sentence or two (enforced by
 * the prose budget) is what stops the glossary becoming a second, drifting copy
 * of the curriculum. It teaches nothing new; it lets a learner look a word up.
 */
export const TermSchema = z.object({
  id: TermIdSchema,
  /** The display term, e.g. "Bid-ask spread". */
  term: z.string().min(1).max(60),
  /** Other spellings/synonyms this entry should also be found by (search, links). */
  aliases: z.array(z.string().min(1).max(60)).max(6).optional(),
  /** One or two plain sentences. Prose-budget enforced. */
  definition: RichTextSchema,
  /** The lesson (or KB entity) that teaches it — the "learn more" backlink. */
  learnMore: EntityRefSchema.optional(),
  /** Related terms or entities, shown as chips. */
  related: z.array(EntityRefSchema).max(6).optional(),
});
export type Term = z.infer<typeof TermSchema>;

/* ------------------------------------------------------------------ *
 * Prose budgets
 * ------------------------------------------------------------------ */

/**
 * Imprint's cards are short. Nothing degrades a clone faster than
 * wall-of-text cards, and machine-enforcing brevity is what stops quality
 * drifting as content volume grows. The validator warns past these.
 */
export const PROSE_BUDGET = {
  conceptBody: 55,
  conceptHeadline: 12,
  diagramCaption: 40,
  stickerBody: 45,
  choicePrompt: 35,
  fillBlankBody: 45,
  mainIdeaSummary: 35,
  mainIdeaBullet: 25,
  keyInsight: 30,
  termDefinition: 40,
} as const;
