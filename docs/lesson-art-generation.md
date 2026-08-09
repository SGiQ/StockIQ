# Lesson art — generation brief (flat editorial vector)

**Goal:** give every *interior* teaching image in the courses one distinctive
**flat 2D editorial vector** style — replacing both the old "generic" inline art
and the animated `scene` cards. The **per-lesson hero images stay paper-craft**
(the keep-list below) and act as the anchor at the top of each lesson.

**Why flat:** a review found flat 2D easier to read and learn from than the 3D
paper-craft cards. Flat interiors and the paper-craft heroes still read as one
family because **both sit on the same deep-navy background**.

**Charts are still NOT in this list.** The data-driven chart cards teach with
real numbers (a picture of a candlestick can't teach candlestick reading). Keep
them as charts.

You generate the images; I wire them in. One image per row in the tables below.

---

## Style Block — paste this before every prompt

> Flat 2D editorial vector illustration, clean and modern. Built from bold solid
> geometric shapes with crisp edges and even flat fills; no outlines except one
> consistent thin accent line where it aids reading; at most one slightly darker
> tone within a shape for minimal depth. Deep navy flat background — no texture,
> no paper, no 3D, no photography, no background gradients or drop shadows. Muted,
> slightly desaturated earthy palette only: forest green, mint green,
> mustard-ochre yellow, terracotta rust, warm tan, slate blue, cream. Any people
> are simple flat faceless geometric figures (rounded head, simple body) in the
> palette colours. One clear central metaphor, centred, with generous negative
> space; editorial, calm, premium, symbolic, instantly readable as a teaching
> illustration — not a chart, not a diagram, not a photo. Absolutely NO text,
> letters, numbers, or digits anywhere in the image.

**Then append the row's subject.**

## What makes a subject read

- **Real objects and figures, never "a measure" or "a value."** A scale, a
  castle, a coin stack, a funnel, a gate — something concrete.
- **Colour-code the two sides.** Buyer / more / kept / up = **forest green**;
  seller / less / lost / risk / down = **terracotta rust**. Consistent across all
  cards. Use **slate/teal blue** for water so it never blends into the navy
  background.
- **Show the relationship physically** — taller vs shorter, a gap between, a path
  from one to another — not just two things next to each other.
- **No numbers or letters**; show more-vs-less by size, count, or height.

## Specs
- **Aspect / size:** 4:3 landscape, ~1200×900. It cover-crops slightly on the
  short side, so keep the subject centred and clear of the edges.
- **Filename:** exactly the `Image file` in the table — lowercase, hyphenated —
  saved into `public/lesson-art/`. For the restyle rows this **overwrites** the
  existing paper-craft file (same slug); for the scene rows it is a **new** file.
- **File size:** don't worry about it — `npm run art:optimize` shrinks the big
  ~3 MB exports before they ship.

## Keep as paper-craft — DO NOT regenerate

These 37 per-lesson hero images (mapped in `src/content/lessonArtwork.ts`) stay
in the existing paper-craft style. Leave their files untouched:

- **Market Foundations:** `bid-ask-paper`, `exchanges-and-brokers`,
  `indices-and-benchmarks`, `market-cap-paper`, `order-types-paper`,
  `reading-a-quote`, `ownership`, `what-moves-a-price`, `why-companies-sell-shares`
- **Reading a Business:** `cash-flow-is-king`, `dividends-and-buybacks`,
  `economic-moats`, `margins-that-matter`, `revenue-vs-earnings`,
  `the-price-earnings-ratio`
- **Reading a Chart:** `anatomy-of-a-candle`, `momentum-indicators`,
  `moving-averages`, `patterns-and-their-limits`, `price-and-time`,
  `support-and-resistance`, `trend-and-structure`, `volume-confirms`
- **Risk and Position Sizing:** `diversification-and-correlation`,
  `drawdown-and-recovery`, `position-sizing`, `risk-of-ruin`, `stop-losses`,
  `thinking-in-r`, `why-losses-hurt-more`
- **Trading Psychology:** `confirmation-bias`, `fear-of-missing-out`,
  `loss-aversion`, `patience-and-inaction`, `process-vs-outcome`,
  `revenge-trading`, `the-trading-journal`

> Note: three restyle slugs keep a now-misleading `-paper` suffix
> (`owner-vs-lender-paper`, `ownership-breakdown-paper`, `shares-ledger-paper`).
> They are interior images and **do** get the flat treatment — the suffix is just
> a filename we kept to avoid content edits.

---

## Market Foundations — restyle existing interiors (17)

*Overwrite the existing file at the same slug.*

| Image file | Prompt subject (append to the Style Block) |
|---|---|
| `bid-ask.jpg` | A green buyer figure and a rust seller figure on two facing platforms, each reaching toward the other across a short narrow bridge that marks the small gap between their prices. |
| `broker-agent.jpg` | A green investor figure on the left linked by one clean connecting line through a central broker icon to a large market building on the right — the broker standing between investor and market as agent. |
| `founder-liquidity.jpg` | A green founder figure keeping a cluster of ownership tiles while handing a few tiles outward to a small group of new investors, still tethered by a line to the company building. |
| `index-basket.png` | Many small company buildings of different sizes arranged inside one large woven basket weighted by size, with a green runner figure jogging along a track beside it. |
| `ipo.jpg` | Streams of green coins flowing from a crowd of small investor figures into a workshop building, where they turn into equipment, workers, and a new extension. |
| `liquidity-depth.jpg` | Two stacks side by side — a tall dense green stack of many order tiles (a deep market) next to a short sparse stack of only a few tiles (a thin market). |
| `market-cap.jpg` | A small building with a tall narrow price banner beside a much wider, larger building made of a grid of many small ownership windows — a few expensive shares versus many-owned size. |
| `matching-engine.jpg` | Green buy tiles flowing in from the left and rust sell tiles from the right into a central geared engine that pairs them together. |
| `order-route.jpg` | A green investor figure handing an order ticket to a broker, with an arrow routing the ticket into a busy exchange-hall building. |
| `order-types.jpg` | One path splitting into two — a fast open lane running straight past shifting price markers, and a controlled gate that stays shut until a set price is met. |
| `owner-vs-lender-paper.jpg` | On the left a green owner figure holding a share with two branching paths (a rising upside and a falling downside); on the right a rust lender figure holding a fixed note with a single straight flat repayment path. |
| `ownership-breakdown-paper.jpg` | Three differently coloured ownership groups each holding an interlocking wedge that assembles into one complete circular ownership wheel. |
| `price-surprise.jpg` | A crowd of audience figures facing a stage; a faint imagined result floats above while a brighter, clearly different actual result stands revealed on the stage. |
| `quote-page.jpg` | A green investor figure studying one company through several stacked translucent layers — a price-history ribbon, a business-context panel, and a strip of volume bars. |
| `shares-ledger-paper.jpg` | Equal ownership tiles moving from a company building into the matching slots of a tall shareholder ledger board. |
| `spread-toll.jpg` | A small round token making a round-trip loop from a rust ask marker across to a green bid marker and back, dropping a coin at a central tollgate on the way. |
| `two-sided-market.jpg` | A green bid quote card and a rust ask quote card facing each other, separated by a slim bright cream gap that marks the live spread. |

## Market Foundations — convert animated scenes (16)

*New file at the scene name.*

| Image file | Prompt subject (append to the Style Block) |
|---|---|
| `order-book.jpg` | A central ledger board with two rising columns of stacked tiles — a green buy column on the left, a rust sell column on the right — tallest where the two sides nearly meet in the middle. |
| `weighting-tower.jpg` | A tiered tower of blocks: a few very wide green and ochre blocks at the base narrowing to many small blocks at the top — the biggest companies taking the widest tiers. |
| `price-weighted.jpg` | A balance scale tipping toward a single tall narrow green share block that outweighs several shorter, broader rust blocks on the other pan — height winning over true size. |
| `benchmark-race.jpg` | Two flat runner figures on parallel lanes — a green runner just ahead of an ochre pace-setter — striding toward a cream finish ribbon. |
| `market-cap-equation.jpg` | A tall price banner on the left and a wide fan of many small ownership tiles on the right, joined by a multiplication cross, combining into one large company block. |
| `price-vs-value.jpg` | A small modest price tag in the foreground and, rising behind it, a much larger company building many times its size — a tiny sticker price hiding a bigger business. |
| `size-spectrum.jpg` | Three company buildings in a row on stepped platforms, each clearly larger than the last — a small green shopfront, a mid rust building, a tall ochre tower. |
| `execution-tradeoff.jpg` | Two gates side by side — a green gate held shut on a chain (price control, may not open) and an open ochre gate a figure walks straight through (a guaranteed crossing). |
| `stop-trigger.jpg` | A descending staircase of price steps with a small round marble rolling down; at one marked step a tripwire lever flips, dropping the marble down a chute — a falling price hitting its stop. |
| `price-change.jpg` | Two price markers on a wall — one lower and faded (yesterday's close), one higher and bright green (today's price) — with a small up-arrow stepping between them. |
| `event-gap.jpg` | A rising price ribbon that suddenly breaks and leaps upward across a dark gap to continue higher, a small folded news banner sitting in the gap. |
| `owner-outcomes.jpg` | One central ownership tile splitting along three paths to three outcomes — a growing green plant, a small stack of ochre coins, and a faded torn rust tile (growth, income, or loss). |
| `supply-demand.jpg` | Two ribbons crossing in a large X on a board — a green ribbon sloping down and a rust ribbon sloping up — with a small cream marker pinned where they meet. |
| `expectations-gap.jpg` | Two bars side by side — a shorter ochre "expected" bar and a taller green "reported" bar — with a slim cream bracket marking the extra height between them. |
| `ipo-launch.jpg` | A company building lifting off a launch pad like a rocket, scattering many small ownership tiles down to a crowd of flat investor figures below. |
| `primary-secondary.jpg` | Two linked scenes joined by an arrow — on the left, coins flowing into a company building (the first sale); on the right, ownership tiles passing hand to hand between investor figures (later trading). |

## Reading a Business — convert animated scenes (24)

*New file at the scene name.*

| Image file | Prompt subject (append to the Style Block) |
|---|---|
| `cash-vs-profit.jpg` | Two containers side by side — a green ledger book fat with paper slips (accounting profit) and a rust jar holding actual coins (real cash) — clearly two different things. |
| `accrual-timing.jpg` | An invoice slip pinned at the near end of a dotted timeline, with a small stack of coins arriving much later at the far end — the sale booked now, the cash landing later. |
| `noncash-charge.jpg` | A sturdy machine slowly shedding thin layers into an "expense" tray beside it, while a nearby coin purse stays firmly shut — value wearing down with no cash leaving. |
| `free-cash-flow.jpg` | A wide stream of coins flowing into a business; part diverts into a "building and equipment" side channel, and the smaller remaining stream pools as free cash in a tray at the end. |
| `dividend-per-share.jpg` | A central cash stack splitting along channels into several equal small coin piles, each resting on an identical ownership tile — the payout shared equally per share. |
| `payout-pressure.jpg` | One large coin almost entirely fed out through a slot to waiting figures, leaving only a thin sliver of coins behind as a cushion — paying out nearly everything earned. |
| `buyback-slices.jpg` | A pie in four equal slices on the left; the same pie as three larger slices on the right, with one slice being drawn back into a company building — fewer shares, each worth more. |
| `yield-trap.jpg` | A tempting oversized coin hovering above a downward funnel of falling price layers, a small figure leaning toward the coin at the funnel's rim — a high yield luring over a sinking price. |
| `competition-cycle.jpg` | A bright money-tree on a green hill drawing a growing crowd of rust competitor figures streaming toward it from every side — high profits pulling in rivals. |
| `moat-defense.jpg` | A castle on a green island ringed by a wide teal-blue water moat; small rust competitor figures stall at the far bank, unable to cross — a durable business barrier. |
| `customer-moat.jpg` | Flat customer figures gathered comfortably inside a walled courtyard around a business, while a single figure at the gate hesitates before a steep step down to leave — high switching cost keeping them in. |
| `moat-erosion.jpg` | A castle wall tall and thick on the left but visibly crumbling, thinning, and broken open on the right, a rust competitor figure stepping through the gap — an advantage eroding. |
| `gross-margin.jpg` | A tall green revenue column with one chunk lifted away and set aside as "product costs," leaving a shorter retained column standing beside it — the gross margin kept. |
| `operating-margin.jpg` | A tall revenue column stepping down like descending stairs — one block removed for product costs, another for operating expenses — leaving a short final block. |
| `revenue-profit-diverge.jpg` | Two ribbons on a board heading opposite ways — a green "sales" ribbon climbing up while a rust "profit" ribbon slides down beneath it — rising revenue over falling profit. |
| `coffee-register.jpg` | A coffee-shop counter under a striped awning with a big overflowing till drawer of coins — a full day's sales taken in, before any costs are paid. |
| `coffee-profit-journey.jpg` | A single large coin travelling along a winding path past four toll gates, trimmed smaller at each gate, arriving as a tiny coin at the end — revenue shrinking to net income. |
| `coffee-gross-profit.jpg` | A coffee-shop pile of coins with three small items lifted out and set aside — a coffee bean, a milk carton, a paper cup — leaving a smaller retained pile of coins. |
| `coffee-operating-costs.jpg` | A coin pile with three small cut-out symbols pulled from it — a little apron for staff, a small house for rent, a tiny megaphone for marketing — leaving a modest remaining stack. |
| `coffee-expansion-risk.jpg` | A row of new coffee shops growing taller left to right, but beneath them an earnings line sinking and dipping below a marked baseline into a dark trough — growth that loses money. |
| `income-waterfall.jpg` | A waterfall of coins pouring from a tall top ledge, splitting off into side channels at each drop (costs), the final thin stream collecting in a small basin at the bottom (earnings). |
| `pe-equation.jpg` | A tall price banner above a single small earnings coin, joined by a division bar, producing a row of stacked year-tiles beside them — how many years of earnings the price equals. |
| `pe-payback.jpg` | A long receipt unrolling into a row of identical year-tiles stacked one behind the next, a small figure walking along them — the years of earnings baked into today's price. |
| `value-trap.jpg` | A tempting "cheap" price tag at the top of a downward slope, a small figure sliding after it past steps of shrinking earnings blocks into a dark pit below — cheap for a reason. |

## Getting Started — no new images

Its 5 scene cards (`benchmark-race`, `broker-agent`, `execution-tradeoff`,
`index-basket`, `order-route`) all reuse slugs produced above, so they convert
automatically once those files exist. Nothing extra to generate.

---

## Workflow (once you've generated some or all)

1. Drop the files into `public/lesson-art/` (overwrite same slug for restyles;
   new file named `<scene-name>.jpg` for scene conversions).
2. `npm run art:optimize` — shrinks the big exports in place.
3. `npm run art:apply-scenes` — converts every scene whose image now exists to an
   illustration (safe to run repeatedly; it lists what's still missing). Target:
   `still to generate: (none)`.
4. `npm run gen:content` — validates. The validator fails loudly if any card
   points at a missing `lesson-art` file, so a typo can't ship blank.
5. I verify the cards render (paper hero on top, flat interiors below) and push
   the branch — Vercel rebuilds `dist/` from `public/` and native pulls the new
   images from the deployed origin.

You can work in batches — generate ten, run the three commands, see them land,
repeat. Nothing breaks while images are still missing; those cards keep their
current scene until their image arrives.
