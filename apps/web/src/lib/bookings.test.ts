import { describe, expect, it } from 'vitest';
import { canConfirm, isCancellable, splitByTime, upcomingEntries } from './bookings';
import type { Booking, WaitlistEntry } from './types';

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

describe('waitlist entries', () => {
  const entry = (id: number, startsAt: string, offerExpiresAt: string | null = null): WaitlistEntry => ({
    id,
    room: { id: 1, name: 'La Serre' },
    member: { id: 1, fullName: 'Camille Martin' },
    title: `Inscription ${id}`,
    attendees: null,
    startsAt,
    endsAt: startsAt,
    createdAt: '2026-10-30T10:00:00Z',
    offeredAt: offerExpiresAt && '2026-11-03T08:30:00Z',
    offerExpiresAt,
  });

  it('keeps the entries to come, the closest first', () => {
    const entries = [
      entry(1, '2026-11-05T09:00:00Z'),
      entry(2, '2026-11-02T09:00:00Z'),
      entry(3, '2026-11-04T09:00:00Z'),
    ];
    expect(upcomingEntries(entries, now).map((e) => e.id)).toEqual([3, 1]);
  });

  it('lets the member confirm only before the offer expires', () => {
    expect(canConfirm(entry(1, '2026-11-04T09:00:00Z'), now)).toBe(false);
    expect(canConfirm(entry(1, '2026-11-04T09:00:00Z', '2026-11-03T09:10:00Z'), now)).toBe(true);
    expect(canConfirm(entry(1, '2026-11-04T09:00:00Z', '2026-11-03T08:59:00Z'), now)).toBe(false);
  });
});
