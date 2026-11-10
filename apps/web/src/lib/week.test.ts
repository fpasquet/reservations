import { describe, expect, it } from 'vitest';
import { parisInstant } from './paris-time';
import type { Booking } from './types';
import { occupancy, weekDays, weekStart } from './week';

const booking = (roomId: number, day: string, from: number, to: number, cancelledAt: string | null = null) =>
  ({
    room: { id: roomId, name: 'Salle' },
    startsAt: parisInstant(day, from).toISOString(),
    endsAt: parisInstant(day, to).toISOString(),
    cancelledAt,
  }) as Booking;

describe('weekStart', () => {
  it('returns the Monday of the week', () => {
    expect(weekStart('2026-11-10')).toBe('2026-11-09');
    expect(weekStart('2026-11-09')).toBe('2026-11-09');
    expect(weekStart('2026-11-15')).toBe('2026-11-09');
  });

  it('crosses month and year boundaries', () => {
    expect(weekStart('2027-01-01')).toBe('2026-12-28');
  });
});

describe('weekDays', () => {
  it('lists Monday to Friday', () => {
    expect(weekDays('2026-11-12')).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']);
  });
});

describe('occupancy', () => {
  const day = '2026-11-10';

  it('is 0 without booking', () => {
    expect(occupancy([], 1, day)).toBe(0);
  });

  it('counts booked minutes over opening hours', () => {
    expect(occupancy([booking(1, day, 9 * 60, 12 * 60)], 1, day)).toBe(0.25);
  });

  it('adds up several bookings of the room only', () => {
    const bookings = [
      booking(1, day, 8 * 60, 10 * 60),
      booking(1, day, 14 * 60, 18 * 60),
      booking(2, day, 8 * 60, 20 * 60),
    ];
    expect(occupancy(bookings, 1, day)).toBe(0.5);
  });

  it('ignores other days and cancelled bookings', () => {
    const bookings = [
      booking(1, '2026-11-11', 8 * 60, 20 * 60),
      booking(1, day, 8 * 60, 20 * 60, '2026-11-01T10:00:00Z'),
    ];
    expect(occupancy(bookings, 1, day)).toBe(0);
  });

  it('never counts the same minutes twice', () => {
    const bookings = [booking(1, day, 8 * 60, 14 * 60), booking(1, day, 12 * 60, 14 * 60)];
    expect(occupancy(bookings, 1, day)).toBe(0.5);
  });
});
