import type { ArtSpec, Lesson } from './schema';

type Hero = Extract<ArtSpec, { kind: 'illustration' }>;

const hero = (source: string, alt: string): Hero => ({
  kind: 'illustration',
  source: `/lesson-art/${source}.jpg`,
  alt,
});

/**
 * One visual thesis per lesson. Openings introduce the metaphor and closing
 * key-insight cards return to it as a deliberate bookend.
 */
export const lessonArtwork: Record<string, Hero> = {
  'getting-started/first-trade': hero('broker-agent', 'A broker hands a share across a bridge, turning a decision into ownership.'),

  'market-foundations/bid-ask-and-spread': hero('bid-ask-paper', 'Buyers and sellers face each other across the small gap between their best offers.'),
  'market-foundations/exchanges-and-brokers': hero('exchanges-and-brokers', 'An order travels through a broker into an exchange where buyers and sellers meet.'),
  'market-foundations/indices-and-benchmarks': hero('indices-and-benchmarks', 'A weighted basket of companies sits beside a benchmark running path.'),
  'market-foundations/market-cap': hero('market-cap-paper', 'A broad company owned in many pieces outweighs a smaller company with a tall price tag.'),
  'market-foundations/order-types': hero('order-types-paper', 'Three order paths use an open gate, a controlled gate, and a trigger gate.'),
  'market-foundations/reading-a-quote': hero('reading-a-quote', 'An investor examines a company through many pieces of quote-page evidence.'),
  'market-foundations/what-is-a-stock': hero('ownership', 'A learner holds one ownership piece from a business assembled from many shares.'),
  'market-foundations/what-moves-a-price': hero('what-moves-a-price', 'A company reveals results that differ from the expectations of a waiting audience.'),
  'market-foundations/why-companies-sell-shares': hero('why-companies-sell-shares', 'A crowd contributes ownership tiles that fund a workshop expansion.'),

  'reading-a-business/cash-flow-is-king': hero('cash-flow-is-king', 'A real cash stream keeps company wheels turning while a dry accounting channel cannot.'),
  'reading-a-business/dividends-and-buybacks': hero('dividends-and-buybacks', 'A company tree distributes fruit to owners and draws ownership pieces back into itself.'),
  'reading-a-business/economic-moats': hero('economic-moats', 'A profitable company castle is protected from competitors by several durable defenses.'),
  'reading-a-business/margins-that-matter': hero('margins-that-matter', 'Two businesses process similar sales but retain very different portions after costs.'),
  'reading-a-business/revenue-vs-earnings': hero('revenue-vs-earnings', 'A large stream of sales passes through expenses and leaves a much smaller profit stack.'),
  'reading-a-business/the-price-earnings-ratio': hero('the-price-earnings-ratio', 'A merchant compares a purchase-price stack with recurring earnings reflected in distorting mirrors.'),

  'reading-a-chart/anatomy-of-a-candle': hero('anatomy-of-a-candle', 'A folded-paper candlestick exposes its body and upper and lower wicks.'),
  'reading-a-chart/momentum-indicators': hero('momentum-indicators', 'A market cart climbs while a speed gauge begins to lose strength.'),
  'reading-a-chart/moving-averages': hero('moving-averages', 'A smoothing machine turns a jagged price path into fast and slow directional ribbons.'),
  'reading-a-chart/patterns-and-their-limits': hero('patterns-and-their-limits', 'A learner connects the same scattered evidence into several possible patterns.'),
  'reading-a-chart/price-and-time': hero('price-and-time', 'Short and long viewing frames reveal different stories in the same price path.'),
  'reading-a-chart/support-and-resistance': hero('support-and-resistance', 'A price repeatedly meets a floor and ceiling before finally breaking through.'),
  'reading-a-chart/trend-and-structure': hero('trend-and-structure', 'Two price paths with similar endpoints form opposite sequences of peaks and valleys.'),
  'reading-a-chart/volume-confirms': hero('volume-confirms', 'One price move has broad participation beneath it while another rests on thin support.'),

  'risk-and-position-sizing/diversification-and-correlation': hero('diversification-and-correlation', 'One basket moves under a single shared wind while another combines genuinely different forces.'),
  'risk-and-position-sizing/drawdown-and-recovery': hero('drawdown-and-recovery', 'A wealth path falls from its high-water line into a valley before recovering.'),
  'risk-and-position-sizing/position-sizing': hero('position-sizing', 'A measured cargo survives the market wave while an overloaded cart overturns.'),
  'risk-and-position-sizing/risk-of-ruin': hero('risk-of-ruin', 'A measured trader survives a long crossing while an all-in leap breaks the path.'),
  'risk-and-position-sizing/stop-losses': hero('stop-losses', 'One traveler sets an exit gate before the storm while another builds one during collapse.'),
  'risk-and-position-sizing/thinking-in-r': hero('thinking-in-r', 'Two traders compare different outcomes using the same standard risk block.'),
  'risk-and-position-sizing/why-losses-hurt-more': hero('why-losses-hurt-more', 'A portfolio falls into a valley and faces a much steeper climb back.'),

  'trading-psychology/confirmation-bias': hero('confirmation-bias', 'A colored telescope highlights agreement while contradictory evidence falls outside its view.'),
  'trading-psychology/fear-of-missing-out': hero('fear-of-missing-out', 'A crowd chases a market train only after it has climbed a steep track.'),
  'trading-psychology/loss-aversion': hero('loss-aversion', 'A trader clings to a damaged branch while an equal loss casts an oversized shadow.'),
  'trading-psychology/patience-and-inaction': hero('patience-and-inaction', 'A patient gardener waits through seasons while an impatient trader repeatedly disturbs new growth.'),
  'trading-psychology/process-vs-outcome': hero('process-vs-outcome', 'A judge compares a careful unlucky shot with a reckless lucky one.'),
  'trading-psychology/revenge-trading': hero('revenge-trading', 'An angry trader lunges from one fallen block toward a much larger dangerous lever.'),
  'trading-psychology/the-trading-journal': hero('the-trading-journal', 'A structured journal reveals patterns that a trader’s clouded memory cannot preserve.'),
};

/**
 * Lessons whose opening card carries its own bespoke illustration, so the hero
 * bookends only the closing card rather than covering that opening art.
 */
const heroClosingOnly = new Set<string>(['market-foundations/what-moves-a-price']);

export const applyLessonArtwork = (lesson: Lesson): Lesson => {
  const path = `${lesson.courseId}/${lesson.id}`;
  const art = lessonArtwork[path];
  if (!art) return lesson;

  const closingOnly = heroClosingOnly.has(path);
  return {
    ...lesson,
    cards: lesson.cards.map((card, index) => {
      if (index === 0 && card.type === 'concept' && !closingOnly) return { ...card, art };
      if (index === lesson.cards.length - 1 && card.type === 'key_insight') return { ...card, art };
      return card;
    }),
  };
};
