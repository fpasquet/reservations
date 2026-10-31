import { describe, expect, it } from 'vitest';
import { floorLabel, seatsLabel } from './rooms';

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
