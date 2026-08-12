# Content expansion: Crypto, Fixed Income & Alternative Assets

Status: **PLAN — awaiting review before any JSON is generated.**

Goal: broaden StockIQ from an equities-and-options curriculum toward a general
retail-investing app. Crypto and bonds become **core** (part of "ready to
trade"); forex / commodities / real estate ship as an **optional enrichment
course**, explicitly *not* required to be ready to trade.

Every calculation in this doc is worked out and verified in the
[Calculations appendix](#calculations-verified-appendix). Nothing gets written
into a lesson until the arithmetic here is signed off. The bar is the existing
`why-losses-hurt-more` lesson, which already states the loss/recovery asymmetry
exactly (down 10% → +11.1%, down 50% → +100%, down 80% → +400%).

---

## 1. Schema changes

Add three categories to `COURSE_CATEGORIES` in `src/content/schema.ts`
(currently 7 values). This is the only code change; everything else is content.

```
'fundamentals', 'analysis', 'technicals', 'risk', 'psychology',
'strategies', 'getting-started',
'crypto',        // NEW
'fixed-income',  // NEW
'alternatives',  // NEW
```

Nothing else in the schema needs to move. New lessons use the existing card
types, glyphs, and chart specs. No new scene names are added in this pass (see
Art note below).

## 2. Courses at a glance

| Order | Course | Category | Lessons | XP | Tier |
|---|---|---|---|---|---|
| 7 | Crypto Foundations | `crypto` | 6 | 120 | Core |
| 8 | Bonds & Fixed Income | `fixed-income` | 3 | 60 | Core |
| 9 | Alternative Assets | `alternatives` | 3 | 60 | **Optional addon** |

All lessons 20 XP (matches every existing lesson). `totalXp` = lessons × 20.

**Art note:** teaching *scenes* are a fixed enum with no crypto/bond/forex
entries, so these lessons use existing **glyphs** (`coin`, `coins-stack`,
`bank`, `exchange`, `lock`, `key`, `scale`, `percent`, `dollar`, `building`,
`briefcase`, `shield`, `warning`) and **charts** (`line`, `bars`, `candles`,
`compounding`). The one lucky reuse: the `equity-vs-debt` scene already exists
and is used in the bonds intro. Bespoke scenes (a keys/wallet scene, a
price–yield seesaw) are a **follow-up** requiring app SVG code + the art
pipeline — noted where they'd help.

---

## 3. Crypto Foundations (`crypto`, order 7, 6 lessons)

Blurb: *"Digital assets play by different rules. Learn what a token actually is,
who holds the keys, and why none of the business-analysis math applies."*

Unit 1 — WHAT IT IS · Unit 2 — HOLDING IT · Unit 3 — VALUING & SURVIVING IT

### 3.1 `what-is-crypto` — "What a Token Actually Is"
- Ledger, not a company: a shared record everyone can verify, no head office.
- Coin vs token: a coin is native to its chain; a token rides on one.
- The hard part for a stock person: **there are no earnings, no cash flow, no
  P/E.** The entire *Reading a Business* course does not apply. (binary_choice:
  "What's a crypto's P/E?" → "It doesn't have one.")
- Supply is set by code, not a share count a board votes on.
- Art: `coin`, `exchange`, `newspaper` glyphs; a `bars` chart of "issuance
  schedule" is optional.
- No heavy math. One number: fixed vs uncapped supply.

### 3.2 `wallets-and-custody` — "Who Holds the Keys"
- Custody is the concept with no stock analogue. **"Not your keys, not your
  coins."**
- Self-custody (you hold the private key) vs exchange custody (an IOU you can't
  audit).
- Lose the key → lose the coins. No password reset, no broker to call.
- binary_choice: exchange freezes withdrawals — whose coins were they really?
- Art: `key`, `lock`, `bank`, `shield` glyphs. *(Follow-up: a keys scene.)*
- No math — this is a safety/mental-model lesson.

### 3.3 `how-crypto-trades` — "How Crypto Trades"
- 24/7, no close, no circuit breakers (contrast your `order-types` lesson).
- CEX (order book, like a broker) vs DEX (a pool, no counterparty desk).
- Trading pairs: you price a coin *in another coin*, not always in dollars.
- Stablecoins: the dollar on-ramp; a peg is a promise, not a law.
- Art: `exchange`, `two-sided-market`? (that's a scene — use `exchange` +
  `bars` order-book-style chart), `coins-stack`.
- Light math: a pair quote, e.g. reading "0.05 ETH per token."

### 3.4 `crypto-valuation` — "Why Valuation Is Different"  **(math)**
- No cash flows to discount, so price rests on supply + demand + narrative.
- **Market cap = price × circulating supply.** Worked: $2 × 100M = $200M.
- The trap: a low unit price feels "cheap" but a huge supply can mean a large
  cap. Two coins, same $200M cap, prices $2 vs $0.002.
- **Fully-diluted valuation** = price × *max* supply. $2 × 1B = $2B FDV vs
  $200M live cap — a 10× overhang of unreleased coins.
- binary_choice: "Coin A $0.01, Coin B $50 — which is bigger?" → "Can't tell
  without supply."
- Art: `coins-stack`, `percent`, `pie`; `bars` chart comparing cap vs FDV.
- See [Calc C1–C2](#crypto).

### 3.5 `crypto-risk-profile` — "Crypto's Risk Profile"  **(math)**
- Volatility is the point: moves that are a bad *year* for stocks are a *Tuesday*
  here.
- The recovery asymmetry from `why-losses-hurt-more` bites harder: **down 80%
  needs +400%; down 90% needs +900%.**
- Everything from *Risk & Position Sizing* still applies — position sizing is
  asset-agnostic. Cross-link `lesson:risk-and-position-sizing/position-sizing`.
- No leverage-until-you-understand-this framing.
- Art: `chart-down`, `warning`, `shield`; a `line` chart with a deep drawdown.
- See [Calc C3](#crypto).

### 3.6 `staking-yield-and-scams` — "Yield, Staking & Scams"
- Yield is never free: staking pays you for a job (securing the chain) and
  carries lock-ups and slashing risk.
- "Guaranteed high APY" is the oldest tell. If yield has no source, *you* are
  the source.
- Common frauds: fake support, approval-drainers, rug pulls.
- binary_choice: "20% guaranteed monthly" — investment or red flag?
- Art: `warning`, `percent`, `lightbulb`, `cross`.
- Light math: what a *sustainable* staking yield looks like vs a Ponzi curve
  (`compounding` chart, modest rate).

---

## 4. Bonds & Fixed Income (`fixed-income`, order 8, 3 lessons)

Blurb: *"The other half of most portfolios. Learn how a loan becomes a tradable
asset, and why its price moves opposite to its yield."*

This is the **math-trickiest** addition — the price/yield inverse relationship
is where beginners (and content) get it wrong. Handled carefully below.

### 4.1 `what-is-a-bond` — "What a Bond Is"
- A bond is a loan you can trade. You are the lender; the issuer owes you.
- Three numbers: **face (par)**, **coupon** (annual interest), **maturity**.
- Reuse the existing **`equity-vs-debt` scene**: a shareholder owns, a
  bondholder is owed. Different seat, different risk.
- Coupon rate = coupon ÷ face. $50 on $1,000 = **5%**.
- binary_choice: company goes bust — who's paid first, bondholder or
  shareholder? → bondholder.
- See [Calc B1](#bonds).

### 4.2 `price-and-yield` — "Why Price and Yield Move Opposite"  **(math, the key one)**
- The coupon is **fixed in dollars**. Only the price moves.
- If new bonds pay 6% and yours pays 5%, nobody buys yours at par — its **price
  falls** until its *yield* to a buyer matches 6%.
- **Current yield = annual coupon ÷ price.** $50 coupon: at $1,000 → 5%; price
  falls to $800 → **6.25%**; price rises to $1,250 → **4.0%**.
- The seesaw: price up ↔ yield down, always. *(Follow-up: a seesaw scene.)*
- fill_blank: "When rates rise, existing bond prices ___." → fall.
- Art: `scale` (the seesaw), `percent`, `bars` chart of yield at 3 prices.
- See [Calc B2](#bonds). **Note:** examples use the *current-yield*
  approximation and say so; true yield-to-maturity also folds in the return of
  face at maturity. We teach the direction and the intuition, and flag YTM as
  the fuller measure without doing the full YTM solve (out of scope for a
  2-minute card).

### 4.3 `duration-and-rate-risk` — "Duration: How Much Rates Hurt"  **(math)**
- Duration ≈ how many years, roughly, and also **≈ the % price drop for a +1
  percentage-point rate rise**.
- Worked (first-order): duration 7 → rates +1% → price **≈ −7%**; duration 3 →
  **≈ −3%**. Longer bonds swing more.
- This is why "bonds are safe" needs an asterisk: safe from *default* (for good
  issuers) is not safe from *rate moves*.
- Labeled **approximate** (first-order; convexity ignored) — same honesty as the
  charting course's "patterns and their limits."
- binary_choice: rates jump — which fell more, the 2-year or the 20-year? →
  20-year.
- Art: `clock`, `scale`, `bars` chart of price drop by duration.
- See [Calc B3](#bonds).

---

## 5. Alternative Assets (`alternatives`, order 9, 3 lessons) — OPTIONAL ADDON

Blurb: *"Beyond stocks and bonds: currencies, commodities, and property. Useful
to understand — not required to start investing."*

Framed up front as enrichment. Each lesson's job is literacy (how the thing
works and how it's quoted), not a call to trade it. Leverage warnings are loud.

### 5.1 `forex-basics` — "Currencies & Forex"  **(math)**
- You always trade a **pair** — one currency priced in another (EUR/USD).
- A **pip** is the smallest standard move (0.0001 for most pairs).
- Pip value scales with size: standard lot (100k units) → **$10/pip**; mini
  (10k) → $1; micro (1k) → $0.10.
- % move ≠ pips: 1.1000 → 1.1100 is +100 pips but only **+0.91%**
  (0.0100 ÷ 1.1000).
- **Leverage is the real risk.** 50:1 → $2,000 controls $100,000, so a **2%
  move against you = 100% of your margin gone.**
- Art: `exchange`, `scale`, `warning`; `bars` of pip value by lot size.
- See [Calc F1–F3](#forex).

### 5.2 `commodities-basics` — "Commodities & Futures"  **(math)**
- Physical goods: oil, gold, wheat. Two prices: **spot** (now) and **futures**
  (a dated contract).
- Contract sizes are large and standardized: crude oil = **1,000 barrels**
  ($1 move = $1,000); gold = **100 troy oz** ($1 move = $100).
- **Contango vs backwardation:** futures above/below spot; rolling contracts in
  contango quietly bleeds return (why some commodity ETFs lag spot).
- Futures are leveraged: margin is a small % of notional.
- Art: `briefcase`, `calendar`, `bars`; `line` of spot vs futures curve.
- See [Calc M1](#commodities).

### 5.3 `real-estate-and-reits` — "Real Estate & REITs"  **(math)**
- Two ways in: own property directly, or own a **REIT** — a listed company that
  holds property and trades like a stock.
- US REITs must distribute **≥90% of taxable income**, so yields run high but
  growth is slower and it moves with interest rates.
- **Cap rate = net operating income ÷ property value.** $50k NOI on $1M =
  **5%** — the property world's version of an earnings yield.
- REIT dividend yield = annual dividend ÷ price (ties back to your dividend
  lessons).
- binary_choice: rates rise sharply — kind to REITs or unkind? → unkind (higher
  borrowing + yield competition).
- Art: `building`, `bank`, `percent`, `pie`.
- See [Calc R1](#real-estate).

---

## 6. Calculations, verified (appendix)

Each block shows the arithmetic explicitly. These are the exact numbers that go
into cards.

<a id="crypto"></a>
### Crypto
- **C1 — Market cap.** cap = price × circulating supply.
  $2 × 100,000,000 = **$200,000,000**. ✓
  Two coins same $200M cap: $2 × 100M vs $0.002 × 100,000,000,000. Both $200M. ✓
- **C2 — Fully-diluted valuation.** FDV = price × max supply.
  $2 × 1,000,000,000 = **$2,000,000,000**. Overhang = FDV ÷ live cap = 2B/200M =
  **10×**. ✓
- **C3 — Drawdown recovery** (base rule: to recover, gain = loss/(1−loss)):
  - down 80%: 100 → 20, need +80 on 20 = 80/20 = **+400%**. ✓
  - down 90%: 100 → 10, need +90 on 10 = 90/10 = **+900%**. ✓
  - down 50%: 100 → 50, need +50 on 50 = **+100%** (matches existing lesson). ✓

<a id="bonds"></a>
### Bonds
- **B1 — Coupon rate.** coupon ÷ face = $50 ÷ $1,000 = **5.0%**. ✓
- **B2 — Current yield** (= annual coupon ÷ market price):
  - price $1,000 → 50/1000 = **5.00%** ✓
  - price $800 → 50/800 = **6.25%** ✓
  - price $1,250 → 50/1250 = **4.00%** ✓
  - Direction check: price ↓ ⇒ yield ↑, price ↑ ⇒ yield ↓. ✓
  - Caveat carried in-lesson: this is current yield, an approximation of the
    fuller **yield-to-maturity** (which also counts getting face back at
    maturity). We teach direction + intuition, not the YTM root-solve.
- **B3 — Duration (first-order price sensitivity).** %Δprice ≈ −duration × Δyield.
  - duration 7, +1.0 ppt: ≈ −7 × 0.01 = **−7.0%** ✓
  - duration 3, +1.0 ppt: ≈ **−3.0%** ✓
  - Labeled approximate; convexity ignored (fine for a 1-ppt move). ✓

<a id="forex"></a>
### Forex
- **F1 — Pip value by lot** (USD-quoted pair, pip = 0.0001):
  - standard 100,000 × 0.0001 = **$10.00/pip** ✓
  - mini 10,000 × 0.0001 = **$1.00/pip** ✓
  - micro 1,000 × 0.0001 = **$0.10/pip** ✓
- **F2 — Percent vs pips.** 1.1000 → 1.1100 = 0.0100 move.
  0.0100 ÷ 1.1000 = 0.00909 = **0.909% ≈ 0.91%** (100 pips ≠ 1%). ✓
- **F3 — Leverage wipeout.** 50:1 ⇒ margin = notional/50 = 100,000/50 =
  **$2,000**. A 2% adverse move on $100,000 = **$2,000** = 100% of margin. ✓

<a id="commodities"></a>
### Commodities
- **M1 — Contract $ per $1 move.**
  - Crude oil (CME CL) = 1,000 barrels → $1 × 1,000 = **$1,000** ✓
  - Gold (COMEX GC) = 100 troy oz → $1 × 100 = **$100** ✓
  - (Contract sizes are standardized exchange facts, cited in sources.)

<a id="real-estate"></a>
### Real estate / REITs
- **R1 — Cap rate.** NOI ÷ value = $50,000 ÷ $1,000,000 = **5.0%**. ✓
  - REIT payout rule: **≥90% of taxable income** distributed (US tax code) —
    stated as a rule, cited to IRS/SEC, not computed. ✓

---

## 7. Sourcing

Every lesson needs ≥1 authoritative source (schema-enforced). Planned sources,
all first-party / regulator (matches the existing SEC-heavy citations):
- Crypto: SEC Investor.gov crypto pages, CFTC customer advisories.
- Bonds: SEC Investor.gov "Bonds", TreasuryDirect, FINRA bond basics.
- Forex/commodities: CFTC/NFA forex advisories, CME contract specs.
- REITs: SEC Investor.gov REIT bulletin, IRS REIT rules.

No promotional or exchange-marketing sources.

## 8. Build order (after this plan is approved)

1. Schema: add the 3 categories to `COURSE_CATEGORIES`.
2. Write course JSON (3 files) + lesson JSON (12 files).
3. `npm run gen:content` → regenerate `index.generated.ts`.
4. Run `scripts/validate-content.ts` → fix any prose-budget / arity warnings.
5. Regenerate narration + speech (`generate-speech.ts`) — **has API cost**,
   done as a explicit final step, not silently.
6. Verify in the app (Explore grid shows 3 new courses; a math lesson plays and
   the worked numbers render correctly).

## 9. Open choices for you

- **Bonds depth:** 3 lessons as above, or add a 4th (`bond-types` — govt vs
  corporate vs municipal, credit ratings)? 3 is enough to be "ready"; 4 is more
  complete.
- **Crypto lesson 6** (`staking-yield-and-scams`): keep, or split scams into its
  own lesson given how much money beginners lose there?
- **Alt-assets gating:** ship visible-but-optional, or locked behind completing
  the core? You said "not necessary to be ready to trade" — I'd show it as an
  optional track, not a hard lock.
