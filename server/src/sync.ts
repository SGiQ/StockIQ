import type { PoolClient } from 'pg';
import { LIMITS, clampRecordClocks, type RecordRow, type SyncResponse } from './protocol.ts';

interface DbRow {
  collection: string;
  id: string;
  updated_at: number;
  deleted_at: number | null;
  payload: unknown;
  server_seq: number;
}

const toRecord = (row: DbRow): RecordRow => ({
  collection: row.collection,
  id: row.id,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
  payload: row.payload,
});

/**
 * Push then pull, in one transaction.
 *
 * The merge rule is last-write-wins on the client's `updatedAt`, applied in
 * the `WHERE` of the upsert so it is decided by Postgres rather than by a
 * read-compare-write in application code. Doing it in SQL matters: two
 * devices syncing concurrently would otherwise interleave between the read
 * and the write and the older record could land last.
 *
 * The comparison is strict `<`, so re-pushing a record the server already has
 * at the same `updatedAt` changes nothing and does NOT burn a new
 * `server_seq`. With `<=` every redundant push would bump the sequence, the
 * client would pull its own echo back, and a client that pushes on every
 * launch would never reach a quiet state.
 */
export async function pushAndPull(
  client: PoolClient,
  ownerId: string,
  since: number,
  changes: RecordRow[],
): Promise<SyncResponse> {
  const serverNow = Date.now();
  for (const raw of changes) {
    // A client clock far ahead would make this row permanent; see
    // MAX_CLOCK_SKEW_MS in protocol.ts.
    const record = clampRecordClocks(raw, serverNow);
    await client.query(
      `INSERT INTO records
         (owner_id, collection, id, updated_at, deleted_at, payload, server_seq)
       VALUES ($1, $2, $3, $4, $5, $6, nextval('records_seq'))
       ON CONFLICT (owner_id, collection, id) DO UPDATE
         SET updated_at = EXCLUDED.updated_at,
             deleted_at = EXCLUDED.deleted_at,
             payload    = EXCLUDED.payload,
             server_seq = nextval('records_seq')
         WHERE records.updated_at < EXCLUDED.updated_at`,
      [
        ownerId,
        record.collection,
        record.id,
        record.updatedAt,
        record.deletedAt,
        JSON.stringify(record.payload),
      ],
    );
  }

  // One row over the page size tells us whether another page exists without
  // a second COUNT query over the same index.
  const { rows } = await client.query<DbRow>(
    `SELECT collection, id, updated_at, deleted_at, payload, server_seq
       FROM records
      WHERE owner_id = $1 AND server_seq > $2
      ORDER BY server_seq
      LIMIT $3`,
    [ownerId, since, LIMITS.pullPageSize + 1],
  );

  const hasMore = rows.length > LIMITS.pullPageSize;
  const page = hasMore ? rows.slice(0, LIMITS.pullPageSize) : rows;

  // Advance only as far as the last row actually returned. Taking the table's
  // max would skip anything written between this query and the response.
  const cursor = page.length ? page[page.length - 1]!.server_seq : since;

  return {
    cursor,
    changes: page.map(toRecord),
    hasMore,
    serverTime: serverNow,
  };
}
