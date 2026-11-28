import { describe, expect, it } from 'vitest';
import type { Room } from '../rooms/room.js';
import { DomainError } from '../shared/domain-error.js';
import type { Booking } from './booking.js';
import { checkCancellation, checkCapacity, checkSlot, overlaps } from './booking-rules.js';

// Novembre : Paris est à UTC+1.
const at = (date: string, time: string) => new Date(`${date}T${time}:00+01:00`);
const now = at('2026-11-02', '09:10');
const slot = (start: string, end: string, date = '2026-11-03') => ({
  startsAt: at(date, start),
  endsAt: at(date, end),
});

function errorOf(check: () => void): DomainError {
  try {
    check();
  } catch (error) {
    if (error instanceof DomainError) return error;
  }
  throw new Error('expected a DomainError');
}

describe('checkSlot', () => {
  it('accepts a slot during opening hours', () => {
    expect(() => checkSlot(slot('10:00', '11:30'), now)).not.toThrow();
  });

  it('accepts a slot that starts at opening time', () => {
    expect(() => checkSlot(slot('08:00', '09:00'), now)).not.toThrow();
  });

  it('refuses a slot that starts before opening time', () => {
    expect(errorOf(() => checkSlot(slot('07:45', '09:00'), now))).toMatchObject({
      code: 'OUTSIDE_OPENING_HOURS',
      field: 'startsAt',
    });
  });

  it('refuses a slot that ends after closing time', () => {
    expect(errorOf(() => checkSlot(slot('19:00', '20:15'), now))).toMatchObject({
      code: 'OUTSIDE_OPENING_HOURS',
      field: 'endsAt',
    });
  });

  it('refuses a slot that runs over two days', () => {
    const overnight = { startsAt: at('2026-11-03', '19:00'), endsAt: at('2026-11-04', '09:00') };
    expect(errorOf(() => checkSlot(overnight, now)).code).toBe('OUTSIDE_OPENING_HOURS');
  });

  it('refuses times that are not on a quarter hour', () => {
    expect(errorOf(() => checkSlot(slot('10:10', '11:00'), now))).toMatchObject({
      code: 'NOT_ON_QUARTER_HOUR',
      field: 'startsAt',
    });
    expect(errorOf(() => checkSlot(slot('10:00', '11:05'), now))).toMatchObject({
      code: 'NOT_ON_QUARTER_HOUR',
      field: 'endsAt',
    });
  });

  it('refuses an end before the start', () => {
    expect(errorOf(() => checkSlot(slot('11:00', '10:00'), now)).code).toBe('END_BEFORE_START');
    expect(errorOf(() => checkSlot(slot('11:00', '11:00'), now)).code).toBe('END_BEFORE_START');
  });

  it('accepts 4 hours and refuses more', () => {
    expect(() => checkSlot(slot('09:00', '13:00'), now)).not.toThrow();
    expect(errorOf(() => checkSlot(slot('09:00', '13:15'), now)).code).toBe('TOO_LONG');
  });

  it('refuses a slot that has already started', () => {
    expect(errorOf(() => checkSlot(slot('09:00', '10:00', '2026-11-02'), now))).toMatchObject({
      code: 'IN_THE_PAST',
      field: 'startsAt',
    });
  });

  it('reads the opening hours in Paris time, in summer too', () => {
    const summer = { startsAt: new Date('2026-07-01T06:00:00Z'), endsAt: new Date('2026-07-01T07:00:00Z') };
    expect(() => checkSlot(summer, new Date('2026-06-30T12:00:00Z'))).not.toThrow();
  });
});

const room: Room = {
  id: 1,
  name: 'La Serre',
  floor: 1,
  capacity: 8,
  equipment: [],
  color: '#5b8a72',
  description: '',
};

describe('checkCapacity', () => {
  it('accepts up to the capacity of the room, or no count at all', () => {
    expect(() => checkCapacity(room, 8)).not.toThrow();
    expect(() => checkCapacity(room, null)).not.toThrow();
  });

  it('refuses more attendees than the room seats', () => {
    expect(errorOf(() => checkCapacity(room, 9))).toMatchObject({ code: 'OVER_CAPACITY', field: 'attendees' });
  });
});

describe('overlaps', () => {
  it('sees two slots that share some time', () => {
    expect(overlaps(slot('10:00', '11:00'), slot('10:30', '11:30'))).toBe(true);
    expect(overlaps(slot('10:00', '12:00'), slot('10:30', '11:00'))).toBe(true);
  });

  it('lets a booking start exactly when another ends', () => {
    expect(overlaps(slot('10:00', '11:00'), slot('11:00', '12:00'))).toBe(false);
    expect(overlaps(slot('11:00', '12:00'), slot('10:00', '11:00'))).toBe(false);
  });
});

const booking: Booking = {
  id: 7,
  room: { id: 1, name: 'La Serre' },
  member: { id: 2, fullName: 'Yanis Benali' },
  title: 'Entretien',
  attendees: null,
  startsAt: at('2026-11-03', '10:00').toISOString(),
  endsAt: at('2026-11-03', '11:00').toISOString(),
  createdAt: at('2026-10-30', '16:00').toISOString(),
  cancelledAt: null,
};

describe('checkCancellation', () => {
  it('lets the member cancel before the start', () => {
    expect(() => checkCancellation(booking, 2, now)).not.toThrow();
  });

  it('refuses another member', () => {
    expect(errorOf(() => checkCancellation(booking, 3, now)).code).toBe('NOT_YOUR_BOOKING');
  });

  it('refuses once the booking has started', () => {
    expect(errorOf(() => checkCancellation(booking, 2, at('2026-11-03', '10:00'))).code).toBe('ALREADY_STARTED');
  });

  it('refuses a booking already cancelled', () => {
    const cancelled = { ...booking, cancelledAt: now.toISOString() };
    expect(errorOf(() => checkCancellation(cancelled, 2, now)).code).toBe('ALREADY_CANCELLED');
  });
});
