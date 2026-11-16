import type { Booking, WaitlistEntry } from './types';

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

/** Le créneau est proposé au membre et son délai de confirmation n'est pas écoulé. */
export function canConfirm(entry: WaitlistEntry, now: Date): boolean {
  return entry.offerExpiresAt !== null && new Date(entry.offerExpiresAt) > now;
}

/** Les inscriptions dont le créneau n'est pas passé, de la plus proche à la plus lointaine. */
export function upcomingEntries(entries: WaitlistEntry[], now: Date): WaitlistEntry[] {
  return entries.filter((entry) => new Date(entry.startsAt) > now).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
