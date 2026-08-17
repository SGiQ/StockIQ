-- StockiQ sync store.
--
-- The table is deliberately the same shape as the device's local `records`
-- table (see src/store/sqlite/SqliteRepository.ts): one row per record, with
-- the sync-critical fields promoted out of the payload. Keeping both sides
-- identical means the wire format needs no translation layer, and a bug can
-- only ever be in the merge rule rather than in a mapping.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The pull cursor. See the note on server_seq below for why this exists
-- rather than paging on updated_at.
CREATE SEQUENCE IF NOT EXISTS records_seq;

CREATE TABLE IF NOT EXISTS records (
  -- The sync scope. Today this is the anonymous device UUID from the
  -- keychain; when device linking arrives it becomes an account id and the
  -- rows are remapped, which is why it is not called device_id.
  owner_id    TEXT   NOT NULL,

  collection  TEXT   NOT NULL,
  id          TEXT   NOT NULL,

  -- Client wall-clock time. Used ONLY to resolve conflicts (last write
  -- wins). Never used for paging — see server_seq.
  updated_at  BIGINT NOT NULL,

  -- Soft delete. A deleted record keeps its row so the tombstone can
  -- propagate to other devices; a hard delete would simply reappear on the
  -- next push from a device that had not heard about it.
  deleted_at  BIGINT,

  payload     JSONB  NOT NULL,

  -- Server-assigned, monotonic, and the ONLY thing a client pages on.
  --
  -- Paging on updated_at looks equivalent and is not: it is a client clock,
  -- so a device whose clock is behind can write a record stamped earlier
  -- than a cursor another device already holds, and that record is then
  -- never returned by any future pull. Silent, permanent data loss that only
  -- shows up on skewed devices. A server sequence cannot go backwards, so
  -- the cursor is safe regardless of what the client clocks say.
  server_seq  BIGINT NOT NULL DEFAULT nextval('records_seq'),

  PRIMARY KEY (owner_id, collection, id)
);

-- The pull query is exactly (owner_id = $1 AND server_seq > $2) ORDER BY
-- server_seq, so this index serves it end to end.
CREATE INDEX IF NOT EXISTS records_pull
  ON records (owner_id, server_seq);

INSERT INTO schema_migrations (version) VALUES ('0001_init')
  ON CONFLICT (version) DO NOTHING;
