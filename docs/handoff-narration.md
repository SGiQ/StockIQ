# Handoff — Lesson narration (OpenAI text-to-speech)

**Date:** 2026-07-31
**Feature:** Read-aloud narration on every lesson card, Imprint-style. Male/female
voice choice, toggle on/off. Voices generated with OpenAI TTS.
**Status:** Client and hosting implementation complete on 2026-07-31. Text
extraction, generation, migrated/synced preferences, Expo Audio playback,
player wiring, and reachable settings UI are implemented. All 1,110 clips were
rendered and uploaded to the public `stockiq-narration` Cloudflare R2 bucket.

---

## The decisions already made (with the user)

1. **Build-time pre-render, not runtime.** A script calls OpenAI once per card and
   writes MP3s that ship as static files. Rationale: content is static, so the
   OpenAI key never leaves the author's machine (a client app can't hold a secret —
   same wall ASK hit, which is why `workers/ask/` exists and is still undeployed).
   Playback is then instant + offline, and every clip is QA-able before users hear it.
2. **Narrate headline + body only.** Skip quiz options, word banks, and answer
   explanations so audio never spoils an interactive card. The *question* on a quiz
   card IS read (sets the problem without giving the answer).
3. **Two voices:** `onyx` (male) / `nova` (female) — closest to a documentary
   narrator. Model `gpt-4o-mini-tts`. Labelled by user choice (male/female), not by
   vendor voice name, so voices can be swapped later without touching stored prefs.

## Real numbers (measured, not estimated)

- 555 speakable cards across lessons + book guides + strategy guides
- 1110 clips (both voices), ~231k chars total
- **~$2.78 one-time** for the whole library in both voices (`--check` confirmed)
- **250 MB measured on disk for both voices**

---

## What's DONE and verified

### `src/content/narration.ts` (new, untracked)
`narrationTextFor(card): string | null` — narration-specific text projection.
- Exhaustive `switch` over all 7 card types with a `never` guard (compile error if a
  card type is added without deciding how it sounds — mirrors CardRenderer).
- NOT `toPlainText`: that renders a fill-blank slot as `____`, which TTS reads as
  underscores. This maps the blank to the spoken word "blank" so the sentence
  survives. The two projections stay separate on purpose.
- Segments joined with `.` for TTS prosody (a headline running straight into the
  body in one breath is the #1 thing that sounds synthetic).
- **Verified:** ran over all real content — all 7 card types read naturally,
  fill-blank says "…is called blank", quiz cards speak only the question. 555 cards,
  115,729 chars single-voice.

### `scripts/generate-speech.ts` (new, untracked) + `npm run gen:speech`
- Content-addressed output: filename = sha256(model+voice+instructions+text)[:16].
  Editing one card re-renders only that card; shared lines share a file; re-run with
  no change costs nothing.
- Reads `OPENAI_API_KEY` from env ONLY. **Never** hardcoded, never to be pasted in
  chat (a pasted key lives in the transcript forever — established constraint).
- `--check` flag: dry-run, no key, no API calls — prints counts + cost.
- Fails loudly without a key (matches mailer precedent), pointing at `.env`.
- Prunes orphaned clips (copy edits leave old audio behind).
- Emits `src/content/speech.generated.ts` — `SPEECH_MANIFEST: Record<cardKey,
  Record<voice, hash>>`. Card key is deck-qualified: `lesson:course/lesson#cardId`,
  `book:id#cardId`, `strategy:id#cardId`.
- Writes MP3s to `public/speech/{voice}/{hash}.mp3`.
- **Verified:** `--check` → 1110 clips, $2.78. Loud-fail path confirmed. `.env`
  confirmed git-ignored + untracked (so the error message doesn't lie).

### `vercel.json` (modified, uncommitted)
- Added `speech/` to the SPA rewrite negative-lookahead so `/speech/*.mp3` serves the
  file instead of returning `index.html`. **Verified** the regex against 9 real paths.
- Added a 1-year immutable cache header for `/speech/(.*)` (safe — content-addressed).
- **Also confirmed empirically:** `public/` IS copied to the web export root by
  `expo export --platform web` (tested with a probe file, then removed).

---

## Client tasks #62–#65 — complete

### #62 — Narration prefs on the profile (DONE)
Add to `UserProfile` (`src/store/repository.ts:111`):
```ts
narrationEnabled: boolean;      // default false — off until audio exists
narrationVoice: 'male' | 'female';  // default 'female'
```
- `UserProfile extends Syncable`, so the pref **syncs across devices for free**.
- Update BOTH default constructors (they're identical `defaultProfile()`):
  - `src/store/local/LocalRepository.ts:75`
  - `src/store/sqlite/SqliteRepository.ts:78`
- **MIGRATION — do not skip.** Existing stored profiles (local JSON + SQLite rows +
  synced blobs) won't have these fields. Was mid-checking how a profile is read back
  when this handoff was requested. Must confirm reads apply defaults for missing keys
  rather than returning `undefined`. Check `LocalRepository`/`SqliteRepository`
  profile.get() and any row→object hydration. The SQLite store likely stores the
  profile as a JSON blob in a column (verify), in which case spreading over
  `defaultProfile()` on read is the fix.

### #63 — Playback service on `expo-audio` (DONE)
- `npx expo install expo-audio` (SDK 57 — expo-av is superseded).
- Confirmed API: `useAudioPlayer(source, {downloadFirst:true})`,
  `useAudioPlayerStatus(player)` → `.playing` / `.didJustFinish`; methods
  `.play()/.pause()/.seekTo()`; `useAudioPlayer` auto-releases on unmount.
- Wrap so the player can: speak current card, stop cleanly on card change + on exit,
  never leak. **Degrade silently when a card has no audio yet** (manifest miss).
- URL: `${base}/speech/${voice}/${hash}.mp3`. Base is same-origin on web; for native
  it must be the deployed origin (Vercel) — probably a new `EXPO_PUBLIC_SPEECH_URL`
  or reuse the deployed web origin. Decide + document.
- **Native caveat to call out:** SQLite/haptics/native-gesture differ from web; the
  web build can't prove native audio. Flag as unverified on device (consistent with
  the standing "nothing has run on real iOS hardware" gap).

### #64 — Wire into `LessonPlayer` + in-player mute (DONE)
- `src/components/player/LessonPlayer.tsx`. Speak current card when enabled; stop on
  advance/back/exit. Card key must match the manifest's deck-qualified scheme — the
  player needs to know its deck id (lesson vs book vs strategy). Check what the player
  is handed; strategy/book guides reuse this player.
- Add a speaker toggle to the existing flag/heart pill (`PlayerChrome` /
  `ActionPill`). **Must not** interfere with tap zones or swipe (this player has a
  documented history of gesture/overflow bugs — see recent commits `4ffce5f`,
  `c0d47e7`). Verify by driving it, not by reasoning.

### #65 — Settings UI + end-to-end verify (CLIENT DONE; REAL AUDIO PENDING)
- Narration on/off + male/female picker. Settings screens live in `app/settings/`
  (`ask-key.tsx`, `devices.tsx` as patterns). May also want it reachable from
  onboarding, but not required.
- **Verify by driving a real lesson in-browser:** audio element loads, plays, switches
  voice, stops on card change, respects the toggle. Use the preview/browser tools.

---

## Gotchas / constraints that will bite

- **97MB of audio.** `public/speech` is currently NOT git-ignored → it'd be committed.
  We *just* rewrote history to shed 5.6MB of screenshots (commit `f74ed2f`), so think
  before committing 97MB of MP3s. Options: (a) git-ignore `public/speech` and rely on
  Vercel building it — but generation needs the OpenAI key in Vercel's build env,
  which reintroduces the key-hosting problem; (b) commit it (simple, but bloats repo
  permanently); (c) host audio separately (R2/Cloudflare) and point the client at it.
  **This is a real decision — surface it to the user, don't pick silently.** Leaning
  (b) or (c); (a) undermines the whole build-time rationale.
- No secrets in `EXPO_PUBLIC_*` (inlined into the client bundle). Only public URLs.
- OpenAI key is OpenAI's only — never goes to Railway/Cloudflare/Vercel unless the
  hosting decision above explicitly requires it, and then only in a build env.
- `AGENTS.md`: read the exact SDK 57 docs before writing Expo code. Already did for
  expo-audio + OpenAI TTS (notes above).

## State when the original handoff was written (historical)

- Branch `main`, HEAD `c0d47e7`, clean history (screenshots purged).
- **Uncommitted:** `M package.json` (gen:speech script), `M vercel.json` (speech
  rewrite+headers), `?? scripts/generate-speech.ts`, `?? src/content/narration.ts`.
- Nothing for this feature is committed yet. `src/content/speech.generated.ts` and
  `public/speech/` don't exist yet (never ran real generation — no key used).
- Live site: https://stockiq-delta.vercel.app (does not yet have narration).

## Remaining owner steps

1. Listen to representative clips from all seven card types in both voices.
2. After future content edits, run `npm run gen:speech`, then
   `npm run upload:speech`, and commit the regenerated manifest.
3. Verify native audio on real iOS hardware when native testing resumes.
