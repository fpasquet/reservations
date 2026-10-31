import { describe, expect, it } from 'vitest';
import { canSignalArrival, isCancellable, splitByTime } from './bookings';
import type { Booking } from './types';

const now = new Date('2026-11-03T09:00:00Z');

function booking(id: number, startsAt: string, endsAt: string, cancelledAt: string | null = null): Booking {
  return {
    id,
    room: { id: 1, name: 'La Serre' },
    member: { id: 1, fullName: 'Camille Martin' },
    title: `Réservation ${id}`,
    attendees: null,
    startsAt,
    endsAt,
    createdAt: '2026-10-30T10:00:00Z',
    cancelledAt,
    arrivedAt: null,
    releasedAt: null,
  };
}

describe('splitByTime', () => {
  const yesterday = booking(1, '2026-11-02T09:00:00Z', '2026-11-02T10:00:00Z');
  const tomorrow = booking(2, '2026-11-04T09:00:00Z', '2026-11-04T10:00:00Z');
  const later = booking(3, '2026-11-03T14:00:00Z', '2026-11-03T15:00:00Z');
  const lastWeek = booking(4, '2026-10-27T09:00:00Z', '2026-10-27T10:00:00Z');

  it('puts the bookings to come first, the closest first', () => {
    expect(splitByTime([tomorrow, yesterday, later], now).upcoming.map((b) => b.id)).toEqual([3, 2]);
  });

  it('lists the past bookings, the most recent first', () => {
    expect(splitByTime([lastWeek, tomorrow, yesterday], now).past.map((b) => b.id)).toEqual([1, 4]);
  });
});

describe('isCancellable', () => {
  it('is true before the start only', () => {
    expect(isCancellable(booking(1, '2026-11-03T10:00:00Z', '2026-11-03T11:00:00Z'), now)).toBe(true);
    expect(isCancellable(booking(1, '2026-11-03T08:00:00Z', '2026-11-03T10:00:00Z'), now)).toBe(false);
  });

  it('is false for a cancelled booking', () => {
    expect(isCancellable(booking(1, '2026-11-03T10:00:00Z', '2026-11-03T11:00:00Z', '2026-11-02T10:00:00Z'), now)).toBe(
      false,
    );
  });
});

describe('canSignalArrival', () => {
  // now = 09:00Z
  it('is true from 15 minutes before the start until the release', () => {
    expect(canSignalArrival(booking(1, '2026-11-03T09:15:00Z', '2026-11-03T10:00:00Z'), now)).toBe(true);
    expect(canSignalArrival(booking(1, '2026-11-03T08:46:00Z', '2026-11-03T10:00:00Z'), now)).toBe(true);
  });

  it('is false too early or once the 15 minutes have elapsed', () => {
    expect(canSignalArrival(booking(1, '2026-11-03T09:16:00Z', '2026-11-03T10:00:00Z'), now)).toBe(false);
    expect(canSignalArrival(booking(1, '2026-11-03T08:45:00Z', '2026-11-03T10:00:00Z'), now)).toBe(false);
  });

  it('is false once arrived, released or cancelled', () => {
    const base = booking(1, '2026-11-03T09:00:00Z', '2026-11-03T10:00:00Z');
    expect(canSignalArrival({ ...base, arrivedAt: '2026-11-03T08:58:00Z' }, now)).toBe(false);
    expect(canSignalArrival({ ...base, releasedAt: '2026-11-03T09:15:00Z' }, now)).toBe(false);
    expect(canSignalArrival({ ...base, cancelledAt: '2026-11-02T10:00:00Z' }, now)).toBe(false);
  });
});
