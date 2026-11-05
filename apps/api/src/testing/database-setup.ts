import { connect } from '../database.js';
import { migrate } from '../migrations.js';

/** Avant les tests d'intégration : repart d'un schéma vide et applique toutes les migrations. */
export default async function setup(): Promise<void> {
  const pool = connect();
  try {
    const { rows } = await pool.query<{ name: string }>('select current_database() as name');
    // Garde-fou : ces tests vident la base, jamais celle de développement.
    if (!rows[0]?.name.endsWith('_test')) {
      throw new Error(`Integration tests wipe their database: "${rows[0]?.name}" does not end with _test.`);
    }
    await pool.query('drop schema public cascade; create schema public;');
    await migrate(pool);
  } finally {
    await pool.end();
  }
}
