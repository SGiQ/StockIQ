-- Multi-device: records belong to an ACCOUNT, devices belong to that account.
--
-- Before this, `records.owner_id` was the device's own secret, which made
-- multi-device impossible to do safely: the only way to share data was to
-- copy that secret to the second phone, and a secret that has been copied can
-- never be revoked. Lose a phone and the only remedy would be abandoning the
-- data entirely.
--
-- Now each device keeps its own secret and maps to an account. Sharing is a
-- row in `devices`, and revoking is deleting that row — the other devices are
-- unaffected because their secrets were never shared.

CREATE TABLE IF NOT EXISTS accounts (
  id         TEXT PRIMARY KEY,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  -- The device's own secret, minted in its keychain. Never shared with
  -- another device, which is what makes revocation meaningful.
  id           TEXT PRIMARY KEY,
  account_id   TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  -- Free-text, device-supplied, shown in the device list so a person can tell
  -- which row is the phone they lost. Never trusted for anything else.
  label        TEXT,
  created_at   BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS devices_account ON devices (account_id);

-- Pairing codes.
--
-- These are typed by a human, so they are short, and short means low entropy.
-- Three things compensate, and all three are required: a tight expiry,
-- single use (`used_at`), and rate limiting on the claim endpoint. Any one
-- alone would leave the code brute-forceable.
CREATE TABLE IF NOT EXISTS link_codes (
  code       TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  used_at    BIGINT
);

CREATE INDEX IF NOT EXISTS link_codes_expiry ON link_codes (expires_at);

-- Backfill.
--
-- Every existing owner_id WAS a device id. Creating an account whose id is
-- that same value means `records.owner_id` is already the correct account id
-- and not one row has to move — which is the whole reason the column was
-- named owner_id rather than device_id in 0001.
INSERT INTO accounts (id, created_at)
SELECT DISTINCT r.owner_id, (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT
  FROM records r
 WHERE NOT EXISTS (SELECT 1 FROM accounts a WHERE a.id = r.owner_id);

INSERT INTO devices (id, account_id, label, created_at, last_seen_at)
SELECT a.id, a.id, 'This device', a.created_at, a.created_at
  FROM accounts a
 WHERE NOT EXISTS (SELECT 1 FROM devices d WHERE d.id = a.id);

INSERT INTO schema_migrations (version) VALUES ('0002_accounts')
  ON CONFLICT (version) DO NOTHING;
