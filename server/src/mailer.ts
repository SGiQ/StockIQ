/**
 * Email delivery.
 *
 * Two transports behind one interface:
 *
 * - **resend** when `RESEND_API_KEY` is set. Railway, Vercel and Cloudflare
 *   none of them send mail, so a provider is unavoidable; Resend is a small
 *   HTTP call with no SDK.
 * - **console** otherwise, which prints the message instead of sending it.
 *
 * The console transport is not a stub for its own sake — it is what makes the
 * entire sign-in flow testable end to end with no provider account, no API
 * key, and no mail actually leaving the machine. Tests read the code off it.
 *
 * Choosing by the presence of the key means a misconfigured deployment
 * degrades to "codes appear only in the logs" rather than to a crash on the
 * sign-in path. That is loud in the logs and harmless to data.
 */

export interface SentMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(message: SentMessage): Promise<void>;
}

const FROM = process.env.EMAIL_FROM ?? 'StockIQ <login@example.invalid>';

class ConsoleMailer implements Mailer {
  async send(message: SentMessage): Promise<void> {
    console.log(
      `\n──── email (not sent: no RESEND_API_KEY) ────\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n────────────────────────────────────────────\n`,
    );
  }
}

class ResendMailer implements Mailer {
  constructor(private readonly apiKey: string) {}

  async send(message: SentMessage): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
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

    if (!response.ok) {
      // The body can echo the address and provider detail, so it is logged
      // rather than raised to the caller — and the caller must not tell the
      // requester whether delivery worked anyway.
      console.error('resend failed', response.status, await response.text().catch(() => ''));
      throw new Error('email delivery failed');
    }
  }
}

export const mailer: Mailer = process.env.RESEND_API_KEY
  ? new ResendMailer(process.env.RESEND_API_KEY)
  : new ConsoleMailer();

/**
 * The sign-in email.
 *
 * The code is the primary mechanism and is stated plainly, because it has to
 * survive being read on a laptop and typed on a phone. The link is a
 * same-device convenience and is secondary by design.
 */
export function signInMessage(to: string, code: string, minutes: number): SentMessage {
  const deepLink = `${process.env.APP_LINK_BASE ?? 'stockiq://sign-in'}?code=${code}`;
  return {
    to,
    subject: `${code} is your StockIQ sign-in code`,
    text: [
      `Your StockIQ sign-in code is:`,
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
