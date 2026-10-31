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

const QUARTER_HOUR = 15 * 60_000;

/** Le membre peut encore annuler : la réservation n'est ni annulée, ni libérée, ni commencée. */
export function isCancellable(booking: Booking, now: Date): boolean {
  return booking.cancelledAt === null && booking.releasedAt === null && new Date(booking.startsAt) > now;
}

/** Le bouton « Je suis arrivé » : de 15 minutes avant le début jusqu'à la libération, 15 minutes après. */
export function canSignalArrival(booking: Booking, now: Date): boolean {
  if (booking.cancelledAt !== null || booking.arrivedAt !== null || booking.releasedAt !== null) return false;
  const start = new Date(booking.startsAt).getTime();
  return now.getTime() >= start - QUARTER_HOUR && now.getTime() < start + QUARTER_HOUR;
}
