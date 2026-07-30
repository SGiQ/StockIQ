# Deploying StockIQ

Nothing in this document has been run. Every step below needs an account,
a credential, or a billing relationship, and those are yours to create — I
can write the code and the config, but I do not create accounts, enter API
keys, or deploy on your behalf.

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
| Vercel | *unused* | No honest job for it yet. It is the right home for a marketing or download page when there is one — it is not being used as filler |

---

## 1. Sync service on Railway

```bash
railway login
railway init                     # or: railway link, for an existing project
railway add --database postgres  # provisions Postgres and sets DATABASE_URL
```

Point the service at the `server/` directory (Railway → Settings → Root
Directory → `server`). Railway runs `npm start`, which is
`tsx src/index.ts`; `PORT` is injected for you.

Apply the schema once:

```bash
railway run npm run migrate --workspace server   # or run it inside the service shell
```

Then check it:

```bash
curl https://<your-service>.up.railway.app/health   # {"ok":true}
```

Put that base URL in the app's environment:

```
EXPO_PUBLIC_SYNC_URL=https://<your-service>.up.railway.app
```

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

Set up delivery:

```bash
# Railway, Vercel and Cloudflare all do not send mail, so this is a new
# provider. Resend's free tier is generous; Postmark works the same way.
RESEND_API_KEY=...
EMAIL_FROM="StockIQ <login@yourdomain>"
```

**Without `RESEND_API_KEY` the server prints codes to its log instead of
sending them.** That is deliberate — it is what makes the whole flow testable
locally with no provider account — but it means a deployment that forgets the
key will appear to work while every code goes only to the logs. Check the logs
after the first real sign-in.

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

```bash
cd workers/ask
npm install

# Cost guard. The Worker REFUSES to serve without this binding, because an
# uncapped endpoint that spends money per call is a bill waiting to happen.
npx wrangler kv namespace create RATE_LIMIT
# paste the returned id into wrangler.toml

# Write-only; never lands in the repo or the deployed source.
npx wrangler secret put ANTHROPIC_API_KEY

npx wrangler deploy
```

Then:

```
EXPO_PUBLIC_ASK_PROXY_URL=https://stockiq-ask.<your-subdomain>.workers.dev
```

Adjust `DAILY_LIMIT` in `wrangler.toml` to taste — it defaults to 100
questions per owner per day. The counter uses KV, which has no atomic
increment, so under heavy concurrency from one caller the count can drift by a
few. It is a cost guard, not a security control.

---

## 3. Point the app at both

Put the two variables in `.env` (git-ignored) or your EAS build profile:

```
EXPO_PUBLIC_SYNC_URL=https://<railway-service>.up.railway.app
EXPO_PUBLIC_ASK_PROXY_URL=https://stockiq-ask.<sub>.workers.dev
```

`EXPO_PUBLIC_*` values are **inlined into the bundle** and are readable by
anyone with the app. That is fine for these two — they are public endpoint
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
