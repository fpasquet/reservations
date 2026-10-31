/** The booking as repositories store it. */
export interface StoredBooking {
  id: number;
  room: { id: number; name: string };
  member: { id: number; fullName: string };
  title: string;
  /** Nombre de participants annoncé, s'il a été donné. */
  attendees: number | null;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  /** Une réservation annulée est gardée, avec la date de son annulation. */
  cancelledAt: string | null;
  /** When the member signaled their arrival. */
  arrivedAt: string | null;
}

/** What the API returns: release is derived from the time, not stored. */
export interface Booking extends StoredBooking {
  /** Set when the arrival was not signaled in time: the room became free again at this instant. */
  releasedAt: string | null;
}

/** Ce que demande un membre ; les instants sont des dates ISO 8601 avec fuseau. */
export interface BookingRequest {
  roomId: number;
  title: string;
  attendees: number | null;
  startsAt: Date;
  endsAt: Date;
}

export interface NewBooking extends BookingRequest {
  memberId: number;
}
