# Knowledge-base registry

The canonical id list for the knowledge base. Every cross-reference in
`content/traders/`, `content/strategies/`, and `content/books/` must resolve
to an id on this page — the validator's referential-integrity pass will fail
the build otherwise.

These entities reference each other in a cycle (a trader lists strategies, a
strategy lists traders, a book lists both), so the ids have to be agreed up
front rather than discovered while authoring.

## Traders — `content/traders/<id>.json`

| id | Who |
|---|---|
| `warren-buffett` | Warren Buffett |
| `peter-lynch` | Peter Lynch |
| `jesse-livermore` | Jesse Livermore |
| `paul-tudor-jones` | Paul Tudor Jones |
| `ray-dalio` | Ray Dalio |
| `william-oneil` | William J. O'Neil |
| `mark-minervini` | Mark Minervini |
| `stanley-druckenmiller` | Stanley Druckenmiller |

## Strategies — `content/strategies/<id>.json`

| id | Name | family |
|---|---|---|
| `value-investing` | Value Investing | `value` |
| `growth-at-a-reasonable-price` | Growth at a Reasonable Price | `growth` |
| `canslim` | CANSLIM | `growth` |
| `trend-following` | Trend Following | `trend` |
| `momentum-investing` | Momentum | `momentum` |
| `mean-reversion` | Mean Reversion | `mean-reversion` |
| `covered-call-wheel` | The Wheel | `income` |

### Strategy guides — `guideCards`

A strategy carries two different kinds of content, and confusing them is the
easy mistake:

- `entryRules` / `exitRules` / `riskManagement` are **reference**. They state
  the shape of the strategy for someone who already understands it.
- `guideCards` is where it is **taught**. Same `Card[]` union a lesson uses, so
  it plays in the lesson player at `/kb/strategy/<id>/guide`.

A guide should cover the claimed edge and *why* it is supposed to exist, what
it costs in drawdown and psychological difficulty, and the conditions under
which it stops working. It should not restate the rules.

`guideCards` is optional, so a strategy page can ship before its deck, and the
unlock gate does not depend on it.

Cards are addressed with the reserved course id `strategy` and the strategy id
(see `findCard`), so saving and sharing use the same storage path as lesson
cards. Guides award no XP and do not touch the streak — by the time a guide is
reachable its gate is already satisfied.

**These decks carry the highest advice risk in the app.** A strategy guide is
exactly where "educational" slides into "you should do this". Teach the
mechanism and its costs; never recommend the strategy, imply a return, or name
a security. The wheel guide is the sharpest case, because option income is
widely marketed with the risk omitted.

## Books — `content/books/<id>.json`

| id | Title | Author | Year |
|---|---|---|---|
| `the-intelligent-investor` | The Intelligent Investor | Benjamin Graham | 1949 |
| `one-up-on-wall-street` | One Up on Wall Street | Peter Lynch | 1989 |
| `market-wizards` | Market Wizards | Jack D. Schwager | 1989 |
| `reminiscences-of-a-stock-operator` | Reminiscences of a Stock Operator | Edwin Lefèvre | 1923 |
| `trading-in-the-zone` | Trading in the Zone | Mark Douglas | 2000 |

## Lesson paths available as prerequisites

Format is `<courseId>/<lessonId>`.

```
market-foundations/what-is-a-stock
market-foundations/why-companies-sell-shares
market-foundations/what-moves-a-price
market-foundations/exchanges-and-brokers
market-foundations/bid-ask-and-spread
market-foundations/order-types
market-foundations/market-cap
market-foundations/indices-and-benchmarks
market-foundations/reading-a-quote
reading-a-business/revenue-vs-earnings
reading-a-business/margins-that-matter
reading-a-business/cash-flow-is-king
reading-a-business/the-price-earnings-ratio
reading-a-business/economic-moats
reading-a-business/dividends-and-buybacks
```

## Agreed strategy gates

Each strategy unlocks only once every listed lesson is completed.

A gate should name the lessons a reader genuinely needs to evaluate the
strategy, not merely the ones that happened to exist when it was written. The
first version of this table gated every technical strategy on
`market-foundations` lessons because courses 3–5 did not exist yet; those gates
were rewritten once they did. If a strategy's gate looks arbitrary, that is the
bug — fix the gate rather than teaching around it.

| strategy | prerequisiteLessons |
|---|---|
| `value-investing` | `reading-a-business/the-price-earnings-ratio`, `reading-a-business/economic-moats` |
| `growth-at-a-reasonable-price` | `reading-a-business/the-price-earnings-ratio`, `reading-a-business/revenue-vs-earnings` |
| `canslim` | `reading-a-business/revenue-vs-earnings`, `reading-a-chart/trend-and-structure`, `reading-a-chart/volume-confirms` |
| `trend-following` | `reading-a-chart/trend-and-structure`, `reading-a-chart/moving-averages`, `risk-and-position-sizing/stop-losses` |
| `momentum-investing` | `reading-a-chart/trend-and-structure`, `reading-a-chart/momentum-indicators` |
| `mean-reversion` | `reading-a-chart/support-and-resistance`, `reading-a-chart/momentum-indicators` |
| `covered-call-wheel` | `market-foundations/order-types`, `reading-a-business/dividends-and-buybacks`, `risk-and-position-sizing/position-sizing` |

## Accuracy rules — these are real people

Trader profiles describe living and historical individuals, so the schema
requires a `source` string on every `trackRecord` entry and every
`famousTrades` entry. That is deliberate: an unsourced performance claim
about a named person is both an accuracy problem and a legal one.

- Only well-documented, publicly reported facts. No speculation, no private
  life, no rumour, no characterisation of motive.
- `source` must name something checkable — a book, a shareholder letter, an
  interview, a regulatory filing. Never "widely reported".
- If a number is disputed or approximate, say so in the text rather than
  presenting a false precision.
- Nothing may read as a recommendation to follow anyone's approach.

## Copyright rules — books

Book entries are **original summaries**, never reproduced text.

- No quotations from the book. No paraphrase so close it tracks the original
  sentence by sentence. Describe the ideas in your own words.
- `guideCards` reuse the same `Card` union as lessons and play in the lesson
  player, so they follow the same card rules and prose budgets.
- `attribution` is required and non-empty.
- `buyLinks` use the form
  `https://bookshop.org/search?keywords=<url-encoded title and author>` —
  a real, non-affiliate bookseller search. Do not invent ISBNs or deep URLs.
