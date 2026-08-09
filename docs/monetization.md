# StockIQ Monetization Plan

> Adapted from Duolingo's freemium playbook, grounded in StockIQ's actual
> architecture and platform position. Educational content only — monetization
> stays on the education/tools side of the "not financial advice" line.

## Context that shapes everything

StockIQ is **live on web (Vercel) but not yet on iOS/Android** (no Apple
Developer account). That is not a limitation — it is the single biggest
monetization advantage, because it lets us start with web checkout and avoid the
Apple/Google 15–30% tax entirely.

We already have four of the five hooks needed:

- ✅ Streaks (`StreakRow`, `StreakState`)
- ✅ XP + badges (`src/features/achievements`)
- ✅ Readiness Meter (`ReadinessMeter`)
- ✅ AI tutor (ASK / Claude) — this is our "Duolingo Max"
- ❌ Hearts (the friction moment) — needs building
- ❌ Payment + entitlement layer — needs building

## 1. What transfers from Duolingo

Duolingo in one line: **genuinely-free-but-frictioned + loss aversion +
web-checkout margins + obsessive A/B testing.** Reference numbers — ~83% of
revenue is subscriptions, ~9% of monthly actives pay, and conversion climbed
from ~3% to ~9% purely through funnel experiments. The UI is copyable; the
experiment cadence is the real moat.

| Duolingo lever | StockIQ equivalent | Status |
|---|---|---|
| Hearts (run out → wait/pay) | Hearts on quiz cards — the timed, high-intent conversion moment | ❌ build (quiz cards + advance-gating already exist) |
| Streaks + streak repair | Streak + paid "streak repair" perk | ✅ exists |
| Duolingo Max (AI, GPT-4) | ASK / Claude tutor, metered by tier — maps to real COGS | ✅ exists |
| Leagues → retention → ad views | Badges + Readiness Meter | ✅ exists |
| Reverse 14-day trial | Same | ❌ needs paywall |

The ASK tutor is a *better* gate than Duolingo Max: every query costs real
money, so metering is cost recovery, not a dark pattern.

## 2. Tiers & pricing (US)

Finance literacy carries higher perceived ROI than language learning, so we
anchor above Duolingo. Most finance-ed apps land at $60–200/yr.

| Tier | Price | Includes |
|---|---|---|
| **Free** | $0 | All 37 lessons, streaks, XP, badges. **But:** 5 hearts, ~3 ASK questions/day, ads between lessons, KB previews only |
| **StockIQ Pro** | **$9.99/mo** or **$59.99/yr** (~$5/mo — anchor the annual) | No ads, unlimited hearts, unlimited ASK (fair-use cap), full Knowledge Base, spaced-repetition review unlocked, monthly streak repair, offline |
| **StockIQ Elite** | **$19.99/mo** or **$119.99/yr** | Everything in Pro **+** AI-native features: personalized coaching path, "explain this real ticker," Socratic AI mode, portfolio-simulator lessons, priority new content |

Why this shape:

- **Annual is the hero.** High monthly ($9.99) makes annual ($5/mo effective)
  read as ~50% off — pushes the low-churn, high-LTV commitment.
- **Elite is the ARPU lever and the decoy.** Even at 5–10% take it raises the
  ceiling, makes Pro feel like the sensible middle, and concentrates expensive
  AI costs on people paying $120/yr.
- Add a **Family/Duo plan** later (~$99/yr) for multi-seat lock-in.

## 3. Free-tier friction (build first, before the paywall)

Sequence matters — build the frictioned moment before the thing that sells
relief.

- **5 hearts.** Lose one per wrong quiz-card answer. Empty → lesson locked.
  Refill by waiting, watching an ad, or **going Pro for unlimited.** This
  degrades the experience exactly at peak engagement — the conversion moment.
- **Meter ASK** at ~3 questions/day free. Hitting the wall mid-lesson is a
  contextual upsell.
- **KB previews:** show trader/strategy/book cards, gate the depth.
- Keep all 37 core lessons free. Pay-to-upgrade, never pay-to-play.

## 4. Payment architecture — the unfair advantage

**Web-checkout-first with Stripe. Do it now, while web is the only live
platform.**

- Duolingo is *retrofitting* web checkout post-*Epic v. Apple* (2025) to escape
  Apple's cut. We get to **start there** — no App Store tax to escape yet.
  Stripe is ~3% vs Apple's 15–30%. On a $60 annual sub: ~$1.80 in fees instead
  of ~$9–18. That margin gap is the whole ballgame.
- Identity layer already exists: Sign in with Apple + passwordless email +
  Postgres sync on Railway. Stripe subscription + entitlement field on the
  profile + a webhook to flip it = the whole backend.
- **Sync gotcha:** do not store entitlement state anywhere it can be
  last-write-wins-clobbered to free on sign-in. Derive it from the
  Stripe-webhook-authored row — same lesson as the profile-singleton-LWW-sync
  memory.
- **When native ships:** use the post-*Epic* external-link entitlement to keep
  steering iOS users to web checkout (often with a small web-only discount);
  keep IAP only as a fallback for users who refuse to leave the app.

## 5. Conversion funnel

- **Reverse 14-day trial** of Pro at onboarding: give premium first (ad-free,
  unlimited hearts/ASK), then lapse to the frictioned free tier. Downgrading
  *feels like a loss* — worth more than a standard trial.
- **Front-load onboarding commitment** (we already collect experience level +
  learning goal) before the paywall, for sunk-cost investment.
- **Contextual paywalls at friction peaks:** hearts empty, ASK limit hit, gated
  strategy guide — not one generic wall.
- **Loss-aversion nudges:** offer streak-repair as a long streak is about to
  break; a dropping Readiness Meter is another "keep your progress" prompt.
- **Instrument and A/B everything** — trial length, paywall copy, price, heart
  count. The experiment loop, not the UI, is what took Duolingo 3% → 9%.

## 6. Metrics to instrument from day one

Free→trial start, trial→paid, paid churn, ARPU, ASK-limit-hit rate,
hearts-empty rate, and paywall-view→convert by trigger.

## 7. Phased roadmap (mapped to the repo)

1. **Instrumentation + hearts** — add a `hearts` slice to `useAppStore`, wire
   loss on wrong quiz cards, add the empty-state lock. Meter ASK. (No payments
   yet — pure funnel prep.)
2. **Stripe web checkout + entitlement** — Stripe subscription, webhook →
   Postgres, `isPro/isElite` derived on the profile (LWW-safe), gate the perks.
3. **Paywall + reverse trial** — contextual paywall screens, 14-day Pro trial in
   onboarding.
4. **Elite AI tier** — build the AI-native features and the upsell.
5. **Optimize** — A/B loop on price, trial, copy; add Family plan; add win-back
   offers.

## Guardrail

Keep monetization cleanly on the education/tools side of the "not financial
advice" line — gate lessons, AI tutoring, and KB depth, never anything that
reads as gating personalized investment recommendations. Don't let Elite's
"explain this ticker" drift into "you should buy this ticker."

## Reference: Duolingo data points (2023–2026)

- FY2025 revenue ~$1.04B (+39% YoY); ~12.2M paid subscribers (Q4'25); ~133M MAU;
  ~9% paid penetration; ~83% of revenue from subscriptions.
- Tiers: Free / Super Duolingo (~$12.99/mo, ~$84/yr) / Duolingo Max (~$29.99/mo,
  ~$168/yr; AI features via GPT-4).
- Free tier frictioned with hearts + ads; reverse 14-day trial; ~38-screen
  onboarding front-loads commitment before the paywall.
- Post-*Epic v. Apple* (April 2025): external web-checkout links now allowed in
  iOS apps, enabling escape from the 15–30% IAP fee.
