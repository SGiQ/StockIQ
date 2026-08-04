# StockIQ — "what else we need" roadmap

Synthesis of a four-part deep-dive audit (content, screens/flows, production,
legal/store) run 2026-08-03. Ordered by priority. The web app is live and in
genuinely strong shape; this is the list between "works" and "shippable to the
App Store."

## What's already solid (so we don't re-litigate)
- **Content**: validator passes clean — 5 courses / 37 lessons / 555 cards /
  740 XP, no stubs, reputable sources, no dead cross-links or orphans.
- **"Not financial advice"**: all 3 required placements present (onboarding
  timestamped ack, ASK footer, strategy detail). Advice-shaped content is clean.
- **Copyright/attribution**: book guides are original with disclaimers; Imprint
  screenshots purged from history; attribution enforced by schema + shown in UI.
- **Config/secrets**: clean — only public URLs in the client bundle; no secrets
  committed anywhere. Offline-first resilience is real and tested.
- **Deployed & live**: Web (Vercel), Sync (Railway), Narration worker (CF) all
  healthy.

---

## Tier 0 — Hard App Store blockers (cannot submit without these)

1. ~~**In-app account deletion + server DELETE endpoint.**~~ **DONE** — shipped
   `DELETE /v1/account` (`server/src/accounts.ts` `deleteAccount`, wired in
   `index.ts`): erases records (explicit — no FK) plus the account and its
   cascade (devices, identities, link codes, telemetry). Client path:
   `SyncClient.deleteAccount` → `SyncingRepository.deleteAccount` (server first,
   then full local wipe) → `PairingApi`. In-app danger-zone flow with two-step
   confirm in `app/settings/devices.tsx`. Verified end-to-end on real Postgres
   (`server/test/delete.test.mjs`): records erased, linked device cascade-
   removed, fresh empty account, no resurfacing; sync + pairing regressions
   pass. Still worth adding later: a scheduled orphan-account cleanup job (the
   pre-existing retention gap, not a blocker).
2. ~~**Privacy policy + Terms of Service.**~~ **DONE** — both written as static
   pages in `public/legal/` (privacy.html, terms.html), accurate to what the app
   actually collects. Served as plain HTML (added `legal/` to the vercel.json
   rewrite exclusion; regex re-verified), so the URL works without JS for App
   Store Connect. In-app access via a new **Legal** section in Settings
   (`openLegal` → `src/lib/legal.ts`, origin from `SITE_URL`). Verified: pages
   render, settings links open them. **Owner step:** paste
   `https://stockiq-delta.vercel.app/legal/privacy.html` into App Store Connect,
   and have the text reviewed (it's a solid, accurate draft, not lawyer-vetted).
3. ~~**iOS privacy manifest (`PrivacyInfo.xcprivacy`).**~~ **DONE** — configured
   `ios.privacyManifests` in app.json; a prebuild dry-run confirmed it generates
   a correct manifest (Email/User ID/Product Interaction, all linked, none
   tracking; UserDefaults CA92.1 + FileTimestamp C617.1). **Owner step:** answer
   the matching App Store Connect privacy questionnaire (mapping is in
   `docs/native-build-checklist.md`).
4. **Native build.** **PREPPED** — everything doable without an Apple account is
   done and verified: bundle id, icons, splash, Apple-signin entitlement, privacy
   manifest, export-compliance flag, EAS profiles with env, expo-doctor 20/20,
   clean `expo prebuild`. Peer-dep + version drift fixed (`expo-asset` added,
   SDK 57 patches aligned, stale `newArchEnabled` removed). **Owner steps** (full
   ordered guide in `docs/native-build-checklist.md`): Apple Developer account,
   `eas login`, `eas init` (writes `extra.eas.projectId` — the one value I can't
   add), then `eas build --platform ios`. This is where touch gestures, native
   audio, and Sign in with Apple finally get verified on real hardware.
5. ~~**Splash screen misconfig.**~~ **DONE** — the `expo-splash-screen` plugin now
   references `./assets/splash-icon.png` (`imageWidth: 200`) in app.json, so the
   native splash shows the logo instead of a blank green screen. Renders only in
   a native build, so verify visually on the first `eas build`.

## Tier 1 — Real bugs to fix now (cheap, user-visible)

6. **Every course shows the wrong eyebrow label.** `app/course/[courseId].tsx:85`
   hardcodes "Introduction to equities" above the progress bar for *all*
   courses. Straight bug.
7. **Dead ASK surface in shipped config.** `app/settings/ask-key.tsx` is
   unreachable (registered/linked nowhere), and because `EXPO_PUBLIC_ASK_PROXY_URL`
   is set the app uses `ProxyAskService` — but the proxy isn't deployed, so the
   BYOK entry UI (`AskSheet` SetUpInline) is also dead. Decide: deploy the ASK
   worker (see Tier 2) or remove the dead screens/paths.
8. **Landing CTA dumps new users onto an email wall.** Landing's primary buttons
   ("Get started", "Begin with Market Foundations") route to `/sign-in`, not
   onboarding. The friendly `welcome.tsx` is only reachable via the secondary
   "Explore without an account", and duplicates the sign-in screen's own
   "continue without account". Reconcile into one coherent entrance.
9. **Web-only copy leaks into native.** `settings/devices.tsx` and `sign-in.tsx`
   say "this browser", "after every reload"; landing hardcodes a
   `stockiq-delta.vercel.app` hero URL on native. Reads wrong in a real app.
10. **Apple sign-in is buried.** It's only in `settings/devices.tsx`, not on the
    main `sign-in.tsx` — iOS users expect it there (and Apple prefers it offered
    alongside other sign-in).
11. **Half-wired "help choose the male voice" survey** in `settings/narration.tsx`
    — audition samples are web-only, so the button is permanently disabled on
    native while the whole voting section still renders. Hide on native or finish.

## Tier 2 — Before a public launch (quality / safety)

12. **Deploy the ASK worker** (KV namespace + `wrangler secret put
    ANTHROPIC_API_KEY`, set `EXPO_PUBLIC_ASK_PROXY_URL`) so the tutor uses the
    tamper-proof server prompt instead of a user-pasted key — or decide BYOK-only
    on purpose. `wrangler.toml` still has the `REPLACE_WITH_KV_NAMESPACE_ID`
    placeholder.
13. **CI.** No `.github/` at all; nothing gates merges while Vercel/Railway
    auto-deploy. Add typecheck + `validate:content` + sync tests on PR.
14. **Tests for the two Cloudflare Workers** (ASK handles money + the advice
    prompt; narration handles Range/CORS) — both currently untested.
15. **Missing loading/error states** on the landing hero image and the devices
    screen (no skeletons; failures collapse to a one-liner).
16. **Fix `docs/deployment.md` drift** — it still documents the narration origin
    as the r2.dev dev URL / Vercel, not the live `stockiq-narration` Worker; a
    redeploy following the doc would point at the wrong origin.

## Tier 3 — Content depth (post-launch is fine)

17. **Options-basics lesson.** The covered-call/wheel strategy assumes
    calls/puts/premium/strike/assignment, but no lesson teaches them — the one
    clear curriculum hole.
18. **Upgrade trader track-record sources** from free-text to verifiable
    `ContentSource` links (these are the most accuracy/defamation-sensitive
    claims). Also human-verify the forward-dated Buffett "2026 DEF 14A" citation.
19. **Consider** portfolio construction / allocation / rebalancing and an
    account-types/fees/taxes lesson — topics beginners expect.

## In flight (not a gap)
- **Lesson scene art**: 5/45 paper-craft images done + verified; 40 to go, with
  tightened prompts ready (`docs/notes-lesson-art.md`,
  `docs/lesson-art-generation.md`). Owner is generating them.
