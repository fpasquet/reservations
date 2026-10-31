import { Inject, Injectable } from '@nestjs/common';
import type pg from 'pg';
import { DATABASE } from '../database.js';
import type { NewWaitlistEntry, WaitlistEntry } from './waitlist-entry.js';
import type { WaitlistRepository } from './waitlist.repository.js';

interface WaitlistRow {
  id: number;
  title: string;
  attendees: number | null;
  starts_at: Date;
  ends_at: Date;
  created_at: Date;
  offered_at: Date | null;
  offer_expires_at: Date | null;
  room_id: number;
  room_name: string;
  member_id: number;
  member_name: string;
}

const SELECT = `
  select w.id, w.title, w.attendees, w.starts_at, w.ends_at, w.created_at, w.offered_at, w.offer_expires_at,
         r.id as room_id, r.name as room_name, m.id as member_id, m.full_name as member_name
  from waitlist_entry w
  join room r on r.id = w.room_id
  join member m on m.id = w.member_id`;

const toEntry = (row: WaitlistRow): WaitlistEntry => ({
  id: row.id,
  room: { id: row.room_id, name: row.room_name },
  member: { id: row.member_id, fullName: row.member_name },
  title: row.title,
  attendees: row.attendees,
  startsAt: row.starts_at.toISOString(),
  endsAt: row.ends_at.toISOString(),
  createdAt: row.created_at.toISOString(),
  offeredAt: row.offered_at?.toISOString() ?? null,
  offerExpiresAt: row.offer_expires_at?.toISOString() ?? null,
});

@Injectable()
export class PgWaitlistRepository implements WaitlistRepository {
  constructor(@Inject(DATABASE) private readonly db: pg.Pool) {}

  async listAll(): Promise<WaitlistEntry[]> {
    const { rows } = await this.db.query<WaitlistRow>(`${SELECT} order by w.created_at, w.id`);
    return rows.map(toEntry);
  }

  async listByMember(memberId: number): Promise<WaitlistEntry[]> {
    const { rows } = await this.db.query<WaitlistRow>(`${SELECT} where w.member_id = $1 order by w.starts_at, w.id`, [
      memberId,
    ]);
    return rows.map(toEntry);
  }

  async get(id: number): Promise<WaitlistEntry | null> {
    const { rows } = await this.db.query<WaitlistRow>(`${SELECT} where w.id = $1`, [id]);
    return rows[0] ? toEntry(rows[0]) : null;
  }

  async create(entry: NewWaitlistEntry, at: Date): Promise<WaitlistEntry> {
    const { rows } = await this.db.query<{ id: number }>(
      `insert into waitlist_entry (room_id, member_id, title, attendees, starts_at, ends_at, created_at)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [entry.roomId, entry.memberId, entry.title, entry.attendees, entry.startsAt, entry.endsAt, at],
    );
    return this.mustGet(rows[0]?.id);
  }

  async offer(id: number, at: Date, expiresAt: Date): Promise<WaitlistEntry> {
    await this.db.query('update waitlist_entry set offered_at = $2, offer_expires_at = $3 where id = $1', [
      id,
      at,
      expiresAt,
    ]);
    return this.mustGet(id);
  }

  async remove(id: number): Promise<void> {
    await this.db.query('delete from waitlist_entry where id = $1', [id]);
  }

  private async mustGet(id: number | undefined): Promise<WaitlistEntry> {
    const entry = id === undefined ? null : await this.get(id);
    if (!entry) throw new Error(`waitlist entry ${id} vanished`);
    return entry;
  }
}
