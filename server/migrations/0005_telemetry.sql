-- Minimal first-party product telemetry. No free-form user content is stored.
CREATE TABLE IF NOT EXISTS telemetry_events (
  id           BIGSERIAL PRIMARY KEY,
  account_id   TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  route        TEXT,
  detail       TEXT,
  value        DOUBLE PRECISION,
  created_at   BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS telemetry_events_type_time
  ON telemetry_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS telemetry_events_account_time
  ON telemetry_events (account_id, created_at DESC);

INSERT INTO schema_migrations (version) VALUES ('0005_telemetry')
  ON CONFLICT (version) DO NOTHING;
