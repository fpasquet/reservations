import type { BookingRequest } from '../bookings/booking.js';

/** Minutes dont dispose le membre prévenu pour confirmer sa réservation. */
export const OFFER_MINUTES = 30;

export interface WaitlistEntry {
  id: number;
  room: { id: number; name: string };
  member: { id: number; fullName: string };
  title: string;
  attendees: number | null;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  /** Posés quand la salle s'est libérée et que le membre est prévenu : il a jusqu'à `offerExpiresAt` pour confirmer. */
  offeredAt: string | null;
  offerExpiresAt: string | null;
}

export type NewWaitlistEntry = BookingRequest & { memberId: number };
