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
