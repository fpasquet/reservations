import { describe, expect, it } from 'vitest';
import { floorLabel, matchesRoomName, seatsLabel } from './rooms';

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

describe('matchesRoomName', () => {
  it('matches every room when the search is empty or blank', () => {
    expect(matchesRoomName('Atelier', '')).toBe(true);
    expect(matchesRoomName('Atelier', '   ')).toBe(true);
  });

  it('matches part of the name', () => {
    expect(matchesRoomName('Salon Verrière', 'salon')).toBe(true);
    expect(matchesRoomName('Cabine 2', 'bine 2')).toBe(true);
    expect(matchesRoomName('Atelier', 'studio')).toBe(false);
  });

  it('ignores case', () => {
    expect(matchesRoomName('La Serre', 'LA SERRE')).toBe(true);
    expect(matchesRoomName('Studio', 'sTuDiO')).toBe(true);
  });

  it('ignores accents, in the name as in the search', () => {
    expect(matchesRoomName('Bibliothèque', 'bibliotheque')).toBe(true);
    expect(matchesRoomName('Salon Verrière', 'verriere')).toBe(true);
    expect(matchesRoomName('Atelier', 'atélier')).toBe(true);
  });

  it('treats typographic and straight apostrophes alike', () => {
    expect(matchesRoomName("Salle d'Été", 'salle d’ete')).toBe(true);
  });
});
