/**
 * Deployment configuration.
 *
 * These are read from `EXPO_PUBLIC_*` environment variables, which Expo
 * inlines into the bundle at build time. That is the correct mechanism for
 * these two values precisely BECAUSE they are not secrets — they are public
 * endpoint URLs, and anyone with the app can see them either way.
 *
 * Nothing secret may ever be added to this file. An API key inlined here
 * would be extractable from the shipped bundle; that is exactly the problem
 * the ASK proxy exists to solve, and putting a key here would undo it.
 *
 * Both default to empty, and empty means "not deployed": the app runs fully
 * offline on the local store, and ASK falls back to the bring-your-own-key
 * path. Nothing here is required for the app to work.
 */

const trim = (value: string | undefined): string => (value ?? '').trim().replace(/\/$/, '');

/** Railway sync service, e.g. https://stockiq-sync.up.railway.app */
export const SYNC_URL = trim(process.env.EXPO_PUBLIC_SYNC_URL);

/** Cloudflare Worker ASK proxy, e.g. https://stockiq-ask.<sub>.workers.dev */
export const ASK_PROXY_URL = trim(process.env.EXPO_PUBLIC_ASK_PROXY_URL);

/**
 * Public origin serving generated narration, without a trailing slash.
 * Web uses its own origin; native needs this because `public/` belongs to the
 * web deployment rather than the native bundle.
 */
export const SPEECH_URL = trim(process.env.EXPO_PUBLIC_SPEECH_URL);

/**
 * Public website origin, without a trailing slash. Used for links that must
 * resolve outside the app — the legal pages live in the web deploy's
 * `public/legal/`, so a native build needs an absolute URL to reach them.
 * Defaults to the production web deploy when unset.
 */
export const SITE_URL = trim(process.env.EXPO_PUBLIC_SITE_URL) || 'https://stockiq-delta.vercel.app';

export const isSyncConfigured = (): boolean => SYNC_URL.length > 0;
export const isAskProxyConfigured = (): boolean => ASK_PROXY_URL.length > 0;
