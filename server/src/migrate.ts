/**
 * Applies every SQL file in migrations/ that has not been recorded yet.
 *
 * Each file is run inside a transaction, so a failure leaves nothing
 * half-applied. Files are plain SQL and idempotent (IF NOT EXISTS), so
 * re-running is safe even if the ledger is lost.
 *
 * Run: npm run migrate
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.ts';

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('✖  DATABASE_URL is not set.');
    process.exit(1);
  }

  // The ledger has to exist before it can be read, and 0001 creates it — so
  // bootstrap it here rather than depending on migration order.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const applied = new Set(
    (await pool.query<{ version: string }>('SELECT version FROM schema_migrations')).rows.map(
      (r) => r.version,
    ),
  );

  const files = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let ran = 0;
  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (applied.has(version)) continue;

    const sql = readFileSync(join(MIGRATIONS, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING',
        [version],
      );
      await client.query('COMMIT');
      console.log(`✔  applied ${file}`);
      ran += 1;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`✖  ${file} failed:`, error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  console.log(ran === 0 ? '✔  already up to date.' : `✔  ${ran} migration(s) applied.`);
  await pool.end();
}

void main();
