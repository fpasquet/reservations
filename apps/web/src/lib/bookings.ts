import type { Booking } from './types';

/** Les réservations d'un membre, à venir (de la plus proche à la plus lointaine) et passées (de la plus récente). */
export function splitByTime(bookings: Booking[], now: Date): { upcoming: Booking[]; past: Booking[] } {
  const upcoming = bookings
    .filter((booking) => new Date(booking.startsAt) > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = bookings
    .filter((booking) => !upcoming.includes(booking))
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return { upcoming, past };
}

export const MIN_WEEKS = 2;
export const MAX_WEEKS = 12;

/** Une réservation seule, ou les occurrences d'une même série, dans l'ordre où elles apparaissent dans la liste. */
export type BookingGroup =
  { kind: 'single'; booking: Booking } | { kind: 'series'; seriesId: number; bookings: Booking[] };

/** Regroupe les occurrences d'une série en une entrée, à la place de sa première occurrence. */
export function groupBySeries(bookings: Booking[]): BookingGroup[] {
  const groups: BookingGroup[] = [];
  const bySeries = new Map<number, Booking[]>();
  for (const booking of bookings) {
    if (booking.seriesId === null) {
      groups.push({ kind: 'single', booking });
      continue;
    }
    const known = bySeries.get(booking.seriesId);
    if (known) {
      known.push(booking);
    } else {
      const occurrences = [booking];
      bySeries.set(booking.seriesId, occurrences);
      groups.push({ kind: 'series', seriesId: booking.seriesId, bookings: occurrences });
    }
  }
  return groups;
}

/** Le membre peut encore annuler : la réservation n'est ni annulée ni commencée. */
export function isCancellable(booking: Booking, now: Date): boolean {
  return booking.cancelledAt === null && new Date(booking.startsAt) > now;
}
