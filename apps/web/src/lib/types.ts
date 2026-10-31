export const EQUIPMENT = ['screen', 'videoconference', 'whiteboard', 'speakerphone', 'step_free_access'] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export interface Room {
  id: number;
  name: string;
  floor: number;
  capacity: number;
  equipment: Equipment[];
  color: string;
  description: string;
}

export interface Member {
  id: number;
  fullName: string;
  email: string;
  company: string;
}

export interface Booking {
  id: number;
  room: { id: number; name: string };
  member: { id: number; fullName: string };
  title: string;
  attendees: number | null;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  cancelledAt: string | null;
  /** La série hebdomadaire dont la réservation est une occurrence, s'il y en a une. */
  seriesId: number | null;
}

export interface BookingRequest {
  roomId: number;
  title: string;
  attendees: number | null;
  startsAt: string;
  endsAt: string;
}

export interface SeriesRequest extends BookingRequest {
  weeks: number;
}

/** Une occurrence d'une série ; `conflict` est le code d'erreur de l'API qui l'empêche, null si elle est libre. */
export interface Occurrence {
  startsAt: string;
  endsAt: string;
  conflict: string | null;
}

export interface SeriesCreated {
  seriesId: number;
  bookings: Booking[];
  conflicts: Occurrence[];
}
