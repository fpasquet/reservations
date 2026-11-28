import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { connect } from '../database.js';
import { parisInstant } from '../shared/paris-time.js';
import { clearTables, insertMember, insertRoom } from '../testing/test-database.js';
import type { NewBooking } from './booking.js';
import { PgBookingsRepository } from './pg-bookings.repository.js';

const db = connect();
const bookings = new PgBookingsRepository(db);
const date = '2026-11-03';
const at = (minutes: number, day = date) => parisInstant(day, minutes);

let serre: number;
let atelier: number;
let camille: number;
let yanis: number;

const book = (booking: Partial<NewBooking> & { from: number; to: number; day?: string }) =>
  bookings.create({
    roomId: booking.roomId ?? serre,
    memberId: booking.memberId ?? camille,
    title: booking.title ?? 'Point d’équipe',
    attendees: booking.attendees ?? null,
    startsAt: at(booking.from, booking.day),
    endsAt: at(booking.to, booking.day),
  });

beforeEach(async () => {
  await clearTables(db);
  serre = await insertRoom(db, { name: 'La Serre', capacity: 8 });
  atelier = await insertRoom(db, { name: 'Atelier', capacity: 14 });
  camille = await insertMember(db, 'Camille Martin');
  yanis = await insertMember(db, 'Yanis Benali');
});

afterAll(async () => {
  await db.end();
});

describe('PgBookingsRepository.create', () => {
  it('stores the booking and gives it back with the room and the member', async () => {
    const created = await book({ from: 9 * 60, to: 10 * 60 + 30, attendees: 4, title: 'Rétrospective' });
    expect(created).toMatchObject({
      id: 1,
      room: { id: serre, name: 'La Serre' },
      member: { id: camille, fullName: 'Camille Martin' },
      title: 'Rétrospective',
      attendees: 4,
      startsAt: '2026-11-03T08:00:00.000Z',
      endsAt: '2026-11-03T09:30:00.000Z',
      cancelledAt: null,
    });
    expect(Date.parse(created.createdAt)).not.toBeNaN();
    expect(await bookings.get(created.id)).toEqual(created);
  });

  it('keeps an unknown number of attendees', async () => {
    expect((await book({ from: 600, to: 660 })).attendees).toBeNull();
  });

  it('refuses a booking that ends before it starts', async () => {
    await expect(book({ from: 660, to: 600 })).rejects.toThrow();
  });
});

describe('PgBookingsRepository.listBetween', () => {
  it('gives the bookings that overlap the interval, by start then by room', async () => {
    await book({ from: 14 * 60, to: 15 * 60, title: 'Après-midi' });
    await book({ from: 9 * 60, to: 10 * 60, roomId: atelier, title: 'Atelier du matin' });
    await book({ from: 9 * 60, to: 11 * 60, title: 'Serre du matin' });
    await book({ from: 9 * 60, to: 10 * 60, day: '2026-11-04', title: 'Lendemain' });

    const found = await bookings.listBetween(at(0), at(0, '2026-11-04'));
    expect(found.map((booking) => booking.title)).toEqual(['Atelier du matin', 'Serre du matin', 'Après-midi']);
  });

  it('leaves out a booking that ends when the interval starts, or starts when it ends', async () => {
    await book({ from: 9 * 60, to: 10 * 60, title: 'Avant' });
    await book({ from: 10 * 60, to: 11 * 60, title: 'Pendant' });
    await book({ from: 11 * 60, to: 12 * 60, title: 'Après' });

    const found = await bookings.listBetween(at(10 * 60), at(11 * 60));
    expect(found.map((booking) => booking.title)).toEqual(['Pendant']);
  });

  it('includes a booking that covers the whole interval', async () => {
    await book({ from: 9 * 60, to: 13 * 60, title: 'Matinée' });
    expect(await bookings.listBetween(at(10 * 60), at(10 * 60 + 15))).toHaveLength(1);
  });

  it('keeps one room when asked', async () => {
    await book({ from: 9 * 60, to: 10 * 60, title: 'Serre' });
    await book({ from: 9 * 60, to: 10 * 60, roomId: atelier, title: 'Atelier' });

    const found = await bookings.listBetween(at(0), at(0, '2026-11-04'), atelier);
    expect(found.map((booking) => booking.title)).toEqual(['Atelier']);
  });
});

describe('PgBookingsRepository.listByMember', () => {
  it('gives the bookings of one member, by start', async () => {
    await book({ from: 14 * 60, to: 15 * 60, title: 'Plus tard' });
    await book({ from: 9 * 60, to: 10 * 60, memberId: yanis, title: 'Yanis' });
    await book({ from: 9 * 60, to: 10 * 60, day: '2026-11-02', title: 'La veille' });

    const found = await bookings.listByMember(camille);
    expect(found.map((booking) => booking.title)).toEqual(['La veille', 'Plus tard']);
    expect(await bookings.listByMember(99)).toEqual([]);
  });
});

describe('PgBookingsRepository.cancel', () => {
  it('keeps the booking, with the time of its cancellation', async () => {
    const created = await book({ from: 9 * 60, to: 10 * 60 });
    const when = new Date('2026-11-02T16:20:00Z');

    const cancelled = await bookings.cancel(created.id, when);
    expect(cancelled).toMatchObject({ id: created.id, cancelledAt: '2026-11-02T16:20:00.000Z' });
    expect((await bookings.get(created.id))?.cancelledAt).toBe('2026-11-02T16:20:00.000Z');
  });

  it('gives null for an unknown booking', async () => {
    expect(await bookings.get(42)).toBeNull();
  });
});
