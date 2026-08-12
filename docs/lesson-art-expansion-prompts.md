# Lesson art — expansion heroes (crypto / bonds / alternatives)

14 **per-lesson hero** images — one each for the new Crypto, Bonds, and
Alternative Assets lessons — plus 3 optional **course covers**. Each hero is
used as the matching opening + closing bookend.

**Style: paper-craft diorama** — the same handcrafted layered-paper look as the
original 37 lesson heroes (`ownership.jpg`, `revenue-vs-earnings.jpg`, etc.), so
they read as one family at the top of a lesson. *(This replaces an earlier draft
of this doc that used the flat editorial vector style by mistake — that style is
for interior cards, not heroes.)*

The filenames below are the ones already wired into the lessons, so **regenerating
in this style overwrites the same files and needs no code changes** — just
`npm run art:optimize` afterwards.

Charts in these lessons **stay as charts** — do not generate art for them.

---

## Style Block — paste this before every prompt

> Handcrafted layered paper-craft diorama, built as a real 3D model from
> textured matte cardstock, kraft paper, and felt-like paper, then photographed
> as a physical object with soft warm studio lighting from the upper left and
> gentle realistic drop shadows between the layers. Deep navy textured-paper
> background with a couple of torn deckled-paper edges peeling at the corners.
> Muted, slightly desaturated earthy palette only: forest and teal green,
> mustard-ochre yellow, terracotta rust, warm kraft tan and brown, slate
> blue-green, cream. Visible paper grain and fiber on every surface; clean
> craft-knife cut edges. Any people are flat faceless cut-paper silhouettes in
> the palette colors. One clear central metaphor, centered, with generous
> negative space; editorial, calm, premium, symbolic — not a chart, not a
> diagram. Absolutely NO text, letters, numbers, or digits anywhere in the image.

**Then append the row's subject.** Colour code: green = more / kept / safe / up;
rust = less / lost / risk / down; slate/teal = water or vaults; ochre / kraft tan
/ cream = neutral accents. Show relationships by size/height/count, never numerals.

## Specs
- 4:3 landscape, ~1200×900, subject centred and clear of the edges.
- Filename exactly as the `Image file` column, into `public/lesson-art/`
  (overwrites the current placeholder — same slug).
- Then `npm run art:optimize`.

---

## Crypto Foundations (7)

| Image file | Prompt subject (append to the Style Block) |
|---|---|
| `what-is-crypto.jpg` | A single layered-paper coin resting on an open cut-paper ledger board held up by a ring of small faceless cut-paper figures around it, an empty kraft-paper pedestal beside them where a company building would stand — value kept by the group, not one owner. |
| `how-crypto-trades.jpg` | Small folded-paper trade tokens arranged flowing all the way around a circular cut-paper marketplace ring, beneath a layered-paper clock with no hands, and no closing gate anywhere on the ring — a market that never shuts. |
| `wallets-and-custody.jpg` | The same oversized cut-paper key shown twice, a paper coin behind each: on the left resting in the open palm of a green cut-paper figure, on the right sealed inside a tall slate kraft-paper vault — ownership held by you, or by an exchange. |
| `avoiding-crypto-scams.jpg` | A shadowy rust cut-paper figure holding up a friendly smiling paper mask on a stick, offering a shining layered-paper coin with one hand while the other hand hides behind the mask — a fraud wearing a trustworthy face. |
| `crypto-valuation.jpg` | On the left one small layered-paper coin with a tall folded-paper price banner; on the right a vast field of many tiny identical paper coins built into one enormous green paper mound that dwarfs it — one coin's price versus the true size of all coins. |
| `crypto-risk-profile.jpg` | A jagged cut-paper mountain ridge plunging into a deep narrow rust-paper chasm, with a small green paper ladder reaching only partway up the far wall — a fast, deep fall that needs a giant climb to undo. |
| `staking-and-yield.jpg` | A stack of layered-paper coins locked behind a small slate paper gate, feeding through a folded-paper pipe into a modest sprouting green paper plant bearing a few new coins — real yield earned by securing the network and waiting. |

## Bonds & Fixed Income (4)

| Image file | Prompt subject (append to the Style Block) |
|---|---|
| `what-is-a-bond.jpg` | A green cut-paper lender figure handing a stack of ochre paper coins to a kraft-paper company building and receiving back a folded-paper note tied with a cream paper ribbon, a small paper calendar marker on it — a loan that returns with interest. |
| `bond-types.jpg` | Three folded-paper lender's notes propped in a row on rising paper steps — a solid slate paper vault with a short flag, a firm green paper building with a taller flag, and a leaning cracked rust-paper building with the tallest flag — more reward as the borrower looks shakier. |
| `price-and-yield.jpg` | A layered paper-craft seesaw balanced on a single ochre paper coin as its pivot; a green paper block riding high on one end while a rust paper block sits low on the other — when one rises the other must fall. |
| `duration-and-rate-risk.jpg` | Two cut-paper planks pinned at one end under the same small paper weight at their tips — a short green plank barely dipping and a much longer rust plank swinging steeply down — the longer the bond, the harder a rate nudge moves it. |

## Alternative Assets (3)

| Image file | Prompt subject (append to the Style Block) |
|---|---|
| `forex-basics.jpg` | Two different national paper coins balanced against each other on a small cut-paper scale, with a large rust paper lever beneath tipping the whole platform far from only a tiny nudge — small currency moves magnified by leverage. |
| `commodities-basics.jpg` | A layered-paper oil barrel and a kraft-paper gold bar sitting on a large standardized cardstock crate marked with a paper calendar tag, a small cut-paper figure straining to lift the heavy crate with a long paper lever — real goods traded in fixed-size, dated, leveraged contracts. |
| `real-estate-and-reits.jpg` | A small kraft-paper apartment building split into several equal cut-paper ownership tiles that each drip a steady ochre paper rent coin into waiting hands, while a large rust paper dial with an up-arrow looms behind it tugging the building — shares of property, swayed by rates. |

## Course covers (3) — optional, still glyph placeholders

One bold central emblem for the whole course (they render small in the Explore
grid). New files in `public/lesson-art/`.

| Image file | Prompt subject (append to the Style Block) | Alt text |
|---|---|---|
| `crypto-foundations-cover.jpg` | A single large layered-paper crypto coin at the centre with a simple geometric cut-paper emblem on its face, suspended in a web of thin paper-thread lines linking many small paper nodes around it, with no bank building anywhere — a currency run by a network. | A large paper crypto coin at the centre, suspended in a web of connected nodes with no bank anywhere — a currency run by a network. |
| `bonds-and-fixed-income-cover.jpg` | A folded-paper promissory note tied with a cream paper ribbon at the centre, a neat row of equal ochre paper coins marching along a short cut-paper timeline toward a small paper calendar marker — money lent out that returns steadily, with interest. | A promissory note beside a row of equal coins marching along a timeline to a calendar marker — money lent out that returns with interest. |
| `alternative-assets-cover.jpg` | A slate cut-paper compass at the centre with its paper needle fanning out to three small paper emblems around it — a pair of currency coins, a stacked gold bar and barrel, and a small apartment building — pointing beyond stocks and bonds to other markets. | A compass pointing out to three emblems — currency coins, a gold bar and barrel, and an apartment building — other markets beyond stocks and bonds. |

---

## Alt text — already wired

The 14 lesson heroes are already wired into the lessons (opening `concept` +
closing `key_insight` bookends, registered in `src/content/lessonArtwork.ts`),
and the alt text is style-agnostic, so **regenerating the images in paper-craft
changes nothing in code** — the new files just overwrite the old at the same
paths. After dropping them in, run `npm run art:optimize` then `npm run
gen:content`.

For the 3 covers (once generated): set each course's `cover` in
`content/courses/<id>.json` to `{ "kind": "illustration", "source":
"/lesson-art/<file>", "alt": "…" }` — I can do that wiring.
