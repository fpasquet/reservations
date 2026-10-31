import { describe, expect, it } from 'vitest';
import { parisInstant } from './paris-time';
import {
  agenda,
  firstBookableStart,
  freeSlots,
  gridColumns,
  prefillFor,
  slotStarts,
  spanOn,
  timeOptions,
} from './schedule';

const date = '2026-11-03';
const booking = (from: number, to: number, day = date) => ({
  startsAt: parisInstant(day, from).toISOString(),
  endsAt: parisInstant(day, to).toISOString(),
});

describe('slotStarts', () => {
  it('cuts the opening hours into 24 half hours', () => {
    const starts = slotStarts();
    expect(starts).toHaveLength(24);
    expect(starts[0]).toBe(480);
    expect(starts.at(-1)).toBe(1170);
  });
});

describe('timeOptions', () => {
  it('steps by a quarter hour, both ends included', () => {
    expect(timeOptions(480, 540)).toEqual([480, 495, 510, 525, 540]);
  });
});

describe('spanOn', () => {
  it('places a booking of the day', () => {
    expect(spanOn(booking(600, 690), date)).toEqual({ from: 600, to: 690 });
  });

  it('ignores a booking of another day', () => {
    expect(spanOn(booking(600, 690, '2026-11-04'), date)).toBeNull();
  });
});

describe('gridColumns', () => {
  it('turns a span into grid columns, one per quarter hour', () => {
    expect(gridColumns({ from: 480, to: 540 })).toEqual({ start: 1, end: 5 });
    expect(gridColumns({ from: 615, to: 1200 })).toEqual({ start: 10, end: 49 });
  });
});

describe('freeSlots', () => {
  it('leaves out the half hours a booking touches', () => {
    const free = freeSlots([{ from: 555, to: 600 }], null);
    expect(free).not.toContain(540);
    expect(free).not.toContain(570);
    expect(free).toContain(600);
    expect(free).toContain(510);
  });

  it('leaves out the half hours already over today', () => {
    const free = freeSlots([], 10 * 60 + 10);
    expect(free[0]).toBe(600);
  });
});

describe('prefillFor', () => {
  it('proposes one hour from the slot', () => {
    expect(prefillFor(600, [], null)).toEqual({ from: 600, to: 660 });
  });

  it('stops at the next booking', () => {
    expect(prefillFor(600, [{ from: 630, to: 700 }], null)).toEqual({ from: 600, to: 630 });
  });

  it('starts at the next quarter hour when the slot has begun', () => {
    expect(prefillFor(600, [], 607)).toEqual({ from: 615, to: 675 });
  });
});

describe('agenda', () => {
  it('fills the gaps between bookings with free time', () => {
    const items = agenda([
      { span: { from: 600, to: 660 }, booking: 'b' },
      { span: { from: 540, to: 600 }, booking: 'a' },
    ]);
    expect(items).toEqual([
      { kind: 'free', from: 480, to: 540 },
      { kind: 'booking', from: 540, to: 600, booking: 'a' },
      { kind: 'booking', from: 600, to: 660, booking: 'b' },
      { kind: 'free', from: 660, to: 1200 },
    ]);
  });

  it('is one free span on an empty day', () => {
    expect(agenda([])).toEqual([{ kind: 'free', from: 480, to: 1200 }]);
  });
});

describe('firstBookableStart', () => {
  const now = { date: '2026-11-03', minutes: 10 * 60 + 5 };

  it('starts at the next quarter hour today', () => {
    expect(firstBookableStart('2026-11-03', now)).toEqual({ date: '2026-11-03', from: 615 });
  });

  it('starts at 9h00 another day, and never in the past', () => {
    expect(firstBookableStart('2026-11-05', now)).toEqual({ date: '2026-11-05', from: 540 });
    expect(firstBookableStart('2026-11-01', now)).toEqual({ date: '2026-11-03', from: 615 });
  });

  it('moves to the next day after the last quarter hour', () => {
    expect(firstBookableStart('2026-11-03', { date: '2026-11-03', minutes: 19 * 60 + 50 })).toEqual({
      date: '2026-11-04',
      from: 540,
    });
  });
});
