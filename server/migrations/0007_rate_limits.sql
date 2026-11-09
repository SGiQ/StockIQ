-- Fixed-window rate-limit counters, keyed by what is being limited.
--
-- Kept in Postgres rather than in process memory so the limit survives a
-- redeploy and holds across instances. Every other guard here (email codes,
-- pairing codes) is per address or per device, and a caller controls both of
-- those: rotating `X-Device-Id` or the target address reset them. Keys here
-- are per source IP and global, which a caller cannot rotate.
--
-- `window_start` is the floor of now to the window size, so one row per
-- (key, window). Old windows are purged opportunistically by the limiter.
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT   NOT NULL,
  window_start BIGINT NOT NULL,
  count        INT    NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limits_window ON rate_limits (window_start);

INSERT INTO schema_migrations (version) VALUES ('0007_rate_limits')
  ON CONFLICT (version) DO NOTHING;
