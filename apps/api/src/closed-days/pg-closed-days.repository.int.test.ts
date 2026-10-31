import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { connect } from '../database.js';
import { clearTables } from '../testing/test-database.js';
import { PgClosedDaysRepository } from './pg-closed-days.repository.js';

const db = connect();
const closedDays = new PgClosedDaysRepository(db);

beforeEach(async () => {
  await clearTables(db);
});

afterAll(async () => {
  await db.end();
});

describe('PgClosedDaysRepository', () => {
  it('finds a closed day by date, or null', async () => {
    await closedDays.replacePublicHolidays([{ date: '2026-11-11', name: '11 novembre' }]);
    expect(await closedDays.find('2026-11-11')).toEqual({ date: '2026-11-11', name: '11 novembre' });
    expect(await closedDays.find('2026-11-12')).toBeNull();
  });

  it('replaces the public holidays and leaves the other closures alone', async () => {
    await db.query(`insert into closed_day (day, name, source) values ('2026-08-10', 'Travaux', 'manual')`);
    await closedDays.replacePublicHolidays([{ date: '2026-11-11', name: '11 novembre' }]);
    await closedDays.replacePublicHolidays([{ date: '2026-12-25', name: 'Jour de Noël' }]);

    expect(await closedDays.find('2026-11-11')).toBeNull();
    expect(await closedDays.find('2026-12-25')).not.toBeNull();
    expect(await closedDays.find('2026-08-10')).toEqual({ date: '2026-08-10', name: 'Travaux' });
  });
});
