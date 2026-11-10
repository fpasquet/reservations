import { readdir, readFile } from 'node:fs/promises';
import type pg from 'pg';

// Les migrations sont des fichiers SQL numérotés, appliqués une seule fois et dans l'ordre.
const directory = new URL('../migrations/', import.meta.url);

/** Applique les migrations en attente, chacune dans sa transaction ; renvoie les fichiers appliqués. */
export async function migrate(pool: pg.Pool): Promise<string[]> {
  await pool.query(
    'create table if not exists schema_migration (name text primary key, applied_at timestamptz not null default now())',
  );
  const { rows } = await pool.query<{ name: string }>('select name from schema_migration');
  const applied = new Set(rows.map((row) => row.name));
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  const pending = files.filter((file) => !applied.has(file));

  for (const file of pending) {
    const sql = await readFile(new URL(file, directory), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into schema_migration (name) values ($1)', [file]);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
  return pending;
}
