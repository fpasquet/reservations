import type { Booking, NewBooking } from './booking.js';

export const BOOKINGS_REPOSITORY = Symbol('BOOKINGS_REPOSITORY');

export interface BookingsRepository {
  /** Réservations qui recouvrent l'intervalle [from, to[, par heure de début ; `roomId` restreint à une salle. */
  listBetween(from: Date, to: Date, roomId?: number): Promise<Booking[]>;
  /** Réservations d'un membre, par heure de début. */
  listByMember(memberId: number): Promise<Booking[]>;
  get(id: number): Promise<Booking | null>;
  create(booking: NewBooking): Promise<Booking>;
  cancel(id: number, at: Date): Promise<Booking>;
}
