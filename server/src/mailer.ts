/**
 * Email delivery.
 *
 * Railway, Vercel and Cloudflare all do not send mail, so a provider is
 * unavoidable. Resend is one HTTP call with no SDK, which is the whole
 * integration.
 *
 * ── Why misconfiguration is loud ──────────────────────────────────────────
 * An earlier version silently fell back to printing codes when
 * `RESEND_API_KEY` was absent. Locally that is exactly right — it is what
 * makes the sign-in flow testable with no provider account. In production it
 * is the worst possible behaviour: every health check passes, sign-in appears
 * to work, and every code goes only to the log where the person signing in
 * cannot see it.
 *
 * So printing now requires saying so out loud (`EMAIL_TRANSPORT=console`).
 * With neither set, the email endpoints refuse rather than pretend — and only
 * those endpoints, because a missing mail key is no reason to take sync down.
 */

export interface SentMessage {
  to: string;
  subject: string;
  text: string;
}

export class MailNotConfiguredError extends Error {}

/** Distinguishes the failures worth acting on differently. */
export type MailFailureKind =
  | 'invalid_key'
  | 'domain_not_verified'
  | 'rate_limited'
  | 'rejected'
  | 'unknown';

export class MailDeliveryError extends Error {
  constructor(
    message: string,
    readonly kind: MailFailureKind,
  ) {
    super(message);
    this.name = 'MailDeliveryError';
  }
}

export interface Mailer {
  send(message: SentMessage): Promise<void>;
  /** Named for logs and for the preflight's verdict. */
  readonly name: string;
}

const FROM = process.env.EMAIL_FROM ?? '';

class ConsoleMailer implements Mailer {
  readonly name = 'console';
  async send(message: SentMessage): Promise<void> {
    console.log(
      `\n──── email (EMAIL_TRANSPORT=console — NOT sent) ────\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n───────────────────────────────────────────────────\n`,
    );
  }
}

/** Refuses, so a misconfigured deployment cannot look like a working one. */
class UnconfiguredMailer implements Mailer {
  readonly name = 'unconfigured';
  async send(): Promise<void> {
    throw new MailNotConfiguredError(
      'Email is not configured: set RESEND_API_KEY (or EMAIL_TRANSPORT=console for local development).',
    );
  }
}

class ResendMailer implements Mailer {
  readonly name = 'resend';
  constructor(private readonly apiKey: string) {}

  async send(message: SentMessage): Promise<void> {
    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: FROM,
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }),
      });
    } catch (error) {
      throw new MailDeliveryError(
        error instanceof Error ? error.message : 'could not reach Resend',
        'unknown',
      );
    }

    if (response.ok) return;

    const body = (await response.json().catch(() => ({}))) as {
      name?: string;
      message?: string;
    };

    // Classified from OBSERVED behaviour, because the published reference is
    // wrong here. It documents an invalid key as 403 with
    // `name: "invalid_api_key"`; the API actually returns 401 with
    // `name: "validation_error"` and the detail only in `message`. The
    // documented shape is kept as a fallback in case it is ever corrected.
    //
    // Worth separating because a bad key and an unverified domain are the two
    // most likely first-run failures and the remedies are unrelated — one is
    // a wrong secret, the other is missing DNS.
    const detail = body.message ?? '';
    const kind: MailFailureKind =
      response.status === 429
        ? 'rate_limited'
        : response.status === 401 ||
            body.name === 'invalid_api_key' ||
            /api key/i.test(detail)
          ? 'invalid_key'
          : /not verified|verify your domain/i.test(detail)
            ? 'domain_not_verified'
            : response.status === 400 || response.status === 403
              ? 'rejected'
              : 'unknown';

    throw new MailDeliveryError(
      body.message ?? `Resend returned ${response.status}`,
      kind,
    );
  }
}

function resolveMailer(): Mailer {
  if (process.env.RESEND_API_KEY) {
    if (!FROM) {
      // Resend requires `from`, and a missing one fails every send with a
      // validation error that reads like a code bug. Catch it at startup.
      console.error('✖  RESEND_API_KEY is set but EMAIL_FROM is not. Email will fail.');
      return new UnconfiguredMailer();
    }
    return new ResendMailer(process.env.RESEND_API_KEY);
  }

  if (process.env.EMAIL_TRANSPORT === 'console') return new ConsoleMailer();

  return new UnconfiguredMailer();
}

export const mailer: Mailer = resolveMailer();

/** Actionable guidance for the two failures people actually hit. */
export function explainMailFailure(error: unknown): string {
  if (error instanceof MailNotConfiguredError) return error.message;
  if (!(error instanceof MailDeliveryError)) {
    return error instanceof Error ? error.message : 'unknown email failure';
  }
  switch (error.kind) {
    case 'invalid_key':
      return 'Resend rejected the API key. Check RESEND_API_KEY.';
    case 'domain_not_verified':
      return `Resend has not verified the sending domain in EMAIL_FROM ("${FROM}"). Add the SPF and DKIM records it shows for that domain, or send from a domain that is already verified.`;
    case 'rate_limited':
      return 'Resend is rate limiting this key. Slow down or request a higher limit.';
    case 'rejected':
      return `Resend rejected the request: ${error.message}`;
    default:
      return `Email delivery failed: ${error.message}`;
  }
}

/**
 * The sign-in email.
 *
 * The code is stated plainly and first, because it has to survive being read
 * on a laptop and typed on a phone. The link is a same-device convenience and
 * is deliberately secondary.
 */
export function signInMessage(to: string, code: string, minutes: number): SentMessage {
  const deepLink = `${process.env.APP_LINK_BASE ?? 'stockiq://sign-in'}?code=${code}`;
  return {
    to,
    subject: `${code} is your StockiQ sign-in code`,
    text: [
      `Your StockiQ sign-in code is:`,
      ``,
      `    ${code}`,
      ``,
      `Enter it in the app. It expires in ${minutes} minutes and can be used once.`,
      ``,
      `On the same phone, you can tap this instead:`,
      deepLink,
      ``,
      `If you did not ask to sign in, ignore this email — nothing has changed,`,
      `and whoever requested it cannot get in without this code.`,
    ].join('\n'),
  };
}

export function newSignupMessage(userEmail: string): SentMessage {
  return {
    to: 'contact@sgiq.ai',
    subject: 'New StockiQ user signup',
    text: `A new user has signed up with email: ${userEmail}`,
  };
}
