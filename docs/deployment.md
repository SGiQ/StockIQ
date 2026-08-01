# Deploying StockIQ

**The sync service is deployed and live:**

| | |
|---|---|
| URL | https://stockiq-sync-production.up.railway.app |
| Railway project | StockIQ (`a8359ffc-446b-4ada-991c-a9b16fac3509`) |
| Services | `stockiq-sync` + `Postgres` |
| Schema | migrations 0001–0004 applied |
| Verified against it | protocol, pairing, and client-cycle suites — all passing |

The ASK proxy and Resend are **not** set up; both need credentials only you
can create. Everything below still applies to them.

**The app works with none of this done.** With no `EXPO_PUBLIC_SYNC_URL` the
app is local-only, exactly as it was through Phase 5. With no
`EXPO_PUBLIC_ASK_PROXY_URL` the tutor falls back to bring-your-own-key.
Undeployed is a supported state, not a broken one.

---

## What runs where, and why

| Piece | Host | Why there |
|---|---|---|
| Postgres | Railway | Managed, persistent, and in the same project as the service that talks to it |
| Sync service (`server/`) | Railway | Colocated with Postgres — a pooled DB connection across providers is latency and a connection-limit problem you do not need |
| ASK proxy (`workers/ask/`) | Cloudflare Workers | Stateless, edge-close for streaming, and holds the Anthropic key as a secret |
| Vercel | Web app, and optionally narration MP3s | Hosts the exported web app at `stockiq-delta.vercel.app`; content-addressed speech can be served from `/speech/` if the generated library is committed |

---

## 1. Sync service on Railway — done

Recorded so it can be rebuilt or moved. Run from `server/`, which is what
makes `railway up` upload only the service rather than the whole Expo repo:

```bash
railway login
railway init --name StockIQ
railway add --database postgres
railway add --service stockiq-sync

# A reference, not a copied value: Railway resolves it at deploy time, so the
# password never sits in a shell, a file, or this document.
railway variables --service stockiq-sync \
  --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set 'APPLE_BUNDLE_ID=com.stockiq.app'

railway up --service stockiq-sync --ci
railway domain --service stockiq-sync --port 8080
```

`server/railway.json` pins the rest. Its `startCommand` is
`npm run migrate && npm start`: the `&&` means a failed migration stops the
service from serving at all, rather than answering requests against a schema
the code does not expect. Migrations are idempotent and recorded in
`schema_migrations`, so running them on every boot is safe.

`server/.railwayignore` keeps `node_modules/` out of the upload — host-built
native modules do not belong in a Linux container.

Then in `.env` (git-ignored; see `.env.example`):

```
EXPO_PUBLIC_SYNC_URL=https://stockiq-sync-production.up.railway.app
```

### Re-running the suites against the deployment

```bash
BASE=https://stockiq-sync-production.up.railway.app
cd server
SYNC_URL=$BASE npm run test:sync
SYNC_URL=$BASE npm run test:pairing
cd .. && SYNC_URL=$BASE npm run test:sync-cycle
```

They create test accounts and records. That is fine on an empty database and
becomes untidy once real data exists — see *Housekeeping* below.

### Housekeeping this deployment still needs

**Orphaned accounts accumulate by design.** When a device pairs into another
account, the server deliberately leaves its old account in place (that account
may still have other devices). Once its last device leaves, the account is
unreachable — no device secret maps to it — but nothing deletes it.

Confirmed on this deployment: after running the suites, four unreachable
accounts and two records remained. They are harmless and tiny, but the count
only grows. A retention job should remove accounts with no devices after some
grace period, and that is the same job needed for the deletion path noted at
the end of this document.

### Multi-device, and the security trade you are accepting

Records belong to an **account**; devices belong to that account. Each device
keeps its own secret (`X-Device-Id`, a 256-bit value in its keychain) and never
learns another device's — which is what makes revoking a lost phone actually
mean something.

Pairing: one device shows an 8-character code, the other types it. The code is
single-use, expires in five minutes, and claim attempts are rate limited —
all three are required, because a code short enough to type is short enough to
guess without them.

Joining moves the **device**, not its rows. The server deliberately leaves the
joining device's old records on its old account, because that account may still
have other devices attached and moving rows would take their data from them.
The client re-pushes its own local history instead, so both sides merge and
nothing is lost. That behaviour is pinned by test 7 in `test:sync-cycle`.

The device secret is still a **bearer capability**: whoever holds it can read
and write that account. That buys multi-device sync with no password and no
personal data, and it is acceptable **only** because the data is lesson
progress and saved cards. Anything sensitive, or a public launch, needs real
per-user authentication first — a device secret is not a substitute for it.

### Email sign-in (passwordless)

Works on every platform, which Sign in with Apple does not — so this is the
recovery path that actually covers everyone.

**No password exists anywhere.** The server emails a six-digit code and stores
only its SHA-256 hash, so a database leak hands over nothing usable.

**Why a code rather than only a clickable link:** people routinely open email
on a different device from the one they are signing in on. A pure magic link
dead-ends there, because tapping it authenticates the laptop rather than the
phone. The code travels; the link in the email is a same-device convenience.

#### Setting up Resend

These steps are yours — I do not create accounts or handle live API keys.

1. **Create a Resend account** at [resend.com](https://resend.com).

2. **Add and verify a sending domain** (Domains → Add Domain). Resend shows an
   SPF `TXT` record and a DKIM `TXT` record to add at your DNS host, and
   verification only completes once they propagate. You cannot send from a
   domain you have not verified.

   If you do not have a domain yet, Resend's own onboarding sender lets you
   test delivery to *your own* account address before you own one — enough to
   prove the wiring, not enough to sign anyone else in.

3. **Create an API key** (API Keys → Create). Copy it once; Resend does not
   show it again. Sending-only permission is sufficient.

4. **Set both variables on Railway** (Variables tab — paste the key there, not
   into a file in the repo):

   ```
   RESEND_API_KEY=re_...
   EMAIL_FROM=StockIQ <login@yourdomain>
   ```

   `EMAIL_FROM` must be **at the domain you verified**. That mismatch is the
   single most common first-run failure.

5. **Prove it before trusting it:**

   ```bash
   cd server
   RESEND_API_KEY=re_... EMAIL_FROM="StockIQ <login@yourdomain>" \
     npm run check:email -- you@example.com
   ```

   It sends one real email and names the specific problem if it fails.

#### Configuration states

| Configuration | Behaviour |
|---|---|
| `RESEND_API_KEY` + `EMAIL_FROM` | Sends via Resend |
| `EMAIL_TRANSPORT=console` | Prints codes to the log. Local development and tests only |
| Neither | Startup logs an error; email sign-in returns **503**. Sync, pairing and Apple keep working |

That last row is deliberate. An earlier version silently fell back to printing
when the key was missing, which in production is the worst possible outcome:
health checks pass, sign-in looks fine, and every code goes somewhere the
person signing in cannot see. Printing now has to be asked for by name.

#### When it fails

The API's own error reference is wrong about this, so the codes below are what
the API actually returns, observed directly:

| Symptom | Cause | Fix |
|---|---|---|
| `Resend rejected the API key` (HTTP 401) | Wrong or revoked key | Re-copy `RESEND_API_KEY` |
| `...domain is not verified` (HTTP 403) | `EMAIL_FROM` is at an unverified domain | Finish DNS verification, or change `EMAIL_FROM` |
| Startup: `RESEND_API_KEY is set but EMAIL_FROM is not` | Half-configured | Set `EMAIL_FROM` |
| Accepted but never arrives | Delivery, not the API | Resend dashboard → Emails shows bounces and spam rejections |

What defends a six-digit code, all four required:

| Control | Value |
|---|---|
| Expiry | 10 minutes |
| Single use | consumed on success, and burned when the cap is hit |
| Guesses per code | 5, then even the correct code is refused |
| Requests per address | 5 per 15 minutes, so an inbox cannot be flooded |

Requesting a code answers identically whether or not the address has an
account. Otherwise this endpoint would be a way to test whether any given
person uses StockIQ.

### Sign in with Apple

This is what makes accounts recoverable. Without it, device secrets live only
in keychains, so losing every linked device made the data permanently
unreachable.

**It does not run in Expo Go** — the native module is not in that binary, so
the app shows an explanation rather than a broken button. It needs
`npx expo run:ios` or an EAS build, and these steps, all of which are yours:

1. An **Apple Developer account** ($99/yr).
2. In the developer portal, enable **Sign in with Apple** on the App ID for
   `com.stockiq.app`.
3. Set the bundle id on the sync service so tokens can be verified:
   ```
   APPLE_BUNDLE_ID=com.stockiq.app
   ```
   The service **refuses all sign-ins** until this is set. That is deliberate:
   verifying a token without checking its audience would accept one minted for
   a different app, whose developer could then impersonate any of your users.
   Being unavailable is better than being wrong.

`app.json` already sets `ios.usesAppleSignIn` and the config plugin.

**What is stored:** only Apple's `sub` — an opaque identifier unique to this
app, which cannot be correlated with the same person elsewhere. Apple offers
name and email on first authorisation; the app requests neither and the server
discards both. An account holding nothing but lesson progress stays that way.

**What signing in does to your data:**

| Situation | Result |
|---|---|
| First sign-in on a device you have been using offline | The identity attaches to the account you already have. Nothing moves; nothing can be lost |
| Signing in on a new phone | You join your existing account and it merges with anything local |
| A second person signing in on a phone already signed in | They get a fresh, empty account, and the merge is **refused** — otherwise the first person's progress would be copied into the second person's account |

That last row is enforced by the server (`merge: false`) and covered by
`test:apple-accounts`.

---

## 2. ASK proxy on Cloudflare

The proxy exists because **an API key cannot be kept secret inside a client
app** — anyone can pull the bundle off a device and read it. This is the only
ASK mode fit to ship publicly.

**Not deployed.** Everything is prepared and the Worker builds (verified with
`wrangler deploy --dry-run`: 4.59 KiB, bindings resolved), but it needs a
Cloudflare login and your Anthropic key, and both are yours.

```bash
cd workers/ask
npm install

# 1. Authorise. Opens a browser; only you can complete it.
npx wrangler login

# 2. Creates the KV namespace and writes its id into wrangler.toml.
#    The id is opaque hex, and a wrong one fails at request time rather than
#    at deploy time — the Worker starts, then refuses every question because
#    the binding resolves to nothing. Hence a script rather than copy-paste.
npm run setup

# 3. Prompts for the key and sends it straight to Cloudflare. It never passes
#    through the repo, this document, or anything I can see.
npx wrangler secret put ANTHROPIC_API_KEY

# 4. Ship.
npm run deploy
```

The KV binding is a **cost guard**, not an optional extra: the Worker refuses
to serve without it, because an uncapped endpoint that spends money on every
call is a bill waiting to happen.

Until step 3 is done the Worker deploys but answers `500 proxy is not
configured` — fail-closed by design, so a half-finished deployment cannot
quietly serve without its key.

Then:

```
EXPO_PUBLIC_ASK_PROXY_URL=https://stockiq-ask.<your-subdomain>.workers.dev
```

Adjust `DAILY_LIMIT` in `wrangler.toml` to taste — it defaults to 100
questions per owner per day. The counter uses KV, which has no atomic
increment, so under heavy concurrency from one caller the count can drift by a
few. It is a cost guard, not a security control.

---

## 3. Narration audio

Narration is generated at authoring time, never on a learner's device. The
OpenAI key stays on the machine doing the render and is not an app or hosting
environment variable.

```bash
# No key, no API calls: verifies counts and shows the current estimate.
npm run gen:speech -- --check

# Paid one-time render. Do this locally; never paste the key into source.
OPENAI_API_KEY=sk-... npm run gen:speech
```

The real library is currently 555 narrated cards × two voices = 1,110 MP3s and
250 MB. Output is content-addressed under `public/speech/`, and the generated
lookup table is `src/content/speech.generated.ts`; rerunning after a copy edit
renders only changed clips and prunes orphans.

Audio is hosted in the public Cloudflare R2 bucket `stockiq-narration`, not in
Git. After generating new or changed clips, upload them with the authenticated
Wrangler CLI:

```bash
npm run upload:speech
```

The uploader uses eight concurrent transfers, retries failures, and applies
`audio/mpeg` plus a one-year immutable cache policy. The generated manifest is
small and belongs in Git; `public/speech/` is intentionally ignored.

Both web and native builds use the public R2 origin:

```
EXPO_PUBLIC_SPEECH_URL=https://pub-a78029218bb0482fb7f3c97f8ac97a57.r2.dev
```

This value is public and contains no credential. With no value, or when a clip
is absent from the manifest, lessons remain fully functional and simply hide
the narration control. The settings screen clearly discloses that voices are
AI-generated, as required for OpenAI TTS.

---

## Testing on your iPhone

### Expo Go — works now, costs nothing, no Apple account

`expo-apple-authentication` is the **only** dependency Expo Go cannot load, and
it is imported lazily so Expo Go never touches it. Everything else — the
player, SQLite, the keychain, sync against the live Railway service, pairing,
and email sign-in — runs in Expo Go today.

```bash
npm start          # then scan the QR code with Expo Go
```

Sign in with Apple simply does not appear; email covers the same job on every
platform. Nothing is stubbed and nothing is missing.

> **After changing `.env`, always start with `--clear`:**
> ```bash
> npx expo start --clear
> ```
> `EXPO_PUBLIC_*` values are inlined at transform time and Metro caches the
> result per file. Since `src/config.ts` does not change when `.env` does, a
> warm cache silently keeps the OLD value — no error, no warning, the app just
> talks to the wrong place or to nothing at all. This was verified the hard
> way: the sync URL was absent from three consecutive bundles until the cache
> was cleared. The same applies to `expo export --clear`.

Confirm it took by checking the export contains the URL:

```bash
npx expo export --platform ios --clear --output-dir /tmp/check
grep -aq "up.railway.app" /tmp/check/_expo/static/js/ios/*.hbc && echo inlined
```

### Running without an Apple Developer account

This is a supported configuration, not a degraded one:

| Feature | Expo Go, no Apple account |
|---|---|
| All 37 lessons, saved cards, streaks | ✅ |
| Local storage (SQLite, keychain) | ✅ |
| Sync to the live Railway service | ✅ |
| Device pairing by code | ✅ |
| Email sign-in and account recovery | ✅ *(needs Resend)* |
| ASK tutor | ✅ bring-your-own-key |
| Narration playback | ✅ after clips are hosted and `EXPO_PUBLIC_SPEECH_URL` is set |
| Sign in with Apple | ❌ hidden |

The only thing email sign-in needs is Resend on Railway. **You do not need to
own a domain to test it** — Resend will deliver to the address on your own
Resend account without domain verification, which is enough to sign yourself
in. A verified domain is only required to send to anyone else.

### Development build — needed only for Sign in with Apple

**This costs money.** Installing a build on a physical iPhone needs a
provisioning profile, which needs the **Apple Developer Program at $99/year**.
There is no way around that for on-device installs; it is Apple's gate, not
Expo's. A free Expo account covers the build itself.

Nothing in the code changes when you do this — `isAppleSignInAvailable()`
starts returning true and the button appears.

```bash
npx eas-cli login                          # free Expo account
npx eas-cli build:configure                # links the project, writes the project id
npx eas-cli build --profile development --platform ios
```

EAS will ask for Apple credentials and register the device. When it finishes it
prints a QR code that installs the build.

Then run the JS from your machine against it:

```bash
npx expo start --dev-client
```

`eas.json` sets `EXPO_PUBLIC_SYNC_URL` for every profile, so builds reach the
deployed service without a local `.env`.

**You rebuild only when native code changes** — adding a package with a native
module, or editing `app.json`'s plugins or entitlements. JS and content changes
reload instantly, exactly like Expo Go.

**The free alternative:** with Xcode installed, `npx expo run:ios --device`
sideloads using a free Apple ID. The build expires after 7 days and has to be
reinstalled, but it costs nothing. Xcode is a ~7 GB download.

## Which variable goes where

Putting a key in the wrong service is the easy mistake here, so:

### Railway — `stockiq-sync`

| Variable | Status | Notes |
|---|---|---|
| `DATABASE_URL` | **set** | A `${{Postgres.DATABASE_URL}}` reference, not a copied value |
| `APPLE_BUNDLE_ID` | **set** | `com.stockiq.app`. Apple sign-in is refused without it |
| `RESEND_API_KEY` | **you add** | Enables email sign-in |
| `EMAIL_FROM` | **you add** | Must be at your verified domain |
| `PORT` | automatic | Injected by Railway |
| `APP_LINK_BASE` | optional | Deep-link base in the sign-in email. Defaults to `stockiq://sign-in` |
| `PG_POOL_MAX` | optional | Defaults to 10 |
| `EMAIL_TRANSPORT` | **do not set** | `console` prints codes to the log instead of sending |

So: **two variables, `RESEND_API_KEY` and `EMAIL_FROM`.** Nothing else is
needed, and everything else is already set.

> **`ANTHROPIC_API_KEY` does not go on Railway.** It belongs to the Cloudflare
> Worker, set with `wrangler secret put`. The sync service never calls Claude,
> so a key here would sit unused in an extra place it could leak from.

> **Never set `APPLE_ISSUER` or `APPLE_JWKS_URL` in production.** They exist so
> tests can point verification at a local key pair, and setting them lets
> anyone serve their own signing key and forge a sign-in for any account. The
> server now ignores both unless `ALLOW_APPLE_TEST_ISSUER=1` is also set, and
> logs loudly when it does — but do not set them.

### Cloudflare — `stockiq-ask`

| Variable | How |
|---|---|
| `ANTHROPIC_API_KEY` | `npx wrangler secret put ANTHROPIC_API_KEY` |
| `RATE_LIMIT` (KV) | `npm run setup` |
| `DAILY_LIMIT` | Already in `wrangler.toml`, defaults to 100 |

### The app — `.env` / `eas.json`

| Variable | Value |
|---|---|
| `EXPO_PUBLIC_SYNC_URL` | `https://stockiq-sync-production.up.railway.app` |
| `EXPO_PUBLIC_ASK_PROXY_URL` | Empty until the Worker is deployed |
| `EXPO_PUBLIC_SPEECH_URL` | Public origin containing `/speech/`; required by native narration |

Both are inlined into the bundle and readable by anyone with the app, so only
public URLs belong there.

## 4. Point the app at deployed services

Put the two variables in `.env` (git-ignored) or your EAS build profile:

```
EXPO_PUBLIC_SYNC_URL=https://<railway-service>.up.railway.app
EXPO_PUBLIC_ASK_PROXY_URL=https://stockiq-ask.<sub>.workers.dev
EXPO_PUBLIC_SPEECH_URL=https://stockiq-delta.vercel.app
```

`EXPO_PUBLIC_*` values are **inlined into the bundle** and are readable by
anyone with the app. That is fine for all three — they are public endpoint
URLs. Never put a key or token in an `EXPO_PUBLIC_` variable; that would undo
the entire reason the proxy exists.

---

## Verifying locally before you deploy

The sync service and its tests run entirely on your machine:

```bash
# Postgres
docker run -d --name stockiq-pg \
  -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=stockiq \
  -p 55437:5432 postgres:16-alpine

cd server
npm install
DATABASE_URL="postgres://postgres:dev@localhost:55437/stockiq" npm run migrate
DATABASE_URL="postgres://postgres:dev@localhost:55437/stockiq" PORT=8787 npm start
```

In another shell:

```bash
cd server && npm run test:sync     # protocol: merge rules, tombstones, isolation
cd ..     && npm run test:sync-cycle   # client: push/apply/clear ordering, races
```

Both suites were run against real Postgres and passed. They are the reason to
believe the merge rule is right; typecheck proves nothing about data loss.

Tear down with `docker rm -f stockiq-pg`.

---

## Deliberately not built

**Payments.** Not until the app is proven — your call, and the right one.
There is no RevenueCat wiring, no paywall, and no store configuration.

**Accounts and device linking.** Sync is scoped to one anonymous device id, so
today it is *backup*, not multi-device. Linking a second device needs a
pairing flow, and that is the point at which real auth should arrive rather
than being bolted on afterwards.

**A retention job.** Rows are never deleted server-side. `reset()` in the app
abandons the owner id rather than deleting remote data, so a
`DELETE FROM records WHERE ...` job is needed before this handles anyone's
data but your own.
