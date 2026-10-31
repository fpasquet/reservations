import { Inject, Injectable } from '@nestjs/common';
import type pg from 'pg';
import { DATABASE } from '../database.js';
import type { Booking, NewBooking, NewSeries, SeriesCreated } from './booking.js';
import type { BookingsRepository } from './bookings.repository.js';

interface BookingRow {
  id: number;
  title: string;
  attendees: number | null;
  starts_at: Date;
  ends_at: Date;
  created_at: Date;
  cancelled_at: Date | null;
  series_id: number | null;
  room_id: number;
  room_name: string;
  member_id: number;
  member_name: string;
}

const SELECT = `
  select b.id, b.title, b.attendees, b.starts_at, b.ends_at, b.created_at, b.cancelled_at, b.series_id,
         r.id as room_id, r.name as room_name, m.id as member_id, m.full_name as member_name
  from booking b
  join room r on r.id = b.room_id
  join member m on m.id = b.member_id`;

const toBooking = (row: BookingRow): Booking => ({
  id: row.id,
  room: { id: row.room_id, name: row.room_name },
  member: { id: row.member_id, fullName: row.member_name },
  title: row.title,
  attendees: row.attendees,
  startsAt: row.starts_at.toISOString(),
  endsAt: row.ends_at.toISOString(),
  createdAt: row.created_at.toISOString(),
  cancelledAt: row.cancelled_at?.toISOString() ?? null,
  seriesId: row.series_id,
});

@Injectable()
export class PgBookingsRepository implements BookingsRepository {
  constructor(@Inject(DATABASE) private readonly db: pg.Pool) {}

  async listBetween(from: Date, to: Date, roomId?: number): Promise<Booking[]> {
    const { rows } = await this.db.query<BookingRow>(
      `${SELECT}
       where b.starts_at < $2 and b.ends_at > $1 and ($3::integer is null or b.room_id = $3)
       order by b.starts_at, r.name`,
      [from, to, roomId ?? null],
    );
    return rows.map(toBooking);
  }

  async listByMember(memberId: number): Promise<Booking[]> {
    const { rows } = await this.db.query<BookingRow>(`${SELECT} where b.member_id = $1 order by b.starts_at`, [
      memberId,
    ]);
    return rows.map(toBooking);
  }

  async get(id: number): Promise<Booking | null> {
    const { rows } = await this.db.query<BookingRow>(`${SELECT} where b.id = $1`, [id]);
    return rows[0] ? toBooking(rows[0]) : null;
  }

  async create(booking: NewBooking): Promise<Booking> {
    const { rows } = await this.db.query<{ id: number }>(
      `insert into booking (room_id, member_id, title, attendees, starts_at, ends_at)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [booking.roomId, booking.memberId, booking.title, booking.attendees, booking.startsAt, booking.endsAt],
    );
    return this.mustGet(rows[0]?.id);
  }

  async cancel(id: number, at: Date): Promise<Booking> {
    await this.db.query('update booking set cancelled_at = $2 where id = $1', [id, at]);
    return this.mustGet(id);
  }

  async createSeries(series: NewSeries): Promise<SeriesCreated> {
    const client = await this.db.connect();
    try {
      await client.query('begin');
      const { rows } = await client.query<{ id: number }>(
        'insert into booking_series (member_id, weeks) values ($1, $2) returning id',
        [series.memberId, series.weeks],
      );
      const seriesId = rows[0]!.id;
      const ids: number[] = [];
      for (const slot of series.slots) {
        const inserted = await client.query<{ id: number }>(
          `insert into booking (room_id, member_id, title, attendees, starts_at, ends_at, series_id)
           values ($1, $2, $3, $4, $5, $6, $7) returning id`,
          [series.roomId, series.memberId, series.title, series.attendees, slot.startsAt, slot.endsAt, seriesId],
        );
        ids.push(inserted.rows[0]!.id);
      }
      await client.query('commit');
      const { rows: created } = await this.db.query<BookingRow>(`${SELECT} where b.id = any($1) order by b.starts_at`, [
        ids,
      ]);
      return { seriesId, bookings: created.map(toBooking) };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async getSeriesOwner(seriesId: number): Promise<number | null> {
    const { rows } = await this.db.query<{ member_id: number }>('select member_id from booking_series where id = $1', [
      seriesId,
    ]);
    return rows[0]?.member_id ?? null;
  }

  async cancelSeriesAfter(seriesId: number, after: Date, at: Date): Promise<Booking[]> {
    const { rows } = await this.db.query<{ id: number }>(
      `update booking set cancelled_at = $3
       where series_id = $1 and starts_at > $2 and cancelled_at is null returning id`,
      [seriesId, after, at],
    );
    const { rows: cancelled } = await this.db.query<BookingRow>(`${SELECT} where b.id = any($1) order by b.starts_at`, [
      rows.map((row) => row.id),
    ]);
    return cancelled.map(toBooking);
  }

  private async mustGet(id: number | undefined): Promise<Booking> {
    const booking = id === undefined ? null : await this.get(id);
    if (!booking) throw new Error(`booking ${id} vanished`);
    return booking;
  }
}
