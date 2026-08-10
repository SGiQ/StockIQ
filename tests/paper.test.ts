import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STARTING_CASH,
  buy,
  sell,
  emptyPortfolio,
  positionPnL,
  positionPnLPercent,
  totalValue,
  totalReturn,
  positionWeights,
  portfolioCoachPrompt,
  type Portfolio,
} from '../src/features/paper';

const ok = (r: ReturnType<typeof buy>): Portfolio => {
  assert.ok(r.ok, r.ok ? '' : r.reason);
  return (r as { ok: true; portfolio: Portfolio }).portfolio;
};

test('buy: deducts cash and records average cost', () => {
  const p = ok(buy(emptyPortfolio(), 'AAPL', 100, 10));
  assert.equal(p.cash, STARTING_CASH - 1000);
  assert.deepEqual(p.positions, [{ symbol: 'AAPL', shares: 10, avgCost: 100 }]);
});

test('buy: a second buy blends the average cost', () => {
  let p = ok(buy(emptyPortfolio(), 'AAPL', 100, 10));
  p = ok(buy(p, 'AAPL', 120, 10));
  assert.equal(p.positions[0]!.shares, 20);
  assert.equal(p.positions[0]!.avgCost, 110); // (100*10 + 120*10)/20
});

test('buy: refuses when the cost exceeds cash', () => {
  const r = buy(emptyPortfolio(), 'AAPL', 100, 1000); // $100k > $10k
  assert.equal(r.ok, false);
});

test('buy: rejects non-positive shares or a missing price', () => {
  assert.equal(buy(emptyPortfolio(), 'AAPL', 100, 0).ok, false);
  assert.equal(buy(emptyPortfolio(), 'AAPL', 0, 5).ok, false);
});

test('sell: adds cash, reduces shares, clears the position at zero', () => {
  let p = ok(buy(emptyPortfolio(), 'AAPL', 100, 10));
  p = ok(sell(p, 'AAPL', 130, 4));
  assert.equal(p.positions[0]!.shares, 6);
  assert.equal(p.cash, STARTING_CASH - 1000 + 520);
  p = ok(sell(p, 'AAPL', 130, 6));
  assert.deepEqual(p.positions, []); // fully sold clears it
});

test('sell: refuses selling more than held', () => {
  const p = ok(buy(emptyPortfolio(), 'AAPL', 100, 5));
  assert.equal(sell(p, 'AAPL', 100, 6).ok, false);
  assert.equal(sell(p, 'MSFT', 100, 1).ok, false); // not held at all
});

test('P&L: value, gain, and percent track the live price', () => {
  const p = ok(buy(emptyPortfolio(), 'AAPL', 100, 10));
  const pos = p.positions[0]!;
  assert.equal(positionPnL(pos, 115), 150); // 10 * (115-100)
  assert.equal(positionPnLPercent(pos, 115), 15);
  assert.equal(positionPnL(pos, 90), -100);
});

test('totalValue / totalReturn: cash plus holdings vs starting cash', () => {
  const p = ok(buy(emptyPortfolio(), 'AAPL', 100, 10)); // $1000 in, $9000 cash
  const priceOf = (s: string) => (s === 'AAPL' ? 150 : undefined);
  assert.equal(totalValue(p, priceOf), 9000 + 1500);
  assert.deepEqual(totalReturn(p, priceOf), { abs: 500, pct: 5 });
  // a missing price falls back to cost basis (no phantom gain/loss)
  assert.equal(totalValue(p, () => undefined), STARTING_CASH);
});

/* ── coaching prompt ───────────────────────────────────────────────── */

test('positionWeights: each holding as a percent of total value', () => {
  const p = ok(buy(emptyPortfolio(), 'AAPL', 100, 10)); // $1000 held, $9000 cash
  const w = positionWeights(p, (s) => (s === 'AAPL' ? 100 : undefined));
  assert.deepEqual(w, [{ symbol: 'AAPL', weight: 10 }]); // 1000 / 10000
});

test('portfolioCoachPrompt: carries weights and the no-advice clause', () => {
  const p = ok(buy(emptyPortfolio(), 'AAPL', 100, 60)); // $6000 held -> 60%
  const prompt = portfolioCoachPrompt(p, (s) => (s === 'AAPL' ? 100 : undefined));
  assert.match(prompt, /AAPL about 60%/);
  assert.match(prompt, /Cash is about 40%/);
  assert.match(prompt, /position sizing and diversification/);
  assert.match(prompt, /Do not recommend buying, selling, or holding/);
});

test('portfolioCoachPrompt: handles an empty portfolio', () => {
  assert.match(portfolioCoachPrompt(emptyPortfolio(), () => undefined), /no holdings yet/);
});
