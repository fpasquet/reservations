import { describe, expect, it } from 'vitest';
import { bookingCostCents, floorLabel, formatEuros, hourlyRateLabel, seatsLabel } from './rooms';

describe('floorLabel', () => {
  it('names the floors in French', () => {
    expect(floorLabel(0)).toBe('Rez-de-chaussée');
    expect(floorLabel(1)).toBe('1er étage');
    expect(floorLabel(2)).toBe('2e étage');
  });
});

describe('seatsLabel', () => {
  it('agrees with the number of seats', () => {
    expect(seatsLabel(1)).toBe('1 place');
    expect(seatsLabel(14)).toBe('14 places');
  });
});

describe('hourlyRateLabel', () => {
  it('formats the rate in French, excluding tax', () => {
    expect(hourlyRateLabel(2500).replace(/\s/g, ' ')).toBe('25,00 € HT / h');
    expect(hourlyRateLabel(800).replace(/\s/g, ' ')).toBe('8,00 € HT / h');
  });
});

describe('formatEuros', () => {
  it('uses a comma and two decimals', () => {
    expect(formatEuros(1250).replace(/\s/g, ' ')).toBe('12,50 €');
  });
});

describe('bookingCostCents', () => {
  it('multiplies the rate by the duration', () => {
    expect(bookingCostCents(2500, 60)).toBe(2500);
    expect(bookingCostCents(2500, 90)).toBe(3750);
    expect(bookingCostCents(4000, 480)).toBe(32000);
  });

  it('is exact at the quarter hour', () => {
    expect(bookingCostCents(800, 15)).toBe(200);
    expect(bookingCostCents(1500, 45)).toBe(1125);
    expect(bookingCostCents(1800, 15)).toBe(450);
  });

  it('rounds to the cent', () => {
    expect(bookingCostCents(2200, 15)).toBe(550);
    expect(bookingCostCents(1, 15)).toBe(0);
  });
});
