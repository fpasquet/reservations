import type { NewBooking, StoredBooking } from './booking.js';

export const BOOKINGS_REPOSITORY = Symbol('BOOKINGS_REPOSITORY');

export interface BookingsRepository {
  /** Réservations qui recouvrent l'intervalle [from, to[, par heure de début ; `roomId` restreint à une salle. */
  listBetween(from: Date, to: Date, roomId?: number): Promise<StoredBooking[]>;
  /** Réservations d'un membre, par heure de début. */
  listByMember(memberId: number): Promise<StoredBooking[]>;
  get(id: number): Promise<StoredBooking | null>;
  create(booking: NewBooking): Promise<StoredBooking>;
  cancel(id: number, at: Date): Promise<StoredBooking>;
  markArrived(id: number, at: Date): Promise<StoredBooking>;
}
