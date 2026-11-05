import type { Booking, NewBooking } from '../bookings/booking.js';
import type { BookingsRepository } from '../bookings/bookings.repository.js';
import type { Member } from '../members/member.js';
import type { MembersRepository } from '../members/members.repository.js';
import type { Room, RoomFilters } from '../rooms/room.js';
import type { RoomsRepository } from '../rooms/rooms.repository.js';

/** Dépôts en mémoire, pour tester l'API sans Postgres ; ils suivent les requêtes SQL de leurs pendants. */
export class InMemoryRoomsRepository implements RoomsRepository {
  constructor(readonly rooms: Room[]) {}

  list({ minCapacity, equipment }: RoomFilters): Promise<Room[]> {
    const rooms = this.rooms
      .filter((room) => room.capacity >= (minCapacity ?? 1) && equipment.every((item) => room.equipment.includes(item)))
      .sort((a, b) => a.floor - b.floor || a.name.localeCompare(b.name));
    return Promise.resolve(rooms);
  }

  get(id: number): Promise<Room | null> {
    return Promise.resolve(this.rooms.find((room) => room.id === id) ?? null);
  }
}

export class InMemoryMembersRepository implements MembersRepository {
  constructor(readonly members: Member[]) {}

  list(): Promise<Member[]> {
    return Promise.resolve([...this.members].sort((a, b) => a.fullName.localeCompare(b.fullName)));
  }

  get(id: number): Promise<Member | null> {
    return Promise.resolve(this.members.find((member) => member.id === id) ?? null);
  }
}

export class InMemoryBookingsRepository implements BookingsRepository {
  readonly bookings: Booking[] = [];

  constructor(
    private readonly rooms: Room[],
    private readonly members: Member[],
    private readonly now: () => Date,
  ) {}

  listBetween(from: Date, to: Date, roomId?: number): Promise<Booking[]> {
    const bookings = this.bookings.filter(
      (booking) =>
        new Date(booking.startsAt) < to &&
        new Date(booking.endsAt) > from &&
        (roomId === undefined || booking.room.id === roomId),
    );
    return Promise.resolve(bookings.sort(byStart));
  }

  listByMember(memberId: number): Promise<Booking[]> {
    return Promise.resolve(this.bookings.filter((booking) => booking.member.id === memberId).sort(byStart));
  }

  get(id: number): Promise<Booking | null> {
    return Promise.resolve(this.bookings.find((booking) => booking.id === id) ?? null);
  }

  create(booking: NewBooking): Promise<Booking> {
    const room = this.rooms.find((candidate) => candidate.id === booking.roomId);
    const member = this.members.find((candidate) => candidate.id === booking.memberId);
    if (!room || !member) throw new Error('unknown room or member');
    const created: Booking = {
      id: this.bookings.length + 1,
      room: { id: room.id, name: room.name },
      member: { id: member.id, fullName: member.fullName },
      title: booking.title,
      attendees: booking.attendees,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      createdAt: this.now().toISOString(),
      cancelledAt: null,
    };
    this.bookings.push(created);
    return Promise.resolve(created);
  }

  cancel(id: number, at: Date): Promise<Booking> {
    const booking = this.bookings.find((candidate) => candidate.id === id);
    if (!booking) throw new Error(`booking ${id} vanished`);
    booking.cancelledAt = at.toISOString();
    return Promise.resolve(booking);
  }
}

const byStart = (a: Booking, b: Booking) => a.startsAt.localeCompare(b.startsAt);
