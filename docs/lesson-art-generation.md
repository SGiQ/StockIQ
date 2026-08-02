# Lesson art — generation brief (scene → paper-craft)

**Goal:** replace the 45 animated `scene` cards with paper-craft illustrations
in the exact style of the existing hero art (e.g. `ownership.jpg`,
`revenue-vs-earnings.jpg`), so every card in a lesson reads as one family.

**Charts are deliberately NOT in this list.** The 59 chart cards teach with
real data — the 23 in *Reading a Chart* especially (a paper picture of a
candlestick can't teach candlestick reading). Keep them as charts. If you
still want specific charts converted, say which and I'll add them.

You generate the images; I wire them in. One image per row below.

---

## Style Block — paste this before every prompt

> Handcrafted layered paper-craft diorama, built as a real 3D model from
> textured matte cardstock, kraft paper, and felt-like paper, then
> photographed as a physical object with soft warm studio lighting from the
> upper left and gentle realistic drop shadows between the layers. Deep navy
> textured-paper background with a couple of torn deckled-paper edges peeling
> at the corners. Muted, slightly desaturated earthy palette only: forest and
> teal green, mustard-ochre yellow, terracotta rust, warm kraft tan and brown,
> slate blue-green, cream. Visible paper grain and fiber on every surface;
> clean craft-knife cut edges. Any people are flat faceless cut-paper
> silhouettes in the palette colors. One clear central metaphor, centered,
> with generous negative space; editorial, calm, premium, symbolic — not a
> chart, not a diagram. Absolutely NO text, letters, numbers, or digits
> anywhere in the image.

**Then append the row's subject.** Example:
`…NO text, letters, numbers, or digits anywhere in the image. Subject: A live order book with stacked bids on one side and asks on the other.`

## Specs
- **Aspect / size:** 4:3 landscape, 1200×900 (matches the in-card art panel; it
  cover-crops, so keep the subject centered and away from edges).
- **Format:** JPEG, quality ~85 (the existing heroes are ~150–350 KB each).
- **Filename:** exactly the `Image file` in the table — lowercase, hyphenated —
  saved into `public/lesson-art/`.
- **Numbers:** where a subject mentions figures, show the *relationship*
  (bigger vs smaller stacks, more vs fewer pieces) — never printed numerals.

---

## Images to generate (45)

### Market Foundations

| Image file | Prompt subject (append to the Style Block) |
|---|---|
| `two-sided-market.jpg` | Bid and ask quote cards separated by the live spread. |
| `spread-toll.jpg` | A round trip crossing from the ask to the bid and paying the spread as a toll. |
| `liquidity-depth.jpg` | A deep market with many orders compared with a thin market with few orders. |
| `matching-engine.jpg` | Buyers and sellers flowing into an exchange matching engine. |
| `broker-agent.jpg` | An investor connected to the market through a broker acting as agent. |
| `order-book.jpg` | A live order book with stacked bids on one side and asks on the other. |
| `weighting-tower.jpg` | An index weighting tower where the largest companies occupy the widest tier. |
| `price-weighted.jpg` | A high-priced share receiving more index weight than a lower-priced share. |
| `benchmark-race.jpg` | An investment result racing against a benchmark over the same period. |
| `market-cap-equation.jpg` | Share price multiplied by shares outstanding equals market capitalization. |
| `price-vs-value.jpg` | A low-looking share price contrasted with the value of the whole business. |
| `size-spectrum.jpg` | Small-, mid-, and large-cap company bands arranged as an increasing size spectrum. |
| `execution-tradeoff.jpg` | A limit order favoring price control while accepting the risk of no fill. |
| `stop-trigger.jpg` | A falling price crossing a stop trigger and turning into a market order. |
| `price-change.jpg` | A previous close of ninety-six dollars compared with a last price of one hundred dollars. *(show the relationship with sizes/stacks — no printed numbers)* |
| `event-gap.jpg` | A price chart jumping across an overnight news gap between sessions. |
| `owner-outcomes.jpg` | Three owner outcomes: business growth, cash dividends, or loss. *(show the relationship with sizes/stacks — no printed numbers)* |
| `supply-demand.jpg` | Supply and demand curves crossing at the market price. |
| `expectations-gap.jpg` | A reported result compared with the market expectation, with the difference marked as surprise. |
| `ipo-launch.jpg` | A private company passing through an IPO and becoming publicly owned. |
| `primary-secondary.jpg` | Money reaching the company in the primary sale, then shares trading in the market. |

### Reading a Business

| Image file | Prompt subject (append to the Style Block) |
|---|---|
| `cash-vs-profit.jpg` | Accounting profit and cash shown as two different measures rather than the same thing. |
| `accrual-timing.jpg` | An invoice recorded now with a dotted timeline leading to cash arriving later. |
| `noncash-charge.jpg` | A long-lived asset gradually becoming an accounting expense without a new cash payment. |
| `free-cash-flow.jpg` | Cash coming into a business minus capital spending leaves free cash flow. |
| `dividend-per-share.jpg` | A company cash stack divided into equal cash payments for each share. |
| `payout-pressure.jpg` | A high payout gauge beside a small remaining cash cushion. |
| `buyback-slices.jpg` | Four ownership slices become three after a buyback, making each remaining slice larger. *(show the relationship with sizes/stacks — no printed numbers)* |
| `yield-trap.jpg` | A high dividend yield sits above a funnel created by a falling share price. |
| `competition-cycle.jpg` | High profits attract a growing group of competitors into the market. |
| `moat-defense.jpg` | A profitable business is protected by a deep structural barrier that rivals struggle to cross. |
| `customer-moat.jpg` | Customers remain inside a strong business barrier because switching away is costly. |
| `moat-erosion.jpg` | A once-wide competitive barrier narrows and develops a break as its protection erodes. |
| `gross-margin.jpg` | A revenue bar steps down after product costs to show the gross margin retained. |
| `operating-margin.jpg` | Revenue steps down through product costs and operating expenses to the amount retained. |
| `revenue-profit-diverge.jpg` | Revenue rises while profit falls, showing that record sales can hide a losing business. |
| `coffee-register.jpg` | A coffee shop register records one hundred million dollars of sales before any business costs are paid. *(show the relationship with sizes/stacks — no printed numbers)* |
| `coffee-profit-journey.jpg` | A coffee sale moves through four illustrated checkpoints, shrinking from one hundred million dollars of revenue to three million dollars of net income. *(show the relationship with sizes/stacks — no printed numbers)* |
| `coffee-gross-profit.jpg` | A coffee receipt subtracts beans, milk, and cups from sales, leaving thirty-eight million dollars of gross profit. *(show the relationship with sizes/stacks — no printed numbers)* |
| `coffee-operating-costs.jpg` | Staff, rent, and marketing bills come out of gross profit and leave eight million dollars of operating income. *(show the relationship with sizes/stacks — no printed numbers)* |
| `coffee-expansion-risk.jpg` | New coffee shops increase sales while rent, staffing, and interest costs push earnings below zero. |
| `income-waterfall.jpg` | A large revenue column steps down through costs to the smaller earnings the business retains. |
| `pe-equation.jpg` | A sixty dollar share price divided by three dollars of earnings per share equals a P/E of twenty. *(show the relationship with sizes/stacks — no printed numbers)* |
| `pe-payback.jpg` | A row of years represents how many years of current earnings are embedded in the share price. |
| `value-trap.jpg` | A low valuation follows declining earnings into a value trap marked cheap for a reason. |

---

## Workflow (once you've generated some or all)

1. Drop the `.jpg` files into `public/lesson-art/`.
2. `npm run art:apply-scenes` — converts every scene whose image now exists to
   an illustration (safe to run repeatedly; it lists what's still missing).
3. `npm run gen:content` — validates. The validator now fails loudly if any
   card points at a missing `lesson-art` file, so a typo can't ship blank.
4. I verify the cards render in the app and deploy.

You can do this in batches — generate ten, run the two commands, see them land,
repeat. Nothing breaks while images are still missing; those cards keep their
current animated scene until their image arrives.
