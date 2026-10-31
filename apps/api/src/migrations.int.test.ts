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

  it('adds the hourly rate in cents to the rooms', async () => {
    const { rows } = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'room' and column_name = 'hourly_rate_cents'",
    );
    expect(rows).toHaveLength(1);
  });

  it('records every migration file', async () => {
    const { rows } = await db.query<{ name: string }>('select name from schema_migration order by name');
    expect(rows[0]?.name).toBe('0001_rooms_members_bookings.sql');
  });
});
