# iOS build & App Store checklist

Everything that can be done without an Apple Developer account is done and
verified. This is the ordered path from here to a submitted app. Steps marked
**(you)** need your accounts/credentials; I can drive the rest.

## Already prepped & verified (no action needed)
- **Bundle id** `com.stockiq.app`, name "StockiQ", version 1.0.0, portrait, light.
- **Icons** (iOS + Android adaptive), **splash** now shows the logo (fixed).
- **Sign in with Apple** entitlement wired (`usesAppleSignIn`) — confirmed present
  in the generated `.entitlements`.
- **iOS privacy manifest** (`ios.privacyManifests` in app.json) — generates a
  correct `PrivacyInfo.xcprivacy`: collects Email, User ID, Product Interaction
  (all "linked", none "tracking"), plus required-reason API declarations
  (UserDefaults CA92.1, FileTimestamp C617.1). Tracking = false.
- **Export compliance**: `ITSAppUsesNonExemptEncryption = false` (only HTTPS /
  standard crypto), so no encryption question on every TestFlight upload.
- **EAS build profiles** (`eas.json`): development / preview / production, each
  carrying the public env URLs (sync, speech, site). Production auto-increments
  the build number.
- **Config is healthy**: `npx expo-doctor` → 20/20, `npx expo prebuild -p ios`
  succeeds cleanly (managed workflow — no `ios/` is committed; EAS prebuilds in
  the cloud).

## One-time setup
1. **(you)** Enrol in the **Apple Developer Program** ($99/yr) →
   https://developer.apple.com/programs/ . An Expo account (free) is also needed.
2. `eas login` **(you — your Expo account)**.
3. `eas init` **(you)** — links the project and writes `extra.eas.projectId`
   into app.json. This is the one config value I could not add for you because it
   creates a project on your Expo account. After this, everything else is
   scriptable.
4. Sign in with Apple capability: EAS enables it on the App ID automatically the
   first time you build with credentials, or you can toggle it manually in the
   Apple Developer portal for `com.stockiq.app`.

## Build
5. Internal test build first:
   `eas build --platform ios --profile preview`
   EAS will prompt to sign in to Apple, generate the certificate + provisioning
   profile, and register the app. Install the result on your device by link.
6. This is the first time the app runs on **real iOS hardware** — verify the
   standing unknowns: swipe/tap gestures in the lesson player, native narration
   audio, Sign in with Apple, and that the splash shows the logo.
7. When it feels right: `eas build --platform ios --profile production`.

## Submit & App Store Connect **(you, with my help on metadata)**
8. `eas submit --platform ios` (needs an App Store Connect API key or your Apple
   ID) — uploads the production build to TestFlight / App Store Connect.
9. In App Store Connect, fill the listing:
   - **Category**: Education (secondary: Finance).
   - **Privacy policy URL**: `https://stockiq-delta.vercel.app/legal/privacy.html`
   - **Privacy questionnaire** (must match the manifest above):
     - Email Address — collected, **linked** to identity, **not** used for
       tracking, purpose *App Functionality*.
     - User ID (the device/account identifier) — linked, not tracking, *App
       Functionality*.
     - Product Interaction (lesson-completion events) — linked, not tracking,
       *App Functionality* + *Analytics*.
     - No other data types. Data is **not** used to track you across apps.
   - **Age rating** questionnaire.
   - **Screenshots** for the required iPhone sizes (6.7" and 6.5").
   - **Support URL** (a page or mailto), description, keywords.
10. **Account deletion for review**: reviewers check this. The path is
    *Settings → Account & sync → Delete account → Delete everything permanently*.
    Note it in the "Notes for review" field.
11. **Review notes**: mention the app is educational and not financial advice,
    that it works fully in guest mode (no account needed to review), and that
    sign-in is by email code or Sign in with Apple.

## Still worth doing before or soon after launch (not blockers)
- Have the privacy policy / terms reviewed by counsel (they're an accurate draft).
- Decide ASK: deploy the Cloudflare Worker (`workers/ask`, see docs/deployment.md)
  so the tutor uses the server-side key, or ship bring-your-own-key.
- A scheduled cleanup job for orphaned empty accounts (retention housekeeping).
