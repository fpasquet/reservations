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
    expect(rows.map((row) => row.name)).toEqual(['0001_rooms_members_bookings.sql', '0002_booking_series.sql']);
  });

  it('links bookings to a series', async () => {
    const { rows } = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name = 'booking' and column_name = 'series_id'`,
    );
    expect(rows).toHaveLength(1);
  });
});
