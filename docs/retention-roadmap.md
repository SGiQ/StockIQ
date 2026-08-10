# StockIQ Retention Roadmap

> The problem this solves: the 42-lesson catalog finishes in ~3–4 weeks, so
> the courses are an **acquisition hook, not a retention engine**. Nobody pays
> monthly to re-quiz content they've finished. The fix is to stop selling *the
> course* and start selling *an ongoing relationship with the market* — the one
> thing that never runs out. Free finishes the course; paid is the part that
> never ends.
>
> Six features build that recurring value, sequenced by **value × feasibility**.
> The lessons stay the funnel; these become the reasons to open the app in
> month 6. Everything reuses the existing card renderer, the `Syncable`
> repository pattern, the entitlement gate, the streak/XP/gems loop, and the
> ASK tutor.

## The six at a glance

| # | Feature | Why it retains | External dep | Effort | Phase |
|---|---|---|---|---|---|
| F3 | **This Week** — timely market-tied content feed | A fresh reason to return *this week* | none (editorial/AI cards) | M | **1** |
| — | **Maintained Readiness** — score decays, review restores | Turns a one-time score into a habit | none | S | **1** |
| F2 | **AI Advisor** — ASK as an always-on companion | Unbounded, personal utility | ASK proxy (already configured) | M | **2** |
| F1 | **Market Companion** — a watchlist the app explains | Daily companion; the market is infinite content | **market-data API** | L | **3** |
| F4 | **Practice** — paper-trading simulator | Apply skills forever, personally | market-data API | L | **4** |
| F5 | **Leagues** — weekly competitive tiers | Social pull after content ends | sync server work | L | **5** |
| F6 | **Content cadence** — "New this month" | Keeps the well from emptying | authoring time | S+ongoing | **6** |

**Critical path:** F1 and F4 both hinge on a **market-data source** — the one decision that gates the highest-value features. Everything in Phases 1–2 is buildable with zero new external dependencies.

---

## Phase 1 — The recurring habit surface (no external deps)

Goal: a post-course reason to return every week, built entirely on existing infra.

### F3 · This Week
**What.** A feed of short, dated "market notes" — 1–3 cards each, in the exact lesson-card format — explaining something timely ("What moved this week and why", an earnings explainer, a macro-event decoder), each tied back to a lesson concept.

**Why it retains.** It's the habit loop: a new drop each week is a standing reason to open the app after the courses are done. The market supplies infinite raw material for free.

**Surface.** A new **"This Week"** tab (or a top card on Learn) showing the latest drop with a "new" badge; older drops archived below. Cards render through the existing `CardRenderer` and can carry the "Ask about this" and save actions for free.

**Data model.** A new content collection `weeklyNotes` (authored JSON, same pipeline as lessons via `content/`), each note = `{ id, publishedOn: 'YYYY-MM-DD', title, cards: Card[], relatedLessonId? }`. Read-through of the existing content registry; a small `readWeeklyNotes()` selector. A synced `lastSeenWeeklyNote` on the profile drives the "new" badge (LWW-safe single field).

**Reuse.** Card renderer, content pipeline (`new:lesson`-style script), save/ASK actions, narration (optional). **New:** the note content type + the feed screen. Population is editorial/AI — a `scripts/new-weekly-note.ts` scaffold + an authoring prompt.

**Effort.** M. **Metric.** Weekly-active return rate after course completion.

### Maintained Readiness
**What.** The Readiness score (already computed in `src/features/achievements/readiness.ts`) gains a **decay term**: without recent review it drifts down; completing due reviews restores it. Surface a "keep sharp" nudge when it slips.

**Why it retains.** Converts a number you *achieve once* into one you *maintain* — a daily/weekly reason to do a quick review even after finishing lessons. Pairs with the streak.

**Data model.** No new storage — decay is **derived** from `review` due-dates and `lastReviewedAt` (pure function over existing rows), so it self-heals and stays LWW-safe. Add a `readinessTrend` selector.

**Reuse.** Readiness meter, spaced review, streak, the review-gems loop. **New:** the decay term + a home "Keep sharp — N cards due" surface. **Effort.** S.

---

## Phase 2 — AI Advisor (F2)

**What.** Promote ASK from a per-card helper to an **always-on tutor**: a dedicated "Ask" surface where a learner can ask anything about a concept, term, chart, or (later) a ticker, with a saved history. Metered by tier (free = few/day, Pro/Elite = unlimited) via the existing entitlement gate.

**Why it retains.** Unbounded, personal utility — the reason people keep a tool is that it answers *their* real questions. It's also the concrete Elite differentiator (unlimited + advanced modes) from the monetization plan.

**Surface.** An "Ask" entry in the tab bar or a persistent button; a threaded Q&A view; suggested prompts drawn from recent lessons; history saved as a synced collection.

**Data model.** New `askThreads` collection (`Syncable`): `{ id, createdAt, messages: {role, text, at}[], context? }`. Daily-cap counter derived like the daily quests (per-day key on the profile), gated by `useEntitlement().unlimitedAsk`.

**Reuse.** The ASK proxy (**already configured** — `EXPO_PUBLIC_ASK_PROXY_URL` set), `AskSheet`, entitlement gate, the gems/limit pattern from hearts. **New:** the Ask surface + thread storage + metering. **Effort.** M. **Metric.** Asks/week per active user; free→paid conversion on hitting the cap.

---

## Phase 3 — Market Companion (F1) · the value feature

**What.** A **watchlist** of a few tickers the learner cares about. The app then narrates *their* holdings in the language of the lessons — e.g. "NVDA fell 8% on earnings; remember *earnings are an opinion, cash is a fact* — here's the line to check." Tap any move → an ASK-generated, lesson-linked explanation.

**Why it retains.** This is the strongest lever: it turns a finite course into a **daily companion**, and the market provides endless fresh material at no content cost. It's the feature most likely to earn a month-6 open.

**Surface.** A "Watchlist" tab: add/remove tickers; each shows price + change; tap → a card-format explanation (auto-generated, lesson-linked) with the "not advice" guardrail front and center. A daily/weekly "what happened to your list" digest feeds This Week.

**Data model.** `watchlist` collection (`Syncable`): `{ id: ticker, addedAt }`. Quotes/news fetched live (not stored) through a small proxy Worker (keeps the data-vendor key off the device, same pattern as the ASK/narration Workers). Explanations generated via the ASK proxy, cached per (ticker, day).

**External dependency.** A **market-data API** (quotes + basic news/events). Options span free-with-limits (Finnhub, Alpha Vantage, Twelve Data) to paid (Polygon, IEX). Delayed data is fine — this is educational, not trading. **This is the decision that gates F1 and F4.**

**Guardrail (non-negotiable).** Explanations stay strictly educational — "here's what to look at and why," never "buy/sell/hold." Reuses the existing "not financial advice" posture and the `feels-like-advice` report reason.

**Reuse.** Card renderer, ASK proxy, entitlement gate (watchlist size or explanations as a Pro perk), the Worker-proxy pattern. **New:** a market-data Worker, the watchlist model + tab, the explanation generator. **Effort.** L. **Metric.** Watchlist adds; DAU among course-completers.

---

## Phase 4 — Practice / Paper-trading Simulator (F4)

**What.** A simulated portfolio: "buy" and "sell" with fake cash at (delayed) real prices, then the app coaches the decisions using lesson frameworks (position sizing, a "Reading a Business" scorecard applied to the ticker).

**Why it retains.** Practice is infinite and personal; it's where knowledge becomes skill, and it gives lapsed learners something to *do*, not just read.

**Data model.** `paperPortfolio` (`Syncable`): positions `{ ticker, shares, costBasis, at }`, cash balance; P&L computed live from quotes. Coaching via ASK.

**External dependency.** Same market-data API as F1 (builds directly on the Companion). **Reuse.** Watchlist + data Worker + ASK + charts (`src/components/art/charts`). **Effort.** L. **Metric.** Sessions/week; retention lift among simulator users.

---

## Phase 5 — Leagues (F5)

**What.** Weekly XP leagues (Bronze → Diamond), promote/relegate, a live leaderboard — Duolingo's signature social engine.

**Why it retains.** Competition and a weekly reset pull people back independent of content; it's the highest-ceiling *new* system.

**Data model.** Server-side: weekly cohorts keyed on the account, XP summed from the synced progress the server already receives. New endpoints on the Railway sync service; a `league` read model on the client. Readiness/streak already give the client-side identity to show.

**External dependency.** Sync-server work (accounts + Postgres already exist). **Reuse.** Accounts, sync, XP, the `SyncingRepository` pattern. **New:** league cohorts + endpoints + a Leagues screen. **Effort.** L. **Metric.** Weekly retention; % of actives in an active league.

---

## Phase 6 — Content cadence (F6)

**What.** A standing rhythm of new material — an advanced course or a handful of lessons each month — plus a "New this month" surface so returning users see there's more.

**Why it retains.** Keeps the well from emptying for the segment that just wants more to learn; also feeds This Week and the Companion with fresh framing.

**Reuse.** The whole content pipeline (`new:lesson`, validation, generated index) already supports this — it's an **authoring cadence**, not an engineering build. **New:** a lightweight "New this month" badge/surface. **Effort.** S engineering + ongoing authoring. **Metric.** Return rate around each drop.

---

## Sequenced plan

1. **Phase 1 — habit surface** (This Week + Maintained Readiness). No deps; ship first. *This is what makes the app worth opening after the courses end.*
2. **Phase 2 — AI Advisor.** ASK proxy is already configured; mostly client + storage + metering. Turns on the Elite value.
3. **Phase 3 — Market Companion.** The big value feature; **needs the market-data decision** below.
4. **Phase 4 — Simulator.** Builds on Phase 3's data + watchlist.
5. **Phase 5 — Leagues.** Server work; independent of market data — can run in parallel once Phase 1–2 land.
6. **Phase 6 — Content cadence.** Ongoing from now; light engineering.

### Monetization mapping
- **Free:** the 42 lessons + a taste of This Week + capped ASK. (The hook; fine that it "ends".)
- **Pro:** unlimited ASK, full This Week archive, the Market Companion, Maintained-Readiness coaching, leagues.
- **Elite:** the Simulator + advanced AI explainers + priority new content.

This is what makes a *recurring* charge honest: paid is the never-ending surface, not the finite course.

### The one decision that gates Phases 3–4
Pick a **market-data source**. Delayed quotes are fine (educational use), so a free/low tier likely suffices to start:
- **Finnhub / Twelve Data / Alpha Vantage** — free tiers with rate limits; quickest start.
- **Polygon / IEX Cloud** — paid, cleaner data + news, room to grow.

Everything in Phases 1–2 proceeds regardless.
