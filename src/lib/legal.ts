import { Linking, Platform } from 'react-native';
import { SITE_URL } from '@/config';

/**
 * The app's legal documents, hosted as static pages in the web deploy's
 * `public/legal/`. Apple requires a reachable privacy-policy URL and in-app
 * access to it; these are that single source of truth for both.
 */
export type LegalDoc = 'privacy' | 'terms';

/**
 * On web, a same-origin relative path always resolves regardless of which
 * domain the app is served from. On native, `public/` is not part of the
 * bundle, so the page must be reached at the deployed website origin.
 */
export function legalUrl(doc: LegalDoc): string {
  const path = `/legal/${doc}.html`;
  return Platform.OS === 'web' ? path : `${SITE_URL}${path}`;
}

/** Opens a legal page in the browser (a new tab on web, Safari on native). */
export function openLegal(doc: LegalDoc): void {
  void Linking.openURL(legalUrl(doc));
}
