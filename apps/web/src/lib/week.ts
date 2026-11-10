import { addDays } from './paris-time';
import { CLOSING_TIME, OPENING_TIME, type Span, spanOn } from './schedule';
import type { Booking } from './types';

/** Le lundi de la semaine qui contient cette date. */
export function weekStart(date: string): string {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

/** Du lundi au vendredi de la semaine qui contient cette date. */
export function weekDays(date: string): string[] {
  const monday = weekStart(date);
  return Array.from({ length: 5 }, (_, index) => addDays(monday, index));
}

/** Part des horaires d'ouverture réservée ce jour-là dans cette salle, de 0 à 1 ; les annulations ne comptent pas. */
export function occupancy(bookings: Booking[], roomId: number, date: string): number {
  const spans = bookings
    .filter((booking) => booking.room.id === roomId && booking.cancelledAt === null)
    .flatMap((booking): Span[] => {
      const span = spanOn(booking, date);
      return span ? [span] : [];
    })
    .sort((a, b) => a.from - b.from);

  // Les réservations ne se chevauchent pas, mais on ne compte jamais deux fois une même minute.
  let busy = 0;
  let cursor = OPENING_TIME;
  for (const { from, to } of spans) {
    busy += Math.max(0, to - Math.max(from, cursor));
    cursor = Math.max(cursor, to);
  }
  return busy / (CLOSING_TIME - OPENING_TIME);
}
