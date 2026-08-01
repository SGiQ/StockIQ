import assert from 'node:assert/strict';
import test from 'node:test';
import { allBooks, allLessons, allStrategies } from '../src/content/index.generated';
import type { ArtSpec, Card } from '../src/content/types';

const expected = {
  line: 'draw',
  candles: 'sequence',
  bars: 'build',
  compounding: 'draw',
  payoff: 'focus',
} as const;

function cardArt(card: Card): ArtSpec[] {
  const art: ArtSpec[] = [];
  if ('art' in card && card.art) art.push(card.art);
  if (card.type === 'sticker_reveal') art.push(...card.stickers.map((sticker) => sticker.art));
  return art;
}

test('every computed chart has the semantic motion mode', () => {
  const decks: Card[][] = [
    ...allLessons.map((lesson) => lesson.cards),
    ...allBooks.map((book) => (book.guideCards ?? []) as Card[]),
    ...allStrategies.map((strategy) => (strategy.guideCards ?? []) as Card[]),
  ];
  const charts = decks.flatMap((cards) => cards.flatMap(cardArt)).filter(
    (art): art is Extract<ArtSpec, { kind: 'chart' }> => art.kind === 'chart',
  );

  assert.equal(charts.length, 82);
  for (const chart of charts) assert.equal(chart.motion, expected[chart.spec.type]);
});
