import { DomainError, type ErrorCode } from '../shared/domain-error.js';
import { addDays, isWeekend, parisDateTime, parisInstant } from '../shared/paris-time.js';
import { checkSlot, overlaps } from './booking-rules.js';

export const MIN_WEEKS = 2;
export const MAX_WEEKS = 12;

interface Slot {
  startsAt: Date;
  endsAt: Date;
}

/**
 * Le créneau de chaque semaine, à la même heure de Paris : l'heure d'été ou d'hiver ne décale pas la série
 * (ajouter 7 × 24 h déplacerait les occurrences d'une heure).
 */
export function weeklySlots(first: Slot, weeks: number): Slot[] {
  const start = parisDateTime(first.startsAt);
  const end = parisDateTime(first.endsAt);
  return Array.from({ length: weeks }, (_, week) => ({
    startsAt: parisInstant(addDays(start.date, week * 7), start.minutes),
    endsAt: parisInstant(addDays(end.date, week * 7), end.minutes),
  }));
}

/** Pourquoi cette occurrence ne peut pas être réservée, ou null si elle est libre. */
export function occurrenceConflict(slot: Slot, now: Date, booked: Slot[]): ErrorCode | null {
  if (isWeekend(parisDateTime(slot.startsAt).date)) return 'WEEKEND';
  try {
    checkSlot(slot, now);
  } catch (error) {
    if (error instanceof DomainError) return error.code;
    throw error;
  }
  return booked.some((other) => overlaps(slot, other)) ? 'ROOM_ALREADY_BOOKED' : null;
}
