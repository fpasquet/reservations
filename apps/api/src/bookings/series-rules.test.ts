import { describe, expect, it } from 'vitest';
import { parisInstant } from '../shared/paris-time.js';
import { occurrenceConflict, weeklySlots } from './series-rules.js';

const now = new Date('2026-11-02T08:00:00Z');
const slotOn = (date: string, from = 10 * 60, to = 11 * 60) => ({
  startsAt: parisInstant(date, from),
  endsAt: parisInstant(date, to),
});

describe('weeklySlots', () => {
  it('repeats the slot every seven days', () => {
    const slots = weeklySlots(slotOn('2026-11-03'), 3);
    expect(slots.map((slot) => slot.startsAt.toISOString())).toEqual([
      '2026-11-03T09:00:00.000Z',
      '2026-11-10T09:00:00.000Z',
      '2026-11-17T09:00:00.000Z',
    ]);
    expect(slots[2]?.endsAt.toISOString()).toBe('2026-11-17T10:00:00.000Z');
  });

  it('keeps the Paris wall-clock time across the change of hour', () => {
    // Le 25 octobre 2026, Paris repasse à l'heure d'hiver : 10h00 reste 10h00, soit 08h00 puis 09h00 UTC.
    const slots = weeklySlots(slotOn('2026-10-20'), 2);
    expect(slots.map((slot) => slot.startsAt.toISOString())).toEqual([
      '2026-10-20T08:00:00.000Z',
      '2026-10-27T09:00:00.000Z',
    ]);
  });
});

describe('occurrenceConflict', () => {
  it('is null for a free slot', () => {
    expect(occurrenceConflict(slotOn('2026-11-03'), now, [])).toBeNull();
  });

  it('reports a weekend', () => {
    expect(occurrenceConflict(slotOn('2026-11-07'), now, [])).toBe('WEEKEND');
    expect(occurrenceConflict(slotOn('2026-11-08'), now, [])).toBe('WEEKEND');
  });

  it('reports a slot outside opening hours', () => {
    expect(occurrenceConflict(slotOn('2026-11-03', 19 * 60 + 30, 20 * 60 + 30), now, [])).toBe('OUTSIDE_OPENING_HOURS');
  });

  it('reports a slot in the past', () => {
    expect(occurrenceConflict(slotOn('2026-10-30'), now, [])).toBe('IN_THE_PAST');
  });

  it('reports a room already booked, but not a booking that ends when the slot starts', () => {
    expect(occurrenceConflict(slotOn('2026-11-03'), now, [slotOn('2026-11-03', 10 * 60 + 30, 12 * 60)])).toBe(
      'ROOM_ALREADY_BOOKED',
    );
    expect(occurrenceConflict(slotOn('2026-11-03'), now, [slotOn('2026-11-03', 9 * 60, 10 * 60)])).toBeNull();
  });
});
