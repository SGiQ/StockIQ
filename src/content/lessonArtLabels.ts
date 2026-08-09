import type { ArtLabel, ArtSpec, Card, Lesson } from './schema';

/**
 * Numbers the narration says, overlaid on the flat illustrations as crisp app
 * text rather than baked into the image — AI image generators garble digits,
 * and text painted into a JPG can't stay in sync with the copy or be read by a
 * screen reader. Applied to illustration cards by their exact `courseId/lessonId`
 * → `cardId` address, so the *same* reused image (e.g. `execution-tradeoff`) can
 * carry the right figure on each card. Lesson JSON stays untouched — same
 * runtime-overlay approach as [[lessonArtwork]].
 *
 * `x`/`y` are the chip centre as a fraction of the image box (0–1); `tone`
 * follows the illustration semantics — green = kept/more, rust = cost/loss/risk,
 * slate = neutral/before, ochre = a ratio. Coordinates are first-pass placements
 * matched to the flat prompt compositions in `docs/lesson-art-generation.md`;
 * they get nudged once each real image exists. Labels attach only after a scene
 * card has been converted to an illustration, so most sit dormant until their
 * flat image lands.
 */
export const lessonArtLabels: Record<string, Record<string, ArtLabel[]>> = {
  'market-foundations/bid-ask-and-spread': {
    // two-sided-market — "quoted 10.00 bid, 10.04 ask"
    c2: [
      { text: '10.00 bid', x: 0.27, y: 0.5, tone: 'green' },
      { text: '10.04 ask', x: 0.73, y: 0.5, tone: 'rust' },
    ],
    // spread-toll — buy at the ask (1,004), sell at the bid (1,000)
    c3: [
      { text: '$1,004', x: 0.68, y: 0.34, tone: 'rust' },
      { text: '$1,000', x: 0.32, y: 0.66, tone: 'green' },
    ],
  },
  'market-foundations/indices-and-benchmarks': {
    // price-weighted — a $400 stock (tall green bar) moves the Dow more than a
    // $40 stock (broad rust cubes)
    c4: [
      { text: '$400', x: 0.8, y: 0.6, tone: 'green' },
      { text: '$40', x: 0.25, y: 0.47, tone: 'rust' },
    ],
    // benchmark-race — the leading runner is the index at +14%, the trailing
    // fund at +9%
    c8: [
      { text: '+14%', x: 0.56, y: 0.24, tone: 'green' },
      { text: '+9%', x: 0.28, y: 0.28, tone: 'ochre' },
    ],
  },
  'market-foundations/market-cap': {
    // market-cap-equation — Nimbus: $5 x 12B shares = a $60B company
    c2: [
      { text: '$5', x: 0.17, y: 0.42, tone: 'green' },
      { text: '$60B', x: 0.82, y: 0.5, tone: 'green' },
    ],
    // price-vs-value — a tiny $3 sticker price on the blank tag under a big building
    c5: [{ text: '$3', x: 0.5, y: 0.855, tone: 'slate' }],
  },
  'market-foundations/order-types': {
    // execution-tradeoff (limit) — a limit to buy at $20.00 on the locked green door
    c3: [{ text: '$20.00', x: 0.3, y: 0.4, tone: 'cream' }],
    // stop-trigger — own at $52 (top step), sell stop at $50 (trigger step)
    c5: [
      { text: '$52', x: 0.22, y: 0.2, tone: 'slate' },
      { text: '$50', x: 0.5, y: 0.34, tone: 'rust' },
    ],
    // execution-tradeoff (stop-limit) — limit floor $48 on the locked green door
    c8: [{ text: '$48', x: 0.3, y: 0.42, tone: 'cream' }],
  },
  'market-foundations/reading-a-quote': {
    // price-change — previous close $45.00 (rust pin, lower-left), last $48.20
    // (green pin, upper-right), +7.11% on the ascending steps
    c2: [
      { text: '$45.00', x: 0.2, y: 0.68, tone: 'slate' },
      { text: '$48.20', x: 0.66, y: 0.2, tone: 'green' },
      { text: '+7.11%', x: 0.5, y: 0.5, tone: 'green' },
    ],
    // event-gap — closed $45.00 (lower segment), opened $46.50 (jumped-up segment)
    c4: [
      { text: '$45.00', x: 0.25, y: 0.72, tone: 'slate' },
      { text: '$46.50', x: 0.72, y: 0.36, tone: 'green' },
    ],
  },
  'market-foundations/what-is-a-stock': {
    // shares-ledger-paper — hold 10 of 1,000 shares
    c2: [
      { text: '10', x: 0.3, y: 0.5, tone: 'green' },
      { text: '1,000', x: 0.66, y: 0.45, tone: 'slate' },
    ],
    // ownership-breakdown-paper — founders 45%, funds 34%, public 21%
    c3: [
      { text: '45%', x: 0.5, y: 0.3, tone: 'green' },
      { text: '34%', x: 0.66, y: 0.62, tone: 'ochre' },
      { text: '21%', x: 0.34, y: 0.62, tone: 'slate' },
    ],
  },
  'reading-a-business/cash-flow-is-king': {
    // accrual-timing — $10m booked on the invoice now, cash 90 days later (on the arrow)
    c2: [
      { text: '$10M', x: 0.2, y: 0.28, tone: 'green' },
      { text: '90 days', x: 0.56, y: 0.44, tone: 'slate' },
    ],
    // noncash-charge — $30m of shavings into the expense tray, the purse stays at $0
    c3: [
      { text: '$30M', x: 0.67, y: 0.8, tone: 'rust' },
      { text: '$0 cash', x: 0.17, y: 0.48, tone: 'slate' },
    ],
    // free-cash-flow — $40m in (left), $25m diverts to equipment (centre), $15m free (right tray)
    c6: [
      { text: '$40M', x: 0.13, y: 0.35, tone: 'green' },
      { text: '−$25M', x: 0.52, y: 0.62, tone: 'rust' },
      { text: '$15M', x: 0.88, y: 0.47, tone: 'green' },
    ],
  },
  'reading-a-business/dividends-and-buybacks': {
    // dividend-per-share — $1.20 on the centre per-share pile, a 3% yield
    c2: [
      { text: '$1.20', x: 0.5, y: 0.6, tone: 'green' },
      { text: '3%', x: 0.85, y: 0.58, tone: 'ochre' },
    ],
    // payout-pressure — 60% fed out to the crowd, 40% stays in the machine
    c3: [
      { text: '60%', x: 0.6, y: 0.56, tone: 'rust' },
      { text: '40%', x: 0.19, y: 0.5, tone: 'cream' },
    ],
    // buyback-slices — $2.00 under the 4-slice pie, $2.50 under the 3-slice pie
    c5: [
      { text: '$2.00', x: 0.22, y: 0.86, tone: 'slate' },
      { text: '$2.50', x: 0.55, y: 0.86, tone: 'green' },
    ],
    // yield-trap — 8% on the tempting coin, $15 at the bottom of the sinking funnel
    c8: [
      { text: '8%', x: 0.53, y: 0.27, tone: 'rust' },
      { text: '$15', x: 0.48, y: 0.82, tone: 'slate' },
    ],
  },
  'reading-a-business/margins-that-matter': {
    // gross-margin — $100 on the tall revenue column, −$60 costs block, 40% kept
    c2: [
      { text: '$100', x: 0.4, y: 0.55, tone: 'cream' },
      { text: '−$60', x: 0.64, y: 0.32, tone: 'rust' },
      { text: '40%', x: 0.72, y: 0.6, tone: 'green' },
    ],
    // operating-margin — $40 on the tall step, −$25 removed cost blocks, 15% final step
    c3: [
      { text: '$40', x: 0.27, y: 0.5, tone: 'cream' },
      { text: '−$25', x: 0.6, y: 0.36, tone: 'rust' },
      { text: '15%', x: 0.8, y: 0.72, tone: 'green' },
    ],
  },
  'reading-a-business/revenue-vs-earnings': {
    // coffee-register — $100m on the overflowing till drawer
    c2: [{ text: '$100M', x: 0.5, y: 0.63, tone: 'green' }],
    // coffee-profit-journey — $100m big coin (start), $3m tiny coin (end)
    c3: [
      { text: '$100M', x: 0.12, y: 0.32, tone: 'green' },
      { text: '$3M', x: 0.9, y: 0.66, tone: 'rust' },
    ],
    // coffee-gross-profit — $100m tall stack (left), $38m retained stack (right)
    c4: [
      { text: '$100M', x: 0.25, y: 0.32, tone: 'slate' },
      { text: '$38M', x: 0.85, y: 0.56, tone: 'green' },
    ],
    // coffee-operating-costs — $30m pulled out to staff, rent and marketing
    c5: [{ text: '−$30M', x: 0.62, y: 0.45, tone: 'rust' }],
    // coffee-expansion-risk — record $130m revenue (tall shop), −$3m in the trough
    c7: [
      { text: '$130M', x: 0.82, y: 0.13, tone: 'green' },
      { text: '−$3M', x: 0.7, y: 0.9, tone: 'rust' },
    ],
  },
  'reading-a-business/the-price-earnings-ratio': {
    // pe-equation — $60 above the price banner, $3 by the earnings coin, 20× over the tiles
    c2: [
      { text: '$60', x: 0.2, y: 0.16, tone: 'slate' },
      { text: '$3', x: 0.31, y: 0.72, tone: 'green' },
      { text: '20×', x: 0.78, y: 0.18, tone: 'ochre' },
    ],
    // pe-payback — 20 years, in the clear space above the walked tiles
    c3: [{ text: '20 years', x: 0.72, y: 0.16, tone: 'ochre' }],
    // value-trap — 9× cheap at the top of the slope, 18× down by the pit
    c7: [
      { text: '9×', x: 0.24, y: 0.42, tone: 'green' },
      { text: '18×', x: 0.72, y: 0.68, tone: 'rust' },
    ],
  },
};

const isIllustration = (
  art: ArtSpec | undefined,
): art is Extract<ArtSpec, { kind: 'illustration' }> => art?.kind === 'illustration';

/**
 * Attaches authored numbers to illustration cards by their card id. Runs after
 * [[lessonArtwork]] and only touches cards whose art is already an illustration
 * (scene cards pick their labels up automatically once converted).
 */
export const applyArtLabels = (lesson: Lesson): Lesson => {
  const byCard = lessonArtLabels[`${lesson.courseId}/${lesson.id}`];
  if (!byCard) return lesson;

  let touched = false;
  const cards = lesson.cards.map((card): Card => {
    const art = (card as { art?: ArtSpec }).art;
    if (!isIllustration(art) || art.labels) return card;
    const labels = byCard[card.id];
    if (!labels) return card;
    touched = true;
    return { ...card, art: { ...art, labels } } as Card;
  });
  return touched ? { ...lesson, cards } : lesson;
};
