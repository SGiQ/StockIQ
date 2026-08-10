-- Weekly leagues. A membership is one account's place in one week's cohort;
-- weekly XP is never stored here — it is summed from the account's `records`
-- (collection 'progress') at read time, so it can't drift from the real data.

CREATE TABLE IF NOT EXISTS league_memberships (
  account_id TEXT    NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  -- ISO date (YYYY-MM-DD) of the Monday that starts the league week.
  week_key   TEXT    NOT NULL,
  -- Opaque cohort id, scoped to (week_key, tier). ~15 accounts share one.
  cohort_id  TEXT    NOT NULL,
  -- 0 = Bronze .. 6 = Diamond. Carried week to week by promote/relegate.
  tier       INTEGER NOT NULL DEFAULT 0,
  joined_at  BIGINT  NOT NULL,
  PRIMARY KEY (account_id, week_key)
);

-- Listing a cohort's members, and finding an open cohort to join.
CREATE INDEX IF NOT EXISTS league_cohort_idx ON league_memberships (week_key, cohort_id);
CREATE INDEX IF NOT EXISTS league_open_idx   ON league_memberships (week_key, tier);
