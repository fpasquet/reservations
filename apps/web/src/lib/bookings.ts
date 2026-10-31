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

/** Les inscriptions dont le créneau n'a pas commencé, les offres à confirmer d'abord puis par heure de début. */
export function activeWaitlist(entries: WaitlistEntry[], now: Date): WaitlistEntry[] {
  return entries
    .filter((entry) => new Date(entry.startsAt) > now)
    .sort(
      (a, b) => Number(b.offeredAt !== null) - Number(a.offeredAt !== null) || a.startsAt.localeCompare(b.startsAt),
    );
}

/** Une offre dont le délai de confirmation n'est pas écoulé. */
export function isOfferOpen(entry: WaitlistEntry, now: Date): boolean {
  return entry.offerExpiresAt !== null && new Date(entry.offerExpiresAt) > now;
}
