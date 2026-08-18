/**
 * Sends one real email and reports a plain verdict.
 *
 * Exists so the first evidence that delivery works is not somebody failing to
 * sign in. Every likely first-run failure — wrong key, unverified domain,
 * missing EMAIL_FROM — surfaces here with the specific remedy rather than as
 * a silent non-arrival.
 *
 * Run:
 *   RESEND_API_KEY=re_... EMAIL_FROM="StockiQ <login@yourdomain>" \
 *     npm run check:email -- you@example.com
 */
import { explainMailFailure, mailer } from './mailer.ts';

const to = process.argv[2];

if (!to || !/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(to)) {
  console.error('Usage: npm run check:email -- you@example.com');
  process.exit(1);
}

console.log(`transport:  ${mailer.name}`);
console.log(`from:       ${process.env.EMAIL_FROM ?? '(unset)'}`);
console.log(`to:         ${to}\n`);

if (mailer.name === 'unconfigured') {
  console.error('✖  Email is not configured.');
  console.error('   Set RESEND_API_KEY and EMAIL_FROM, then run this again.');
  process.exit(1);
}

if (mailer.name === 'console') {
  console.warn('⚠  EMAIL_TRANSPORT=console — this prints instead of sending.');
  console.warn('   Fine locally; it means nothing about real delivery.\n');
}

const stamp = Math.floor(Date.now() / 1000)
  .toString(36)
  .toUpperCase();

try {
  await mailer.send({
    to,
    subject: `StockiQ delivery test ${stamp}`,
    text: [
      `This is a one-off test from the StockiQ sync service.`,
      ``,
      `If it arrived, sign-in codes will arrive too.`,
      ``,
      `Reference: ${stamp}`,
    ].join('\n'),
  });

  if (mailer.name === 'console') {
    // Saying "accepted" here would be the exact lie this script exists to
    // prevent: nothing was sent, and nothing has been proven about delivery.
    console.log('✔  Printed above. Nothing was sent, so this proves nothing about delivery.');
    console.log('   Set RESEND_API_KEY and EMAIL_FROM to test for real.');
  } else {
    console.log('✔  Resend accepted the message.');
    console.log(`   Check ${to} — including spam — for "StockiQ delivery test ${stamp}".`);
    console.log('   Accepted is not the same as delivered: if it never lands,');
    console.log("   the Resend dashboard's Emails tab shows what happened to it.");
  }
} catch (error) {
  console.error('✖  Send failed.');
  console.error(`   ${explainMailFailure(error)}`);
  process.exit(1);
}
