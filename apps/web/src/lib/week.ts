import { addDays } from './paris-time';
import { CLOSING_TIME, OPENING_TIME, type Span, spanOn } from './schedule';
import type { Booking } from './types';

export const WEEK_DAYS = 5;

/** Le lundi de la semaine qui contient cette date (le week-end renvoie le lundi précédent). */
export function mondayOf(date: string): string {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

/** Du lundi au vendredi de la semaine qui contient cette date. */
export function weekDays(date: string): string[] {
  const monday = mondayOf(date);
  return Array.from({ length: WEEK_DAYS }, (_, index) => addDays(monday, index));
}

/** Part de la journée d'ouverture réservée dans une salle, de 0 à 100 : les chevauchements ne comptent qu'une fois. */
export function occupancy(bookings: Booking[], roomId: number, date: string): number {
  const spans = bookings
    .filter((booking) => booking.room.id === roomId)
    .flatMap((booking) => {
      const span = spanOn(booking, date);
      return span ? [span] : [];
    })
    .sort((a, b) => a.from - b.from);

  let booked = 0;
  let last: Span | undefined;
  for (const span of spans) {
    const from = last ? Math.max(span.from, last.to) : span.from;
    if (span.to > from) booked += span.to - from;
    if (!last || span.to > last.to) last = span;
  }
  return Math.round((booked / (CLOSING_TIME - OPENING_TIME)) * 100);
}
