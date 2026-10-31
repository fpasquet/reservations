import { describe, expect, it } from 'vitest';
import { parisInstant } from './paris-time';
import type { Booking } from './types';
import { mondayOf, occupancy, weekDays } from './week';

const booking = (roomId: number, from: number, to: number, day = '2026-11-03'): Booking => ({
  id: 1,
  room: { id: roomId, name: 'Salle' },
  member: { id: 1, fullName: 'Camille' },
  title: 'Réunion',
  attendees: null,
  startsAt: parisInstant(day, from).toISOString(),
  endsAt: parisInstant(day, to).toISOString(),
  createdAt: '2026-11-01T08:00:00Z',
  cancelledAt: null,
});

describe('mondayOf', () => {
  it('returns the monday of the week', () => {
    expect(mondayOf('2026-11-02')).toBe('2026-11-02');
    expect(mondayOf('2026-11-04')).toBe('2026-11-02');
    expect(mondayOf('2026-11-06')).toBe('2026-11-02');
  });

  it('sends the weekend back to the previous monday', () => {
    expect(mondayOf('2026-11-07')).toBe('2026-11-02');
    expect(mondayOf('2026-11-08')).toBe('2026-11-02');
  });

  it('crosses month and year boundaries', () => {
    expect(mondayOf('2027-01-01')).toBe('2026-12-28');
  });
});

describe('weekDays', () => {
  it('lists monday to friday', () => {
    expect(weekDays('2026-11-05')).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
  });
});

describe('occupancy', () => {
  it('is 0 without booking', () => {
    expect(occupancy([], 1, '2026-11-03')).toBe(0);
  });

  it('is the share of the opening hours that is booked', () => {
    expect(occupancy([booking(1, 9 * 60, 12 * 60)], 1, '2026-11-03')).toBe(25);
  });

  it('ignores other rooms and other days', () => {
    const bookings = [booking(2, 9 * 60, 12 * 60), booking(1, 9 * 60, 12 * 60, '2026-11-04')];
    expect(occupancy(bookings, 1, '2026-11-03')).toBe(0);
  });

  it('counts overlapping bookings once', () => {
    const bookings = [booking(1, 9 * 60, 11 * 60), booking(1, 10 * 60, 12 * 60), booking(1, 9 * 60 + 30, 10 * 60)];
    expect(occupancy(bookings, 1, '2026-11-03')).toBe(25);
  });

  it('is 100 for a fully booked day', () => {
    expect(occupancy([booking(1, 8 * 60, 20 * 60)], 1, '2026-11-03')).toBe(100);
  });
});
