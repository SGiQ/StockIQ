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

**Then append the row's subject.**

## What makes a subject read (learned from the first batch)

The `two-sided-market` first draft came back as two blank paper stacks — the
words were too abstract, so the model made abstract shapes. The re-draft named
two *figures* (a buyer and a seller) at two podiums with a clear relationship,
and it read instantly. So every subject below is written to be concrete:

- **Real objects and figures, never "a measure" or "a value."** A castle, a
  scale, a coin stack, a funnel — something you could actually build.
- **Colour-code the two sides.** Buyer / more / kept = **forest green**;
  seller / less / lost / risk = **terracotta rust**. Consistent across cards.
- **Show the relationship physically** — taller vs shorter, a gap between, a
  path from one to another — not just two things next to each other.
- **No numbers or letters**; show more-vs-less by size, count, or height.

## Specs
- **Aspect / size:** 4:3 landscape, ~1200×900. It cover-crops slightly on the
  short side, so keep the subject centred and clear of the edges.
- **Filename:** exactly the `Image file` in the table — lowercase, hyphenated —
  saved into `public/lesson-art/`.
- **File size:** don't worry about it — `npm run art:optimize` shrinks the big
  ~3 MB exports to ~250 KB before they ship.

---

## Market Foundations

**Done ✅** — `two-sided-market`, `spread-toll`, `liquidity-depth`,
`matching-engine`, `broker-agent` are generated, wired, and verified on-card.

| Image file | Prompt subject (append to the Style Block) |
|---|---|
| `order-book.jpg` | A tall central paper ledger board with two columns of stacked tiles rising against it — a forest-green column of buy orders on the left, a terracotta column of sell orders on the right — the tiles tallest near the centre where the two sides almost meet. |
| `weighting-tower.jpg` | A tiered wedding-cake tower of cut-paper blocks: a few very wide green and ochre blocks at the base, narrowing to many small blocks at the top — the biggest companies taking the widest tiers of the index. |
| `price-weighted.jpg` | A paper balance scale tipping toward a single tall, narrow green share block that outweighs several shorter, broader rust blocks on the other pan — height winning over true size. |
| `benchmark-race.jpg` | Two flat cut-paper runner figures on parallel lanes of a paper track — a green runner just ahead of an ochre pace-setter — striding toward a cream finish ribbon. |
| `market-cap-equation.jpg` | A tall paper price tag on the left, a wide fan of many small ownership tiles on the right, joined by a cut-paper multiplication cross, combining into one large company block — price times shares making the whole. |
| `price-vs-value.jpg` | A small modest paper price tag in the foreground and, rising behind it, a large layered paper-craft company building many times its size — a tiny sticker price hiding a much bigger business. |
| `size-spectrum.jpg` | Three cut-paper company buildings in a row on stepped platforms, each clearly larger than the last — a small green shopfront, a mid rust building, a tall ochre tower. |
| `execution-tradeoff.jpg` | Two paper gates side by side: a green gate held shut on a paper chain (price control, may not open) and an open ochre gate a flat figure walks straight through (a guaranteed crossing) — control traded against certainty. |
| `stop-trigger.jpg` | A descending paper staircase of price steps with a small round paper marble rolling down it; at one marked step a paper tripwire lever is flipped, dropping the marble down a chute — a falling price hitting its stop. |
| `price-change.jpg` | Two paper price markers on a navy wall, one lower and faded (yesterday's close), one higher and bright (today's price), with a small cut-paper up-arrow stepping between them. |
| `event-gap.jpg` | A cut-paper price ribbon climbing left to right that suddenly breaks and leaps upward across a dark navy gap to continue higher, a small folded paper "news" banner sitting in the gap. |
| `owner-outcomes.jpg` | One central ownership tile splitting along three paper paths to three outcomes — a growing green paper plant, a small stack of ochre coins, and a faded torn rust tile — growth, income, or loss. |
| `supply-demand.jpg` | Two cut-paper ribbons crossing in a large X on a navy board — a green ribbon sloping down, a rust ribbon sloping up — with a small cream marker pinned where they meet. |
| `expectations-gap.jpg` | Two paper bars side by side — a shorter ochre "expected" bar and a taller green "reported" bar — with a slim cream bracket and a folded paper tag marking the extra height between them. |
| `ipo-launch.jpg` | A cut-paper company building lifting off a launch pad like a paper rocket, scattering many small ownership tiles down to a crowd of flat paper people below — a private company going public. |
| `primary-secondary.jpg` | Two linked paper scenes joined by an arrow: on the left, coins flowing into a company building (the first sale); on the right, ownership tiles passing hand to hand between flat paper people (later trading). |

## Reading a Business

| Image file | Prompt subject (append to the Style Block) |
|---|---|
| `cash-vs-profit.jpg` | Two paper containers side by side: a green ledger book fat with paper slips (accounting profit) and a rust jar holding actual paper coins (real cash) — clearly two different things, not the same. |
| `accrual-timing.jpg` | A paper invoice slip pinned at the near end of a dotted paper timeline, with a small stack of coins arriving at the far end much later — the sale booked now, the cash landing later. |
| `noncash-charge.jpg` | A sturdy paper machine slowly shedding thin paper layers into an "expense" tray beside it, while a nearby coin purse stays firmly shut — value wearing down on paper with no cash leaving. |
| `free-cash-flow.jpg` | A wide paper stream of coins flowing into a business; part diverts into a "building and equipment" side channel, and the smaller remaining stream pools as free cash in a tray at the end. |
| `dividend-per-share.jpg` | A central paper cash stack splitting along paper channels into several equal small coin piles, each resting on an identical ownership tile — the payout shared equally per share. |
| `payout-pressure.jpg` | One large paper coin almost entirely fed out through a slot to waiting flat paper people, leaving only a thin sliver of coins behind as a cushion — paying out nearly everything earned. |
| `buyback-slices.jpg` | A paper pie in four equal slices on the left; the same pie as three larger slices on the right, with one slice being drawn back into a company building — fewer shares, each worth more. |
| `yield-trap.jpg` | A tempting oversized paper coin hovering above a downward paper funnel of falling price layers, a small flat figure leaning toward the coin at the funnel's rim — a high yield luring over a sinking price. |
| `competition-cycle.jpg` | A bright paper money-tree on a green hill drawing a growing crowd of flat rust competitor figures streaming toward it from every side — high profits pulling in rivals. |
| `moat-defense.jpg` | A paper castle on a green island ringed by a wide navy water moat; small rust competitor figures stall at the far bank, unable to cross — a durable business barrier. |
| `customer-moat.jpg` | Flat paper customers gathered comfortably inside a walled paper courtyard around a business, while a single figure at the gate hesitates before a steep paper step down to leave — high switching cost keeping them in. |
| `moat-erosion.jpg` | A paper castle wall tall and thick on the left but visibly crumbling, thinning, and broken open on the right, a rust competitor figure stepping through the gap — an advantage eroding. |
| `gross-margin.jpg` | A tall green paper revenue column with one chunk lifted away and set aside as "product costs," leaving a shorter retained column standing beside it — the gross margin kept. |
| `operating-margin.jpg` | A tall paper revenue column stepping down like descending stairs — one block removed for product costs, another for operating expenses — leaving a short final block. |
| `revenue-profit-diverge.jpg` | Two paper ribbons on a board heading opposite ways — a green "sales" ribbon climbing up while a rust "profit" ribbon slides down beneath it — rising revenue over falling profit. |
| `coffee-register.jpg` | A cut-paper coffee-shop counter under a striped awning with a big overflowing till drawer of coins — a full day's sales taken in, before any costs are paid. |
| `coffee-profit-journey.jpg` | A single large paper coin travelling along a winding paper path past four toll gates, trimmed smaller at each gate, arriving as a tiny coin at the end — revenue shrinking to net income. |
| `coffee-gross-profit.jpg` | A coffee-shop pile of coins with three small paper items lifted out and set aside — a coffee bean, a milk carton, a paper cup — leaving a smaller retained pile of coins. |
| `coffee-operating-costs.jpg` | A coin pile with three labelled paper cut-outs pulled from it — a little apron (staff), a small house (rent), a tiny megaphone (marketing) — leaving a modest remaining stack. |
| `coffee-expansion-risk.jpg` | A row of new paper coffee shops growing taller left to right, but beneath them a cut-paper earnings line sinking and dipping below a marked baseline into a dark trough — growth that loses money. |
| `income-waterfall.jpg` | A cut-paper waterfall of coins pouring from a tall top ledge, splitting off into side channels at each drop (costs), the final thin stream collecting in a small basin at the bottom (earnings). |
| `pe-equation.jpg` | A tall paper price tag above a single small earnings coin, joined by a cut-paper division bar, producing a row of stacked paper year-tiles beside them — how many years of earnings the price equals. |
| `pe-payback.jpg` | A long paper receipt unrolling into a row of identical year-tiles stacked one behind the next, a small flat figure walking along them — the years of earnings baked into today's price. |
| `value-trap.jpg` | A tempting "cheap" paper price tag at the top of a downward paper slope, a small flat figure sliding after it past steps of shrinking earnings blocks into a dark pit below — cheap for a reason. |

---

## Workflow (once you've generated some or all)

1. Drop the `.jpg` files into `public/lesson-art/`.
2. `npm run art:optimize` — shrinks the big ~3 MB exports to ~250 KB in place.
3. `npm run art:apply-scenes` — converts every scene whose image now exists to
   an illustration (safe to run repeatedly; it lists what's still missing).
4. `npm run gen:content` — validates. The validator fails loudly if any card
   points at a missing `lesson-art` file, so a typo can't ship blank.
5. I verify the cards render in the app and deploy.

You can do this in batches — generate ten, run the three commands, see them
land, repeat. Nothing breaks while images are still missing; those cards keep
their current animated scene until their image arrives.
