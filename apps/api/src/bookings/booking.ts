import type { ErrorCode } from '../shared/domain-error.js';

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
  /** La série hebdomadaire dont la réservation est une occurrence, s'il y en a une. */
  seriesId: number | null;
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

/** Une réservation répétée chaque semaine, sur 2 à 12 semaines, à partir du créneau demandé. */
export interface SeriesRequest extends BookingRequest {
  weeks: number;
}

/** Une occurrence d'une série ; `conflict` est le code de la raison pour laquelle elle ne peut pas être réservée. */
export interface Occurrence {
  startsAt: string;
  endsAt: string;
  conflict: ErrorCode | null;
}

/** Ce qui est créé avec une série : la série, ses occurrences libres. */
export interface NewSeries {
  memberId: number;
  roomId: number;
  title: string;
  attendees: number | null;
  weeks: number;
  slots: { startsAt: Date; endsAt: Date }[];
}

export interface SeriesCreated {
  seriesId: number;
  bookings: Booking[];
}
