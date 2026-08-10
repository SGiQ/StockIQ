/**
 * Paper-trading math — a practice portfolio of *simulated* money.
 *
 * IMPORTANT FRAMING: nothing here touches real money, a real broker, or a real
 * order. It is a sandbox for applying what the lessons teach (position sizing,
 * cost basis, P&L) against delayed prices. Every surface that shows it must say
 * so — a simulated gain is not a real one, and this is never a trade signal.
 *
 * Pure and dependency-free: it takes a portfolio and a price and returns a new
 * portfolio or a number. Persistence and quotes live elsewhere.
 */

/** Everyone starts with the same simulated cash so returns are comparable. */
export const STARTING_CASH = 10000;

export interface PaperPosition {
  symbol: string;
  shares: number;
  /** Average cost per share across buys. */
  avgCost: number;
}

export interface Portfolio {
  cash: number;
  positions: PaperPosition[];
}

export const emptyPortfolio = (): Portfolio => ({ cash: STARTING_CASH, positions: [] });

const round2 = (n: number): number => Math.round(n * 100) / 100;
const EPS = 1e-6;

export type TradeResult = { ok: true; portfolio: Portfolio } | { ok: false; reason: string };

/** Buy `shares` of `symbol` at `price`, blending into the average cost. */
export function buy(p: Portfolio, symbol: string, price: number, shares: number): TradeResult {
  if (!(shares > 0)) return { ok: false, reason: 'Enter a positive number of shares.' };
  if (!(price > 0)) return { ok: false, reason: 'No live price for this symbol yet.' };
  const cost = price * shares;
  if (cost > p.cash + EPS) return { ok: false, reason: 'Not enough simulated cash.' };

  const existing = p.positions.find((x) => x.symbol === symbol);
  const positions = existing
    ? p.positions.map((x) =>
        x.symbol === symbol
          ? {
              ...x,
              shares: round2(x.shares + shares),
              avgCost: round2((x.avgCost * x.shares + cost) / (x.shares + shares)),
            }
          : x,
      )
    : [...p.positions, { symbol, shares, avgCost: round2(price) }];
  return { ok: true, portfolio: { cash: round2(p.cash - cost), positions } };
}

/** Sell `shares` of `symbol` at `price`; the position clears when it hits zero. */
export function sell(p: Portfolio, symbol: string, price: number, shares: number): TradeResult {
  if (!(shares > 0)) return { ok: false, reason: 'Enter a positive number of shares.' };
  if (!(price > 0)) return { ok: false, reason: 'No live price for this symbol yet.' };
  const existing = p.positions.find((x) => x.symbol === symbol);
  if (!existing || shares > existing.shares + EPS) {
    return { ok: false, reason: `You only hold ${existing?.shares ?? 0} share(s).` };
  }
  const remaining = round2(existing.shares - shares);
  const positions =
    remaining <= EPS
      ? p.positions.filter((x) => x.symbol !== symbol)
      : p.positions.map((x) => (x.symbol === symbol ? { ...x, shares: remaining } : x));
  return { ok: true, portfolio: { cash: round2(p.cash + price * shares), positions } };
}

type PriceOf = (symbol: string) => number | undefined;

export function positionValue(pos: PaperPosition, price: number): number {
  return round2(pos.shares * price);
}
export function positionCost(pos: PaperPosition): number {
  return round2(pos.shares * pos.avgCost);
}
export function positionPnL(pos: PaperPosition, price: number): number {
  return round2(positionValue(pos, price) - positionCost(pos));
}
export function positionPnLPercent(pos: PaperPosition, price: number): number {
  const cost = positionCost(pos);
  return cost === 0 ? 0 : round2((positionPnL(pos, price) / cost) * 100);
}

/** Market value of the holdings; falls back to cost basis when a price is missing. */
export function holdingsValue(p: Portfolio, priceOf: PriceOf): number {
  return round2(
    p.positions.reduce((sum, pos) => sum + pos.shares * (priceOf(pos.symbol) ?? pos.avgCost), 0),
  );
}

export function totalValue(p: Portfolio, priceOf: PriceOf): number {
  return round2(p.cash + holdingsValue(p, priceOf));
}

/** Total return versus the starting cash, absolute and percent. */
export function totalReturn(p: Portfolio, priceOf: PriceOf): { abs: number; pct: number } {
  const tv = totalValue(p, priceOf);
  return { abs: round2(tv - STARTING_CASH), pct: round2(((tv - STARTING_CASH) / STARTING_CASH) * 100) };
}
