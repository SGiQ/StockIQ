-- Generalise identities, and add the email challenge table.
--
-- 0003 created `apple_identities`. Adding email as a second parallel table
-- would mean duplicating the account-mapping logic — including the subtle
-- "second person on a shared phone" case — once per provider, which is
-- exactly how those two copies drift apart. One table keyed by
-- (provider, subject) keeps that logic in a single place.

CREATE TABLE IF NOT EXISTS identities (
  -- 'apple' | 'email'. Not an enum: adding a provider should be a code
  -- change, not a migration.
  provider   TEXT   NOT NULL,
  -- Apple's `sub`, or the normalised email address.
  subject    TEXT   NOT NULL,
  account_id TEXT   NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (provider, subject)
);

CREATE INDEX IF NOT EXISTS identities_account ON identities (account_id);

-- Carry over anything 0003 recorded.
INSERT INTO identities (provider, subject, account_id, created_at)
SELECT 'apple', sub, account_id, created_at FROM apple_identities
  ON CONFLICT (provider, subject) DO NOTHING;

DROP TABLE IF EXISTS apple_identities;

-- Email sign-in challenges.
--
-- `token_hash`, never the code itself. A database leak should not hand over
-- live sign-in codes, and nothing needs the plaintext after the email is
-- sent — verification hashes the submitted code and compares.
CREATE TABLE IF NOT EXISTS email_challenges (
  token_hash  TEXT   PRIMARY KEY,
  email       TEXT   NOT NULL,
  created_at  BIGINT NOT NULL,
  expires_at  BIGINT NOT NULL,
  consumed_at BIGINT,
  -- Wrong guesses against THIS challenge. A 6-digit code is only 10^6, so
  -- without a cap it is trivially brute-forced inside the expiry window.
  attempts    INT    NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS email_challenges_email ON email_challenges (email, created_at);
CREATE INDEX IF NOT EXISTS email_challenges_expiry ON email_challenges (expires_at);

INSERT INTO schema_migrations (version) VALUES ('0004_identities')
  ON CONFLICT (version) DO NOTHING;
