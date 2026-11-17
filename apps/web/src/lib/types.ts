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
}

export interface BookingRequest {
  roomId: number;
  title: string;
  attendees: number | null;
  startsAt: string;
  endsAt: string;
}
