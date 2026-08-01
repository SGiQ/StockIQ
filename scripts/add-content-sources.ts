/** One-time, repeatable source assignment for lessons and strategy guides. */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type Source = { title: string; url: string; publisher: string };

const SOURCES = {
  investorBasics: {
    title: 'Introduction to Investing',
    url: 'https://www.investor.gov/introduction-investing',
    publisher: 'U.S. SEC Investor.gov',
  },
  orders: {
    title: 'Order Types',
    url: 'https://www.finra.org/investors/investing/investment-products/stocks/order-types',
    publisher: 'FINRA',
  },
  statements: {
    title: "Beginner's Guide to Financial Statements",
    url: 'https://www.sec.gov/about/reports-publications/investor-publications/beginners-guide-financial-statements',
    publisher: 'U.S. Securities and Exchange Commission',
  },
  diversification: {
    title: 'Diversify Your Investments',
    url: 'https://www.investor.gov/introduction-investing/investing-basics/save-and-invest/diversify-your-investments',
    publisher: 'U.S. SEC Investor.gov',
  },
  behavioral: {
    title: 'The Behavioral Biases of Individuals',
    url: 'https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/the-behavioral-biases-of-individuals',
    publisher: 'CFA Institute',
  },
  charts: {
    title: 'Technical Analysis: Modern Perspectives',
    url: 'https://rpc.cfainstitute.org/research/foundation/2017/technical-analysis',
    publisher: 'CFA Institute',
  },
  options: {
    title: 'Options Institute Learning Resources',
    url: 'https://www.cboe.com/optionsinstitute/',
    publisher: 'Cboe Options Institute',
  },
  research: {
    title: 'Research Before You Invest',
    url: 'https://www.investor.gov/introduction-investing/getting-started/investing-your-own',
    publisher: 'U.S. SEC Investor.gov',
  },
} satisfies Record<string, Source>;

const LESSON_SOURCE: Record<string, Source[]> = {
  'market-foundations': [SOURCES.investorBasics, SOURCES.orders],
  'reading-a-business': [SOURCES.statements, SOURCES.research],
  'reading-a-chart': [SOURCES.charts, SOURCES.research],
  'risk-and-position-sizing': [SOURCES.diversification, SOURCES.investorBasics],
  'trading-psychology': [SOURCES.behavioral, SOURCES.research],
};

const STRATEGY_SOURCE: Record<string, Source[]> = {
  'covered-call-wheel': [SOURCES.options, SOURCES.research],
  'value-investing': [SOURCES.statements, SOURCES.research],
  'growth-at-a-reasonable-price': [SOURCES.statements, SOURCES.research],
  canslim: [SOURCES.statements, SOURCES.research],
  'momentum-investing': [SOURCES.charts, SOURCES.research],
  'trend-following': [SOURCES.charts, SOURCES.research],
  'mean-reversion': [SOURCES.charts, SOURCES.research],
};

async function rewrite(file: string, sources: Source[]) {
  const original = await readFile(file, 'utf8');
  const close = original.lastIndexOf('\n}');
  if (close < 0) throw new Error(`${file}: expected a top-level JSON object`);

  // Sources are deliberately the final property, which makes this repeatable
  // without reserialising every card and turning a metadata audit into a
  // several-thousand-line formatting diff.
  const existing = original.lastIndexOf(',\n  "sources": ');
  const base = existing >= 0 ? original.slice(0, existing) : original.slice(0, close);
  const sourceJson = JSON.stringify(sources, null, 2).replace(/\n/g, '\n  ');
  await writeFile(file, `${base},\n  "sources": ${sourceJson}\n}\n`);
}

async function main() {
  for (const [courseId, sources] of Object.entries(LESSON_SOURCE)) {
    const dir = path.join(process.cwd(), 'content', 'lessons', courseId);
    for (const file of await readdir(dir)) {
      if (file.endsWith('.json')) await rewrite(path.join(dir, file), sources);
    }
  }
  for (const [id, sources] of Object.entries(STRATEGY_SOURCE)) {
    await rewrite(path.join(process.cwd(), 'content', 'strategies', `${id}.json`), sources);
  }
  console.log('Added authoritative source registries to lessons and strategies.');
}

void main();
