export interface Booking {
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
