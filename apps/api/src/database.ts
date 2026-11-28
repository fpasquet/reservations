import pg from 'pg';

export const DATABASE = Symbol('DATABASE');

/** Pool de connexions à Postgres ; le schéma vient des migrations (make db-migrate). */
export function connect(url = process.env['DATABASE_URL']): pg.Pool {
  if (!url) throw new Error('DATABASE_URL is required (see .env.example).');
  return new pg.Pool({ connectionString: url });
}
