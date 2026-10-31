import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { connect } from '../database.js';
import { parisInstant } from '../shared/paris-time.js';
import { clearTables, insertMember, insertRoom } from '../testing/test-database.js';
import { PgBookingsRepository } from './pg-bookings.repository.js';

const db = connect();
const bookings = new PgBookingsRepository(db);
const slot = (day: string) => ({ startsAt: parisInstant(day, 10 * 60), endsAt: parisInstant(day, 11 * 60) });

let serre: number;
let camille: number;

const newSeries = (days: string[]) => ({
  memberId: camille,
  roomId: serre,
  title: 'Point hebdo',
  attendees: 4,
  weeks: days.length,
  slots: days.map(slot),
});

beforeEach(async () => {
  await clearTables(db);
  serre = await insertRoom(db, { name: 'La Serre', capacity: 8 });
  camille = await insertMember(db, 'Camille Martin');
});

afterAll(async () => {
  await db.end();
});

describe('PgBookingsRepository.createSeries', () => {
  it('stores every occurrence with the series id', async () => {
    const created = await bookings.createSeries(newSeries(['2026-11-03', '2026-11-10', '2026-11-17']));
    expect(created.seriesId).toBe(1);
    expect(created.bookings.map((booking) => booking.startsAt)).toEqual([
      '2026-11-03T09:00:00.000Z',
      '2026-11-10T09:00:00.000Z',
      '2026-11-17T09:00:00.000Z',
    ]);
    expect(created.bookings.every((booking) => booking.seriesId === 1 && booking.title === 'Point hebdo')).toBe(true);
    expect(await bookings.listByMember(camille)).toEqual(created.bookings);
  });

  it('leaves a booking outside any series without series id', async () => {
    const single = await bookings.create({
      roomId: serre,
      memberId: camille,
      title: 'Seule',
      attendees: null,
      ...slot('2026-11-03'),
    });
    expect(single.seriesId).toBeNull();
  });

  it('creates all or nothing', async () => {
    const broken = newSeries(['2026-11-03', '2026-11-10']);
    // La seconde occurrence finit avant de commencer : la contrainte de la base la refuse.
    broken.slots[1] = { startsAt: parisInstant('2026-11-10', 11 * 60), endsAt: parisInstant('2026-11-10', 10 * 60) };
    await expect(bookings.createSeries(broken)).rejects.toThrow();
    expect(await bookings.listByMember(camille)).toEqual([]);
    const { rows } = await db.query('select id from booking_series');
    expect(rows).toEqual([]);
  });

  it('refuses a number of weeks outside 2 to 12', async () => {
    await expect(bookings.createSeries({ ...newSeries(['2026-11-03']), weeks: 1 })).rejects.toThrow();
    await expect(bookings.createSeries({ ...newSeries(['2026-11-03']), weeks: 13 })).rejects.toThrow();
  });
});

describe('PgBookingsRepository series ownership and cancellation', () => {
  it('knows the owner of a series', async () => {
    const { seriesId } = await bookings.createSeries(newSeries(['2026-11-03', '2026-11-10']));
    expect(await bookings.getSeriesOwner(seriesId)).toBe(camille);
    expect(await bookings.getSeriesOwner(99)).toBeNull();
  });

  it('cancels the occurrences starting after the given instant, once', async () => {
    const { seriesId, bookings: created } = await bookings.createSeries(
      newSeries(['2026-11-03', '2026-11-10', '2026-11-17', '2026-11-24']),
    );
    await bookings.cancel(created[3]!.id, new Date('2026-11-01T08:00:00Z'));

    const now = new Date('2026-11-10T12:00:00Z');
    const cancelled = await bookings.cancelSeriesAfter(seriesId, new Date('2026-11-03T12:00:00Z'), now);
    // La dernière occurrence était déjà annulée : elle garde sa date d'annulation.
    expect(cancelled.map((booking) => booking.id)).toEqual([created[1]!.id, created[2]!.id]);
    expect(cancelled.every((booking) => booking.cancelledAt === now.toISOString())).toBe(true);

    const all = await bookings.listByMember(camille);
    expect(all.map((booking) => booking.cancelledAt)).toEqual([
      null,
      now.toISOString(),
      now.toISOString(),
      '2026-11-01T08:00:00.000Z',
    ]);
    expect(await bookings.cancelSeriesAfter(seriesId, new Date('2026-11-03T12:00:00Z'), now)).toEqual([]);
  });
});
