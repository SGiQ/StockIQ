import pg from 'pg';

/**
 * Postgres numerics wider than JS's safe integer range come back as strings by
 * default, which is the right call for `numeric` but wrong for the two BIGINT
 * columns here: `server_seq` is a row counter and `updated_at` is a
 * millisecond timestamp, both comfortably inside Number.MAX_SAFE_INTEGER for
 * any plausible lifetime of this app. Parsing them as numbers keeps the wire
 * types honest — otherwise `cursor` would silently become a string and every
 * `>` comparison downstream would be lexicographic.
 */
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  // Railway's Postgres requires TLS from outside its private network; inside
  // it the plain connection is fine. Opt in explicitly rather than disabling
  // verification by default.
  ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : undefined,
});

export type Pool = pg.Pool;
