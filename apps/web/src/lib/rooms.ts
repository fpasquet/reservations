import type { Equipment } from './types';

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  screen: 'Écran',
  videoconference: 'Visio',
  whiteboard: 'Tableau blanc',
  speakerphone: 'Pieuvre',
  step_free_access: 'Accès PMR',
};

/** « Rez-de-chaussée », « 1er étage », « 2e étage » */
export function floorLabel(floor: number): string {
  if (floor === 0) return 'Rez-de-chaussée';
  return floor === 1 ? '1er étage' : `${floor}e étage`;
}

/** « 1 place », « 14 places » */
export function seatsLabel(capacity: number): string {
  return capacity > 1 ? `${capacity} places` : `${capacity} place`;
}
