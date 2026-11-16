import type { BookingRequest } from '../bookings/booking.js';

export interface WaitlistEntry {
  id: number;
  room: { id: number; name: string };
  member: { id: number; fullName: string };
  title: string;
  attendees: number | null;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  /** Quand le créneau s'est libéré et a été proposé au membre ; null tant qu'il attend. */
  offeredAt: string | null;
  /** Fin du délai de confirmation, 30 minutes après la proposition. */
  offerExpiresAt: string | null;
}

export interface NewWaitlistEntry extends BookingRequest {
  memberId: number;
}
