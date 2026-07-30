/**
 * ASK composition root.
 *
 * Phase 4 said the proxy would differ from the bring-your-own-key path "by a
 * URL and a header and nothing else moves". This file is that claim being
 * cashed in: one ternary, and no screen, sheet, or component changed.
 *
 * **Proxy when deployed.** The Cloudflare Worker holds the Anthropic key, so
 * nothing secret ships in the bundle and the not-advice system prompt cannot
 * be stripped by a modified client. This is the only mode fit to ship
 * publicly.
 *
 * **Bring-your-own-key otherwise.** The learner pastes their own key into
 * Settings; it lives in the device keychain and is spent on their own
 * credits. Fine for personal use, and it keeps ASK working before anything is
 * deployed — an undeployed app is not a broken app.
 */
import { isAskProxyConfigured } from '@/config';
import { BYOKeyAskService } from './BYOKeyAskService';
import { ProxyAskService } from './ProxyAskService';
import type { AskService } from './types';

export const askService: AskService = isAskProxyConfigured()
  ? new ProxyAskService()
  : new BYOKeyAskService();

/**
 * True when the key lives on the device and Settings should offer to manage
 * it. With the proxy there is no on-device key, so that UI has nothing to do.
 */
export const usesDeviceKey = (): boolean => !isAskProxyConfigured();

export { AskError, SUGGESTED_QUESTIONS } from './types';
export type { AskContext, AskFailure, AskService } from './types';
