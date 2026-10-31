import { Inject, Injectable } from '@nestjs/common';
import type pg from 'pg';
import { DATABASE } from '../database.js';
import type { RemindersRepository } from './reminders.repository.js';

@Injectable()
export class PgRemindersRepository implements RemindersRepository {
  constructor(@Inject(DATABASE) private readonly db: pg.Pool) {}

  async claim(memberId: number, day: string, at: Date): Promise<boolean> {
    const result = await this.db.query(
      'insert into booking_reminder (member_id, day, sent_at) values ($1, $2, $3) on conflict do nothing',
      [memberId, day, at],
    );
    return result.rowCount === 1;
  }

  async release(memberId: number, day: string): Promise<void> {
    await this.db.query('delete from booking_reminder where member_id = $1 and day = $2', [memberId, day]);
  }
}
