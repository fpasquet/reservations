import { describe, expect, it } from 'vitest';
import { creditLabel, formatHours } from './credit';

describe('formatHours', () => {
  it('uses the French decimal comma', () => {
    expect(formatHours(10)).toBe('10 h');
    expect(formatHours(7.5)).toBe('7,5 h');
    expect(formatHours(0.25)).toBe('0,25 h');
  });
});

describe('creditLabel', () => {
  it('tells the hours left this month', () => {
    const credit = { plan: 'nomade', month: '2026-11', monthlyHours: 10, usedHours: 2.5, remainingHours: 7.5 } as const;
    expect(creditLabel(credit)).toBe('7,5 h restantes ce mois-ci');
  });

  it('says so when the plan is unlimited', () => {
    const credit = {
      plan: 'equipe',
      month: '2026-11',
      monthlyHours: null,
      usedHours: 80,
      remainingHours: null,
    } as const;
    expect(creditLabel(credit)).toBe('Heures illimitées');
  });
});
