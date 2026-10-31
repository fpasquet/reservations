import { Inject, Injectable } from '@nestjs/common';
import type pg from 'pg';
import { DATABASE } from '../database.js';
import type { ClosedDay } from './closed-day.js';
import type { ClosedDaysRepository } from './closed-days.repository.js';

@Injectable()
export class PgClosedDaysRepository implements ClosedDaysRepository {
  constructor(@Inject(DATABASE) private readonly db: pg.Pool) {}

  async find(date: string): Promise<ClosedDay | null> {
    const { rows } = await this.db.query<ClosedDay>(
      `select to_char(day, 'YYYY-MM-DD') as date, name from closed_day where day = $1`,
      [date],
    );
    return rows[0] ?? null;
  }

  async replacePublicHolidays(days: ClosedDay[]): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('begin');
      await client.query(`delete from closed_day where source = 'public_holiday'`);
      await client.query(
        `insert into closed_day (day, name) select * from unnest($1::date[], $2::text[]) on conflict (day) do nothing`,
        [days.map((day) => day.date), days.map((day) => day.name)],
      );
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}
