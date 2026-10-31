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

/** Le membre peut encore annuler : la réservation n'est ni annulée ni commencée. */
export function isCancellable(booking: Booking, now: Date): boolean {
  return booking.cancelledAt === null && new Date(booking.startsAt) > now;
}
