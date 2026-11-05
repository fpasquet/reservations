import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spanOn } from './schedule';
import {
  addDays,
  formatDay,
  formatMinutes,
  isIsoDate,
  parisDateTime,
  parisInstant,
  parseTime,
  toTimeValue,
} from './paris-time';

describe('parisInstant', () => {
  it('reads a Paris time whatever the season', () => {
    expect(parisInstant('2026-11-03', 9 * 60).toISOString()).toBe('2026-11-03T08:00:00.000Z');
    expect(parisInstant('2026-06-03', 9 * 60).toISOString()).toBe('2026-06-03T07:00:00.000Z');
  });

  it('is the inverse of parisDateTime', () => {
    expect(parisDateTime(parisInstant('2026-11-03', 19 * 60 + 45))).toEqual({ date: '2026-11-03', minutes: 1185 });
  });
});

describe('dates', () => {
  it('adds days across months', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });

  it('validates dates', () => {
    expect(isIsoDate('2026-11-03')).toBe(true);
    expect(isIsoDate('2026-11-31')).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });

  it('formats a day in French, with the year when it differs', () => {
    expect(formatDay('2026-11-03')).toBe('mardi 3 novembre');
    expect(formatDay('2027-01-04', '2026-12-30')).toBe('lundi 4 janvier 2027');
  });
});

describe('times', () => {
  it('converts between minutes and labels', () => {
    expect(formatMinutes(9 * 60)).toBe('9h00');
    expect(formatMinutes(14 * 60 + 15)).toBe('14h15');
    expect(parseTime('09:45')).toBe(585);
    expect(toTimeValue(585)).toBe('09:45');
  });
});

describe('daylight saving days', () => {
  it('reads 8h00 and 20h00 with the offset in force on 29 March 2026 (UTC+1 → UTC+2 at 2h)', () => {
    expect(parisInstant('2026-03-29', 8 * 60).toISOString()).toBe('2026-03-29T06:00:00.000Z');
    expect(parisInstant('2026-03-29', 20 * 60).toISOString()).toBe('2026-03-29T18:00:00.000Z');
    expect(parisInstant('2026-03-29', 0).toISOString()).toBe('2026-03-28T23:00:00.000Z');
  });

  it('reads 8h00 and 20h00 with the offset in force on 25 October 2026 (UTC+2 → UTC+1 at 3h)', () => {
    expect(parisInstant('2026-10-25', 8 * 60).toISOString()).toBe('2026-10-25T07:00:00.000Z');
    expect(parisInstant('2026-10-25', 20 * 60).toISOString()).toBe('2026-10-25T19:00:00.000Z');
    expect(parisInstant('2026-10-25', 0).toISOString()).toBe('2026-10-24T22:00:00.000Z');
  });

  it('round-trips every quarter hour of the opening hours', () => {
    for (const date of ['2026-03-29', '2026-10-25']) {
      for (let minutes = 8 * 60; minutes <= 20 * 60; minutes += 15) {
        expect(parisDateTime(parisInstant(date, minutes))).toEqual({ date, minutes });
      }
    }
  });
});

describe.each(['America/Montreal', 'Asia/Tokyo', 'Europe/Paris'])('with a browser set to %s', (browserZone) => {
  const initialZone = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = browserZone;
  });
  afterAll(() => {
    if (initialZone === undefined) delete process.env.TZ;
    else process.env.TZ = initialZone;
  });

  it('shows a booking at its Paris time', () => {
    const booking = { startsAt: '2026-11-03T09:00:00+01:00', endsAt: '2026-11-03T10:30:00+01:00' };
    expect(spanOn(booking, '2026-11-03')).toEqual({ from: 540, to: 630 });
    expect(spanOn(booking, '2026-11-02')).toBeNull();
    expect(spanOn(booking, '2026-11-04')).toBeNull();
  });

  it('keeps the Paris day for a booking that is on another date locally', () => {
    // 8h00 à Paris, c'est encore la veille à Montréal et déjà 16h00 à Tokyo.
    const booking = { startsAt: '2026-03-29T08:00:00+02:00', endsAt: '2026-03-29T20:00:00+02:00' };
    expect(spanOn(booking, '2026-03-29')).toEqual({ from: 480, to: 1200 });
    expect(spanOn(booking, '2026-03-28')).toBeNull();
  });

  it('places bookings on the changeover days at the right hour', () => {
    const march = { startsAt: '2026-03-29T10:00:00+02:00', endsAt: '2026-03-29T11:00:00+02:00' };
    const october = { startsAt: '2026-10-25T10:00:00+01:00', endsAt: '2026-10-25T11:00:00+01:00' };
    expect(spanOn(march, '2026-03-29')).toEqual({ from: 600, to: 660 });
    expect(spanOn(october, '2026-10-25')).toEqual({ from: 600, to: 660 });
  });

  it('reads the date and time of an instant in Paris', () => {
    expect(parisDateTime(new Date('2026-03-29T06:00:00Z'))).toEqual({ date: '2026-03-29', minutes: 480 });
    expect(parisDateTime(new Date('2026-10-25T19:00:00Z'))).toEqual({ date: '2026-10-25', minutes: 1200 });
    expect(parisInstant('2026-10-25', 9 * 60).toISOString()).toBe('2026-10-25T08:00:00.000Z');
  });

  it('formats the day label from the date alone', () => {
    expect(formatDay('2026-03-29')).toBe('dimanche 29 mars');
    expect(formatDay('2026-10-25')).toBe('dimanche 25 octobre');
  });
});
