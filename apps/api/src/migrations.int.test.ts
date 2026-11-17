import { afterAll, describe, expect, it } from 'vitest';
import { connect } from './database.js';
import { migrate } from './migrations.js';

const db = connect();

afterAll(async () => {
  await db.end();
});

describe('migrate', () => {
  it('applies nothing the second time', async () => {
    expect(await migrate(db)).toEqual([]);
  });

  it('records every migration file', async () => {
    const { rows } = await db.query<{ name: string }>('select name from schema_migration order by name');
    expect(rows[0]?.name).toBe('0001_rooms_members_bookings.sql');
  });
});
