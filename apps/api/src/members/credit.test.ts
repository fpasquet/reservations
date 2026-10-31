import { describe, expect, it } from 'vitest';
import { DomainError } from '../shared/domain-error.js';
import { checkCredit, creditOf, parisMonthRange, usedMinutes } from './credit.js';

const slot = (startsAt: string, endsAt: string) => ({ startsAt: new Date(startsAt), endsAt: new Date(endsAt) });
const oneHour = slot('2026-11-03T09:00:00Z', '2026-11-03T10:00:00Z');

describe('parisMonthRange', () => {
  it('starts on the 1st at midnight in Paris', () => {
    const { month, from, to } = parisMonthRange(new Date('2026-11-15T12:00:00Z'));
    expect(month).toBe('2026-11');
    expect(from.toISOString()).toBe('2026-10-31T23:00:00.000Z');
    expect(to.toISOString()).toBe('2026-11-30T23:00:00.000Z');
  });

  it('is still the previous month just before midnight in Paris', () => {
    // 2026-10-31T23:30Z est le 1er novembre à 0h30 à Paris ; 22:30Z est encore le 31 octobre.
    expect(parisMonthRange(new Date('2026-10-31T22:30:00Z')).month).toBe('2026-10');
    expect(parisMonthRange(new Date('2026-10-31T23:30:00Z')).month).toBe('2026-11');
  });

  it('rolls over the year and follows summer time', () => {
    const { from, to } = parisMonthRange(new Date('2026-12-20T12:00:00Z'));
    expect(from.toISOString()).toBe('2026-11-30T23:00:00.000Z');
    expect(to.toISOString()).toBe('2026-12-31T23:00:00.000Z');
    expect(parisMonthRange(new Date('2026-07-10T12:00:00Z')).from.toISOString()).toBe('2026-06-30T22:00:00.000Z');
  });
});

describe('usedMinutes', () => {
  it('adds up the durations', () => {
    expect(usedMinutes([oneHour, slot('2026-11-04T09:00:00Z', '2026-11-04T10:30:00Z')])).toBe(150);
  });
});

describe('creditOf', () => {
  const now = new Date('2026-11-10T10:00:00Z');

  it('gives the hours left of a limited plan', () => {
    expect(creditOf('nomade', now, 150)).toEqual({
      plan: 'nomade',
      month: '2026-11',
      monthlyHours: 10,
      usedHours: 2.5,
      remainingHours: 7.5,
    });
  });

  it('has no limit for the team plan', () => {
    expect(creditOf('equipe', now, 6000)).toMatchObject({ monthlyHours: null, remainingHours: null });
  });
});

describe('checkCredit', () => {
  it('accepts a booking that uses up the credit exactly', () => {
    expect(() => checkCredit('nomade', oneHour, 9 * 60)).not.toThrow();
  });

  it('refuses a booking beyond the credit', () => {
    const attempt = () => checkCredit('nomade', oneHour, 9 * 60 + 15);
    expect(attempt).toThrow(DomainError);
    expect(attempt).toThrow(expect.objectContaining({ code: 'CREDIT_EXCEEDED', status: 400 }));
  });

  it('gives the resident plan 40 hours', () => {
    expect(() => checkCredit('resident', oneHour, 39 * 60)).not.toThrow();
    expect(() => checkCredit('resident', oneHour, 39 * 60 + 1)).toThrow(DomainError);
  });

  it('never refuses the team plan', () => {
    expect(() => checkCredit('equipe', oneHour, 10_000 * 60)).not.toThrow();
  });
});
