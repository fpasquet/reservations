import { connect } from '../database.js';
import { migrate } from '../migrations.js';

const pool = connect();
try {
  const applied = await migrate(pool);
  for (const file of applied) console.log(`Applied ${file}`);
  console.log(applied.length === 0 ? 'Database is up to date.' : `${applied.length} migration(s) applied.`);
} finally {
  await pool.end();
}
