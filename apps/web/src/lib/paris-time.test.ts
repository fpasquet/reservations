import { describe, expect, it } from 'vitest';
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
