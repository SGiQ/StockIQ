-- Sign in with Apple.
--
-- This exists to solve exactly one problem: without it there is no account
-- recovery. Device secrets live only in keychains, so losing every linked
-- device made the data permanently unreachable. An Apple identity is
-- something a person can re-prove ownership of on a new phone.
--
-- The table holds ONE column of Apple-derived data: the `sub`, which is an
-- opaque per-app user id. Apple also offers email and name on first
-- authorisation, and both are deliberately discarded — storing them would
-- turn an account that holds nothing but lesson progress into one holding
-- personal data.

CREATE TABLE IF NOT EXISTS apple_identities (
  -- Apple's stable subject identifier. Unique per (user, app), so it cannot
  -- be correlated with the same person's identity in another app.
  sub        TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS apple_identities_account
  ON apple_identities (account_id);

INSERT INTO schema_migrations (version) VALUES ('0003_apple_identities')
  ON CONFLICT (version) DO NOTHING;
