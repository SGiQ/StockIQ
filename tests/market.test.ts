import assert from 'node:assert/strict';
import test from 'node:test';
import { changeTone, formatChange, formatPrice } from '../src/services/market/format';
import { MockMarketService } from '../src/services/market/MockMarketService';

test('formatPrice: two decimals with thousands separators', () => {
  assert.equal(formatPrice(1234.5), '$1,234.50');
  assert.equal(formatPrice(9.1), '$9.10');
  assert.equal(formatPrice(0), '$0.00');
});

test('changeTone: sign decides direction, zero and NaN are flat', () => {
  assert.equal(changeTone(1.2), 'up');
  assert.equal(changeTone(-0.01), 'down');
  assert.equal(changeTone(0), 'flat');
  assert.equal(changeTone(Number.NaN), 'flat');
});

test('formatChange: signed absolute value and percent', () => {
  assert.equal(formatChange(1.23, 0.98), '+1.23 (+0.98%)');
  assert.equal(formatChange(-0.5, -0.4), '-0.50 (-0.40%)');
  assert.equal(formatChange(0, 0), '0.00 (0.00%)');
});

test('MockMarketService: deterministic per symbol, marked not-live', async () => {
  const svc = new MockMarketService();
  assert.equal(svc.isLive(), false);
  const a = await svc.quotes(['AAPL', 'MSFT']);
  const b = await svc.quotes(['AAPL', 'MSFT']);
  assert.deepEqual(a, b, 'same symbols yield the same quotes');
  assert.equal(a.length, 2);
  assert.equal(a[0]!.symbol, 'AAPL');
  assert.ok(a[0]!.price > 0 && a[0]!.valid);
  // change is internally consistent with price and percent
  const q = a[0]!;
  assert.ok(Math.abs(q.change - (q.price * q.changePercent) / 100) < 0.01);
});
