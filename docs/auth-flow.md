# StockIQ account-entry flow

## Decision

Use one **Continue with email** flow for both account creation and account
recovery. Do not ask the learner to choose “sign up” or “sign in”: both paths
require the same email proof, and the server already knows whether the verified
address belongs to an existing account.

Keep **Continue without an account** as an explicit secondary path. Guest work
is local-first and can be secured later without losing progress.

## State flow

| Starting state | Successful email verification | Destination |
| --- | --- | --- |
| Returning account | Restore and merge the synced profile | Learn home |
| New account | Secure the current local profile | Course selection, then disclaimer |
| Guest with progress | Attach email and preserve local work | Learn home |
| Different person on a claimed device | Create a separate account; do not upload the previous person's rows | Course selection |

## UX rules

- Ask for email, then show a separate six-digit-code state.
- Keep the verified email visible and provide **Use a different email**.
- Support one-time-code autofill and numeric keyboards.
- Disable resend briefly and show a countdown.
- Keep auth errors generic so responses do not reveal whether an account exists.
- After verification, route immediately; do not strand the learner on an
  account-settings screen.
- Keep sign-out, linked-device management, and recovery controls in Settings,
  separate from initial authentication.

## Security boundary

The existing service hashes codes, makes them single-use, expires them, caps
guesses, rate-limits sends, and answers known and unknown addresses identically.
That matches OWASP's account-enumeration guidance and the retry/rate-limit
recommendations used by verification providers.

Email codes are appropriate here because StockIQ is an educational product and
does not hold money or execute trades. NIST does not treat email as a suitable
out-of-band authenticator for higher-assurance authentication. If StockIQ later
adds brokerage, payments, or other high-value actions, those actions should use
passkeys or another phishing-resistant authenticator rather than relying on
email alone.

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Email Validation and Verification Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html)
- [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html)
- [Twilio verification best practices](https://www.twilio.com/docs/verify/developer-best-practices)
