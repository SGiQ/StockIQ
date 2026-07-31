# StockIQ

Bite-sized, card-based lessons that teach stock trading and investing — the
Imprint interaction model applied to finance.

**Phases 1–6 are complete.** Five courses (37 lessons, 740 XP)
play end to end with all seven card types, advance-gating, XP, streaks, and
local persistence — behind a four-tab shell with onboarding, an Explore grid,
a Saved Cards gallery, and share-as-image. The knowledge base adds 8 traders,
7 strategies, and 5 book guides, cross-linked, with strategies gated behind
the lessons that teach them. A card-scoped Claude tutor and a report action
sit in the player, and storage runs on SQLite behind an unchanged repository
interface. Phase 6 adds a Postgres-backed multi-device sync service and a
Cloudflare Worker that keeps the Anthropic key off the device. Devices pair
with a short code, and an account can be secured with Sign in with Apple or a
passwordless email code, so it survives a lost phone.

**The sync service is live** at `stockiq-sync-production.up.railway.app`, with
the protocol, pairing and client-cycle suites passing against it, and
**passwordless email sign-in is delivering** through Resend from
`no-reply@sgiq.ai` — confirmed by a real code arriving in a real inbox.

Still not deployed: the ASK proxy, which needs a Cloudflare login and an
Anthropic key. Until then ASK falls back to bring-your-own-key. See
[docs/deployment.md](docs/deployment.md).

> Educational content only. StockIQ does not provide financial advice.

## Run it

```bash
npm install
npm start          # validates content, regenerates the index, starts Expo
```

Then scan the QR code with **Expo Go** on your iPhone. Everything runs there
except Sign in with Apple, which needs a development build — the module is
imported lazily so Expo Go never loads it, and email sign-in covers the same
job on every platform.

**After editing `.env`, run `npm run start:clear`.** `EXPO_PUBLIC_*` values are
inlined at transform time and Metro caches per file; since `src/config.ts`
itself does not change, a warm cache silently keeps the old value with no
error. See [docs/deployment.md](docs/deployment.md).

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Validate content → regenerate index → start Expo |
| `npm run validate:content` | Five-pass content validation |
| `npm run test:validator` | Assert the validator still catches a deliberately broken fixture |
| `npm run gen:content` | Validate, then regenerate `src/content/index.generated.ts` |
| `npm run gen:authoring-prompt` | Regenerate `docs/content-authoring.md` from the schema |
| `npm run new:lesson -- <courseId> <lessonId> "Title"` | Scaffold a valid 10-card lesson stub |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:sync-cycle` | Drive the real sync cycle and pairing against a running sync service |

## Layout

```
app/                    expo-router routes only — thin
src/
  components/           primitives · cards (7 renderers) · player · path · art
  content/              schema.ts (Zod, source of truth) · richtext · registry
  store/                repository.ts (the persistence boundary) · sqlite · local · sync · slices
  services/ask/         Claude tutor — proxy when deployed, BYO key otherwise
  theme/                tokens.ts
server/                 Railway sync service — Postgres, migrations, protocol
workers/ask/            Cloudflare Worker holding the Anthropic key
tests/                  sync-cycle test (drives the real client cycle)
content/                PURE DATA — courses · lessons · traders · strategies · books
scripts/                validate-content · generate-content-index
                        generate-authoring-prompt · new-lesson
tests/fixtures/         broken content used as a validator regression test
docs/content-authoring.md   GENERATED — the prompt handed to an authoring model
docs/kb-registry.md     canonical ids, strategy gates, accuracy rules
docs/deployment.md      Railway sync service · Vercel web · Cloudflare ASK
```

## The four decisions worth knowing

**1. `src/content/schema.ts` is the single source of truth.** Zod schemas
generate the TypeScript types, drive the runtime validator, and produce the
JSON Schema handed to the content-authoring LLM — so the authoring prompt
cannot drift from the code. `npm run validate:content` runs five passes
(shape, referential integrity, semantic invariants, rich-text lint, prose
budget) and its messages name the file, card, field, and offending value so
failures can be fed straight back to a model.

`docs/content-authoring.md` is **generated** from that schema rather than
written by hand — the JSON Schema, the glyph and palette vocabularies, the word
budgets and the list of valid cross-link ids are all derived, so the authoring
prompt cannot quietly describe a field that no longer exists. Only the
editorial policy (card mix, voice, accuracy and copyright rules) is
hand-written, and it lives in one block of
`scripts/generate-authoring-prompt.ts`. Phase 5 ran 22 lessons through this
loop concurrently; every one came back with zero errors and zero warnings.

**2. `src/store/repository.ts` is the persistence boundary.** No component
imports a storage library. Every record carries `updatedAt` and a soft
`deletedAt`, so adding Supabase sync later is one line in
`src/store/index.ts` rather than a rewrite.

Phase 4 tested that claim by replacing AsyncStorage with `expo-sqlite`. It
cost one new file and two lines in `src/store/index.ts`; no screen, component,
or slice changed. `grep -rl 'expo-sqlite\|async-storage' app src` returns
nothing outside `src/store/`, and that grep is the boundary's actual test.
Existing installs are lifted over once by `migrateFromAsyncStorage()`, guarded
by a version key and wrapped so a failed migration can never block launch.

Phase 6 cashed the same claim a second time, and harder. Cloud sync arrived as
`SyncingRepository`, which *wraps* the local store and delegates every read and
write to it — reads never touch the network, so the app behaves identically
offline. The boundary grep still comes back empty: no screen, component, or
slice imports a storage or sync module. Sync is off unless `EXPO_PUBLIC_SYNC_URL`
is set, so an undeployed app is the Phase 5 app exactly.

Multi-device pairing tested it a third time. The settings screen needs
`startLink` / `joinAccount` / `revokeDevice`, none of which are on
`Repository` — so rather than let a screen import `SyncingRepository`, the
store exports a narrow `pairing` capability that is `null` when sync is not
configured. `null` is also exactly the signal the screen needs to explain why
pairing is unavailable, so the boundary made the UI more honest rather than
more awkward.

**3. In-lesson art is computed, never drawn.** Every visual is an `ArtSpec`
rendered as SVG from numbers — a compounding curve, a candlestick pattern, a
payoff diagram. Finance is inherently diagrammatic, so the chart *is* the
concept: consistent, arithmetically correct, and reliably authorable by an
LLM. Bitmaps are permitted only for covers, and the validator rejects them
inside cards.

**4. An API key cannot be kept secret inside a client app.** Nothing —
`.env`, a config field, obfuscation — changes that; anyone can pull the bundle
off a device and read it. So ASK has two modes, chosen by one ternary in
`src/services/ask/index.ts`:

- **Proxy, when `EXPO_PUBLIC_ASK_PROXY_URL` is set.** A Cloudflare Worker holds
  the key. The not-advice system prompt lives there too, where a modified
  client cannot strip it and where it can be corrected without an app release.
  This is the only mode fit to ship.
- **Bring-your-own-key otherwise.** Your key, your keychain, your credits.
  Fine personally, and it keeps ASK working before anything is deployed.

Phase 4 predicted the proxy would differ "by a URL and a header and nothing
else moves." That held: adding it changed one composition file and no UI.

Streaming uses `expo/fetch` in both modes — React Native's built-in `fetch`
returns a null `response.body`, so the reply would silently arrive in one block
after a long pause instead of token by token.

The tutor is constrained at the system prompt: it answers only about the card
on screen, in 120 words or fewer, and never recommends a specific security or
gives personalised advice. The card is serialised to text by
`src/services/ask/cardContext.ts`; charts describe losslessly because they are
already just numbers.

## Known gaps

- **Web is not a supported target yet.** Reanimated's entering/layout
  animations behave unreliably in the web build, so the deck's resting
  position is deliberately a plain style with animation applied only as a
  decorative offset — correctness never depends on an animation landing. That
  rule is why `entering=` appears nowhere on primary content: Reanimated leaves
  `visibility: hidden` behind on web when an entering animation does not
  complete, which silently blanked the completion screen.
- **Nothing has been verified on real iOS hardware.** Every phase was driven
  through the web build. The iOS bundle exports cleanly, but gestures — swipe
  versus tap zones versus sticker taps — are exactly the thing a browser cannot
  test honestly. Run a device pass before trusting the player.
- **Storage is SQLite on device, AsyncStorage on web.** `expo-sqlite` needs
  extra bundler setup for web, and web is not a shipping target, so the
  AsyncStorage implementation stays as the web fallback. Both satisfy the same
  interface, so this is a one-line branch rather than two codepaths.
- `metro.config.js` maps `node:*` to an empty module. The Anthropic SDK lazily
  `import('node:fs')` to resolve a credential profile from disk — a branch this
  app never reaches, since the client is always constructed with an explicit
  key — but Metro resolves dynamic imports statically and would otherwise fail
  the bundle.
- Trader profiles describe real people, so `trackRecord` and `famousTrades`
  require a `source` on every entry and the app prints it under each claim.
  Self-reported figures are labelled as such. If you add a trader, hold that
  line — see `docs/kb-registry.md`.
- Book guides are original summaries with no reproduced text, a required
  `attribution`, and non-affiliate bookseller search links. The schema has no
  field for excerpts, deliberately.
- **The deck misaligns if the viewport resizes.** Card positions are computed
  from the laid-out width, and a resize does not recompute them, so the deck
  ends up offset until the next navigation. It cannot happen on a phone except
  on rotation, which is why it is recorded rather than fixed — but it will bite
  anyone verifying in a browser who resizes mid-lesson.
- **Strategy gates were rewritten in Phase 5 and should be re-read whenever a
  course lands.** The originals all pointed at `market-foundations` lessons
  because those were the only ones that existed; a trend-following strategy
  gated on "order types" was an artifact of authoring order, not a judgement.
  The gate and the lesson's `unlocks` field must agree — the validator warns
  when they drift, and that warning caught five stale entries during the
  rewrite.

- **The sync service is deployed;** the ASK proxy and Resend are not. Both need
  credentials only the account owner can create. The live service is at
  `stockiq-sync-production.up.railway.app` and the protocol, pairing and
  client-cycle suites all pass against it.
- **Orphaned accounts accumulate.** A device that pairs into another account
  leaves its old one behind by design, and once its last device goes the
  account is unreachable but never deleted. Confirmed on the live deployment.
  Needs a retention job — the same one the deletion path below needs.
- **A device secret is a capability token, not authentication.** `X-Device-Id`
  is a 256-bit random value from the keychain, and whoever holds it can read
  and write that account. Each device keeps its own — none is ever shared,
  which is what makes revoking a lost phone meaningful — but it is still a
  bearer token. That buys multi-device sync with no password and no personal
  data, acceptable *only* because the data is lesson progress. Real per-user
  auth is required before anything sensitive is stored or before this is
  public.
- **Email sign-in delivers, but no code has been redeemed in the app.** A real
  six-digit code was requested through the production endpoint and arrived in a
  real inbox, so Resend, the verified domain, challenge creation and delivery
  are all proven. What has only been exercised against a local Postgres is the
  other half — typing that code in, the account claim, and the cursor reset.

- **Sign in with Apple has never run against Apple.** The token verification is
  covered thoroughly — signature, issuer, audience, expiry and nonce, each with
  its rejection case, driven by a locally generated key and a stubbed JWKS. But
  no real Apple token has ever been verified, because that needs a Developer
  account, a real device, and a human tapping the button. It also does not run
  in Expo Go at all, so the button is only reachable from a native build.
- **No server-side retention or deletion.** Rows are never removed; `reset()`
  abandons the device identity rather than deleting remote data. A deletion
  path is required before this holds anyone's data but your own.
- **No payments.** Deliberately deferred until the app is proven.

The full plan lives at `~/.claude/plans/i-want-to-create-witty-mccarthy.md`.
