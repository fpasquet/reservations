import type { Booking, NewBooking, NewSeries, SeriesCreated } from './booking.js';

export const BOOKINGS_REPOSITORY = Symbol('BOOKINGS_REPOSITORY');

export interface BookingsRepository {
  /** Réservations qui recouvrent l'intervalle [from, to[, par heure de début ; `roomId` restreint à une salle. */
  listBetween(from: Date, to: Date, roomId?: number): Promise<Booking[]>;
  /** Réservations d'un membre, par heure de début. */
  listByMember(memberId: number): Promise<Booking[]>;
  get(id: number): Promise<Booking | null>;
  create(booking: NewBooking): Promise<Booking>;
  cancel(id: number, at: Date): Promise<Booking>;
  /** Crée la série et ses occurrences ensemble : toutes, ou aucune si l'une échoue. */
  createSeries(series: NewSeries): Promise<SeriesCreated>;
  /** Le membre propriétaire de la série, ou null si elle n'existe pas. */
  getSeriesOwner(seriesId: number): Promise<number | null>;
  /** Annule les occurrences de la série qui commencent après `after` et ne le sont pas déjà. */
  cancelSeriesAfter(seriesId: number, after: Date, at: Date): Promise<Booking[]>;
}
