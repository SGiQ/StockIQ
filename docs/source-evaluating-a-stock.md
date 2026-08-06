# Source: How to Evaluate a Stock — Beginner's Guide

> **Authoring reference, not shipped content.** This is the raw source material
> for the fundamental-analysis lessons that expand the `reading-a-business`
> course. Lessons derived from it live in `content/lessons/reading-a-business/`
> and must pass `npm run validate:content` + the content-quality suite. Claims
> here are attributed to the SEC and FINRA; every derived lesson must carry the
> matching `sources[]` entry. Do not import this file at runtime.

Buying a stock means buying a small ownership interest in a real company. The
goal is not merely to find a company whose stock price is rising. The goal is to
answer two separate questions:

- Is this a strong business?
- Is the current stock price reasonable for that business?

A wonderful company can be a poor investment when purchased at an excessive
price. A mediocre company can sometimes produce a good return when purchased
cheaply — but that is usually the harder game for a beginner.

## The three financial statements

Before examining ratios, understand where the numbers originate.

| Statement | What it tells you | Household analogy |
|---|---|---|
| Income statement | Sales, expenses and profits over a period | Your annual income and spending |
| Balance sheet | Assets, debts and shareholder equity at one moment | Your net-worth statement |
| Cash-flow statement | Actual cash entering and leaving the business | Your bank-account activity |
| Shareholders' equity statement | Changes in ownership value and share issuance | Changes in the owners' stake |

The SEC emphasizes that no single financial statement tells the complete story.
Profit is not necessarily the same as cash, and a profitable company can still
experience financial trouble if it cannot meet its obligations.

## 1. Business size and stock structure

**Market capitalization** — `Share price × shares outstanding`. A company with
100 million shares trading at $20 has a market cap of $2 billion. It tells you
the market value of the company's equity, not whether the stock is cheap or the
company financially strong. Categories: mega/large-cap, mid-cap, small-cap,
micro-cap. Smaller companies may have more room to grow but often less financial
stability, lower trading volume and greater price volatility.

**Enterprise value (EV)** — `Market cap + debt − cash`. Estimates the value of
the entire operating business, including its debt. Like buying a $500,000 house
that has a $300,000 mortgage and $50,000 in a safe — you must consider the
mortgage and the cash, not merely the selling price. Useful when comparing
companies with different amounts of debt and cash.

**Diluted shares outstanding** — approximate shares that would exist after stock
options, restricted stock and convertibles. Watch the trend: a declining count
may mean buybacks; a rising count means existing owners are being diluted. Heavy
stock-based compensation can cause dilution even alongside announced buybacks. A
company can grow total profit while producing little growth *per shareholder* if
it continually issues new shares.

## 2. Revenue and business growth

**Revenue** (the "top line") is money from selling products/services before
expenses. Look at quarterly, annual, growth, by-segment, by-country, and
concentration among major customers.

**Revenue growth rate** — `(current − previous) ÷ previous`. $100M → $110M is
10%. Examine quarter-over-quarter, year-over-year, 3–5yr CAGR, and organic
growth excluding acquisitions and currency. Year-over-year is usually more
informative than consecutive quarters because many businesses are seasonal.

**Recurring revenue** (subscriptions, contracts, memberships, repeat usage) is
generally more predictable. For a subscription company examine ARR, MRR, renewal
rate, retention, churn, net revenue retention.

**Backlog and bookings** — backlog is contracted business not yet recognized as
revenue; bookings are new business signed in the period. Provide visibility into
future revenue, but backlog is not guaranteed — customers may delay, modify or
cancel.

**Customer concentration** — a company earning 40% of revenue from one customer
is more vulnerable than one with thousands. Losing that customer could
materially damage the business.

## 3. Profitability

- **Gross profit** — `Revenue − direct cost of product/service`. $100 sale that
  cost $60 = $40 gross profit.
- **Gross margin** — `Gross profit ÷ revenue` = 40% above. What remains after
  direct cost, to pay salaries, marketing, research, rent, interest, taxes. Look
  for stable/increasing margins; a fall can mean price competition, rising input
  costs, discounting, or unfavorable mix.
- **Operating income** — profit from normal operations before interest and taxes.
- **Operating margin** — `Operating income ÷ revenue`. $20M on $100M = 20%.
  Shows how efficiently the core business operates.
- **Net income** — the bottom line, after operating costs, interest, taxes, other.
- **Net profit margin** — `Net income ÷ revenue`. $10M on $100M = 10%. Compare
  to the company's own history, competitors, and industry norms (a supermarket
  and a software company should not have similar margins).
- **Earnings per share (EPS)** — `Net income to common ÷ diluted shares`. Focus
  on *diluted* EPS. Check 3–5yr growth, whether it comes from real profit growth
  vs. buybacks, and whether earnings contain one-time gains. FINRA describes EPS
  as a way to compare results across companies of different sizes.
- **EBITDA** — earnings before interest, taxes, depreciation and amortization.
  Helps compare operating performance before financing/tax/accounting
  differences. **But EBITDA is not cash flow** — it excludes capex, debt
  repayments, working-capital needs. One lens, not gospel.

## 4. Cash-flow metrics

- **Operating cash flow (OCF)** — cash from regular operations. OCF consistently
  above net income can be encouraging; net income consistently above OCF
  deserves investigation (receivables, inventory, deferred revenue, adjustments).
- **Capital expenditures (CapEx)** — investment in long-term assets (buildings,
  equipment, data centers). Some businesses need little; others reinvest billions
  to stay competitive.
- **Free cash flow (FCF)** — `OCF − CapEx`. Cash left after operations and major
  capital investment. Uses: repay debt, buybacks, dividends, acquisitions,
  reinvest, accumulate cash.
- **FCF margin** — `FCF ÷ revenue`. **FCF per share** — `FCF ÷ diluted shares`
  (more informative when the company issues new shares).
- **Cash conversion** — compare FCF with net income. Over time you want
  accounting profit to turn into cash; large profits that continually consume
  cash deserve scrutiny.

## 5. Financial strength and debt

- **Cash & equivalents** — flexibility in downturns; excessive idle cash can
  lower returns.
- **Total debt** — short-term, long-term, leases, interest rates, fixed vs.
  variable, maturity dates, covenants. The maturity schedule matters: a company
  may look healthy today but face refinancing problems when large debt comes due.
- **Net debt** — `Total debt − cash`. $2B debt, $3B cash = negative net debt.
- **Debt-to-equity** — `Total liabilities or debt ÷ shareholders' equity`
  (definitions vary by provider — verify what's included). Higher = more
  leverage; magnifies damage when profits decline. Compare within industry.
- **Net debt to EBITDA** — `Net debt ÷ EBITDA`. Lower is generally safer, but
  acceptable levels vary — utilities, telecom, REITs carry more than software.
- **Interest-coverage ratio** — `EBIT ÷ interest expense`. Coverage of 5 = five
  times annual interest. A declining ratio signals financial pressure.
- **Current ratio** — `Current assets ÷ current liabilities`. Below 1 may
  deserve investigation but isn't automatically disastrous.
- **Quick ratio** — `(Cash + marketable securities + receivables) ÷ current
  liabilities`. More conservative — excludes inventory.
- **Working capital** — `Current assets − current liabilities`. Negative may
  indicate stress — or an efficient model where customers pay before suppliers.

## 6. Efficiency and management quality

- **Return on equity (ROE)** — `Net income ÷ average shareholders' equity`. Debt
  and buybacks can inflate it by shrinking equity — always read ROE alongside
  debt.
- **Return on assets (ROA)** — `Net income ÷ average total assets`. Useful for
  asset-heavy businesses and financials.
- **Return on invested capital (ROIC)** — `After-tax operating profit ÷ invested
  operating capital`. How well management turns invested money into operating
  profit. High reinvestment at attractive returns can compound value for years.
- **Asset turnover** — `Revenue ÷ average assets`. Low-margin retailers may
  compensate with high turnover; luxury/software lower turnover, higher margins.
- **Inventory turnover** — `COGS ÷ average inventory`. Higher = selling faster.
  Watch inventory growing faster than revenue, discounting, obsolescence.
- **Receivables growth** — a warning when receivables grow much faster than
  revenue: customers taking longer to pay, or aggressive sales terms.

## 7. Valuation: what you are paying

Valuation ratios are most useful compared with the company's own history, direct
competitors, expected growth, financial quality, and interest-rate conditions.
The SEC and FINRA caution that desirable ratios vary by industry — a low ratio
is not automatically cheap, a high ratio not automatically expensive.

- **P/E** — `Share price ÷ EPS`. $100 / $5 = 20. **Trailing** uses last 12
  months; **forward** uses estimated next 12 months (forecasts can be wrong).
  High P/E may mean growth, quality, optimism, or overvaluation; low P/E may mean
  undervaluation, slow growth, cyclical peak, or problems. Most useful for
  profitable companies, within the same industry.
- **PEG** — `P/E ÷ expected EPS growth rate`. P/E 30, growth 15% = PEG 2. Relies
  on estimates; not an automatic rule.
- **P/S** — `Market cap ÷ annual revenue`. Useful for not-yet-profitable
  companies. Weakness: revenue is not profit.
- **P/B** — `Market value ÷ book value`. Useful for banks, insurance, real
  estate, asset-heavy firms; less so for software/IP/brand/network businesses.
- **EV/EBITDA** — `Enterprise value ÷ EBITDA`. Accounts for debt and cash;
  helpful across different capital structures. Weakness: EBITDA excludes capex.
- **P/FCF** — `Market cap ÷ annual FCF`. Useful when net income is distorted by
  large non-cash charges.
- **FCF yield** — `FCF ÷ market cap` (inverse of P/FCF). $500M FCF on $10B cap =
  5%. Higher may mean cheaper — only when the cash flow is sustainable.
- **Earnings yield** — `EPS ÷ price` (inverse of P/E). P/E 20 = 5%.

## 8. Dividend metrics

- **Dividend yield** — `Annual dividend per share ÷ price`. $2 on $50 = 4%. A
  high yield can signal an expected cut.
- **Earnings payout ratio** — `Dividends ÷ net income`.
- **FCF payout ratio** — `Dividends ÷ FCF`. Better view of affordability —
  dividends are paid with cash.
- **Dividend growth** — 5/10yr growth, increase history, cuts/suspensions,
  coverage by earnings and FCF, debt used to support dividends. A sustainable 3%
  that grows may beat an unstable 9%.

## 9. Stock-price and trading metrics

Describe how the stock *trades*, not how the business performs.

- **Beta** — volatility vs. the market (≈1 similar, >1 more, <1 less). Based on
  past prices; misses many business risks.
- **Trading volume** — shares traded; higher = easier to buy/sell without moving
  price. Spikes accompany news/earnings/sentiment.
- **Bid-ask spread** — bid = buyers offer, ask = sellers request. Wide spreads
  raise trading costs, especially for thinly traded names.
- **52-week high/low** — context, not intrinsic value. 50% below the high isn't
  necessarily cheap.
- **Moving averages** (50-day, 200-day) — smooth price; timing/sentiment tools,
  not value.
- **RSI** — momentum 0–100; >70 sometimes "overbought", <30 "oversold", but can
  persist. Not a substitute for fundamentals.
- **Short interest** — shares sold short; high = skepticism, and squeeze
  potential on good news.

## 10. Expectations and earnings reports

Prices react to results *versus expectations*. Monitor revenue vs. estimates,
EPS vs. estimates, guidance and its changes, analyst revisions, margin guidance,
future capex, management's demand commentary. A company can post record profits
and fall if investors expected more.

**Earnings quality** — ask whether profit came from normal operations vs. asset
sales, tax benefits, accounting changes, cost cuts, buybacks, temporary price
increases, or unsustainable demand. Recurring operating profit beats one-time
gains.

## 11. Qualitative factors numbers can't capture

**Business model** — explain in plain English what the company sells, who buys,
why they choose it, how it makes money, why competitors can't easily take its
customers. FINRA recommends starting with how the company makes money, demand,
management, debt, growth prospects, industry risks.

**Competitive advantage** — brand, patents, network effects, switching costs,
cost advantage, exclusive distribution, regulation/licensing, valuable data,
scale. Valuable only if it shows up as retention, margins, or returns on capital.

**Management** — experience, capital-allocation record, guidance accuracy,
insider ownership, compensation, related-party transactions, acquisition
history, treatment of shareholders. Watch management that blames external forces
while awarding itself generous pay.

**Industry structure** — growing/shrinking, competitive, regulated, cyclical,
disruption-prone, commodity-dependent, rate-sensitive.

**Economic moat** — ability to defend profits. A real moat eventually appears in
the numbers via pricing power, stable margins, retention, and returns on capital.

## 12. Industry-specific metrics

| Industry | Important additional metrics |
|---|---|
| Banks | Net interest margin, loan/deposit growth, efficiency ratio, charge-offs, nonperforming loans, capital ratios |
| Insurance | Combined ratio, premiums written, loss ratio, investment income, book value |
| Software/SaaS | ARR, recurring-revenue growth, churn, net revenue retention, gross margin, CAC, FCF margin |
| Retail | Same-store sales, inventory turnover, sales per location, online growth, gross margin |
| Restaurants | Comparable-store sales, restaurant-level margin, traffic, average ticket, new-unit economics |
| REITs | FFO, adjusted FFO, occupancy, rent growth, debt maturities |
| Semiconductors | Gross margin, inventory, utilization, customer concentration, capex |
| Energy | Production, reserves, realized prices, production costs, break-even, FCF |
| Manufacturing | Backlog, book-to-bill, capacity utilization, input costs, operating margin |
| Biotech | Cash runway, clinical-trial stage, regulatory milestones, pipeline concentration, dilution risk |
| Telecom | Subscriber growth, churn, ARPU, capex, net debt |
| Media platforms | Users, engagement, ad revenue per user, subscriber growth, churn |

Don't compare a bank with software metrics — that's financial
apples-versus-toasters.

## 13. Major warning signs

- Revenue rising while operating cash flow falls
- Receivables or inventory growing much faster than sales
- Continual issuance of new shares
- Large, recurring "one-time" adjustments
- Heavy debt with declining interest coverage
- Frequent auditor or CFO changes
- Management repeatedly missing guidance
- Customer concentration
- Falling gross margins without a convincing explanation
- Acquisitions hiding weak organic growth
- Buybacks funded with debt
- Dividends not covered by FCF
- Executive comp rising while shareholder results deteriorate
- Promotional language unsupported by results
- Large related-party transactions
- Material weaknesses in internal controls

Read the footnotes — accounting methods, stock comp, legal disputes, taxes,
pensions and other obligations often appear there, not in the headline results.

## The beginner's 15-metric checklist

| Question | Metric to examine |
|---|---|
| Is the company growing? | Revenue growth |
| Is growth reaching shareholders? | Diluted EPS growth |
| Is it profitable? | Operating and net margins |
| Are margins improving? | Five-year margin trend |
| Does profit become cash? | Operating cash flow vs. net income |
| Does it produce excess cash? | Free cash flow |
| Is the balance sheet safe? | Cash, total debt, net debt |
| Can it pay interest? | Interest coverage |
| Is management efficient? | ROE and ROIC |
| Are owners being diluted? | Diluted share-count trend |
| What am I paying for earnings? | P/E |
| What am I paying for cash flow? | P/FCF and FCF yield |
| How does valuation compare? | Historical and peer valuation |
| Can the dividend be maintained? | FCF payout ratio |
| What could go seriously wrong? | 10-K risk factors |

## A simple evaluation process

1. **Understand the company** — explain how it makes money in 2–3 sentences.
2. **Review five years of results** — direction of revenue, operating margin,
   EPS, FCF, debt, share count. One quarter is noise; a multi-year trend is
   harder to disguise.
3. **Compare with competitors** — at least three similar businesses.
4. **Read the annual filing** — 10-K: Business, Risk Factors, MD&A, Financial
   Statements, Footnotes. The SEC identifies these as central.
5. **Separate quality from valuation** — give two grades: *business* (growth,
   profitability, balance sheet, competitive position, management) and *price*
   (P/E, EV/EBITDA, P/FCF, FCF yield, vs. history).
6. **Write down the risks before buying** — record what would prove the thesis
   wrong, to prevent inventing excuses after the price falls.
7. **Consider portfolio fit** — even a strong stock can create excessive
   concentration; weigh objectives, horizon, risk tolerance, diversification.

## The most important rule

**Never make a decision from one number.** A low P/E can be a bargain or a
deteriorating company. High revenue growth can be impressive or unprofitable. A
large dividend can be income or a warning of a cut. No metric guarantees a
return — stocks are affected by performance, valuation, sentiment, interest
rates and unpredictable future events.

---

### Sources referenced throughout

- U.S. Securities and Exchange Commission — *Beginner's Guide to Financial
  Statements*, and Investor.gov research guidance.
- FINRA — guidance on EPS and on researching a company before investing.
