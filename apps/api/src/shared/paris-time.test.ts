import { describe, expect, it } from 'vitest';
import { isIsoDate, nextDate, parisDateTime, parisDayRange, parisInstant } from './paris-time.js';

describe('parisInstant', () => {
  it('reads a winter time as UTC+1 and a summer time as UTC+2', () => {
    expect(parisInstant('2026-01-15', 9 * 60).toISOString()).toBe('2026-01-15T08:00:00.000Z');
    expect(parisInstant('2026-07-15', 9 * 60).toISOString()).toBe('2026-07-15T07:00:00.000Z');
  });

  it('is the inverse of parisDateTime', () => {
    const instant = parisInstant('2026-11-03', 14 * 60 + 45);
    expect(parisDateTime(instant)).toEqual({ date: '2026-11-03', minutes: 14 * 60 + 45 });
  });
});

describe('parisDayRange', () => {
  it('covers a whole Paris day', () => {
    const { from, to } = parisDayRange('2026-11-03');
    expect(from.toISOString()).toBe('2026-11-02T23:00:00.000Z');
    expect(to.toISOString()).toBe('2026-11-03T23:00:00.000Z');
  });
});

describe('isIsoDate', () => {
  it('accepts real calendar dates only', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('03/11/2026')).toBe(false);
  });
});

describe('nextDate', () => {
  it('moves to the next month and year', () => {
    expect(nextDate('2026-12-31')).toBe('2027-01-01');
  });
});

describe('daylight saving days', () => {
  it('reads 8h00 and 20h00 with the offset in force each changeover day', () => {
    expect(parisInstant('2026-03-29', 8 * 60).toISOString()).toBe('2026-03-29T06:00:00.000Z');
    expect(parisInstant('2026-03-29', 20 * 60).toISOString()).toBe('2026-03-29T18:00:00.000Z');
    expect(parisInstant('2026-10-25', 8 * 60).toISOString()).toBe('2026-10-25T07:00:00.000Z');
    expect(parisInstant('2026-10-25', 20 * 60).toISOString()).toBe('2026-10-25T19:00:00.000Z');
  });

  it('covers a 23 h day in March and a 25 h day in October', () => {
    const hours = (date: string) => {
      const { from, to } = parisDayRange(date);
      return (to.getTime() - from.getTime()) / 3_600_000;
    };
    expect(hours('2026-03-29')).toBe(23);
    expect(hours('2026-10-25')).toBe(25);
  });

  it('round-trips every quarter hour of the opening hours', () => {
    for (const date of ['2026-03-29', '2026-10-25']) {
      for (let minutes = 8 * 60; minutes <= 20 * 60; minutes += 15) {
        expect(parisDateTime(parisInstant(date, minutes))).toEqual({ date, minutes });
      }
    }
  });

  it.each(['America/Montreal', 'Asia/Tokyo'])('does not depend on the server zone (%s)', (zone) => {
    const initial = process.env.TZ;
    process.env.TZ = zone;
    try {
      expect(parisInstant('2026-03-29', 8 * 60).toISOString()).toBe('2026-03-29T06:00:00.000Z');
      expect(parisDateTime(new Date('2026-10-25T19:00:00Z'))).toEqual({ date: '2026-10-25', minutes: 1200 });
    } finally {
      if (initial === undefined) delete process.env.TZ;
      else process.env.TZ = initial;
    }
  });
});
