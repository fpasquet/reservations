import type { Booking, NewBooking } from '../bookings/booking.js';
import type { BookingsRepository } from '../bookings/bookings.repository.js';
import type { Member } from '../members/member.js';
import type { MembersRepository } from '../members/members.repository.js';
import type { Room, RoomFilters } from '../rooms/room.js';
import type { RoomsRepository } from '../rooms/rooms.repository.js';
import type { NewWaitlistEntry, WaitlistEntry } from '../waitlist/waitlist-entry.js';
import type { WaitlistRepository } from '../waitlist/waitlist.repository.js';

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

export class InMemoryWaitlistRepository implements WaitlistRepository {
  entries: WaitlistEntry[] = [];
  private nextId = 1;

  constructor(
    private readonly rooms: Room[],
    private readonly members: Member[],
  ) {}

  listAll(): Promise<WaitlistEntry[]> {
    return Promise.resolve([...this.entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id));
  }

  listByMember(memberId: number): Promise<WaitlistEntry[]> {
    return Promise.resolve(this.entries.filter((entry) => entry.member.id === memberId).sort(byStart));
  }

  get(id: number): Promise<WaitlistEntry | null> {
    return Promise.resolve(this.entries.find((entry) => entry.id === id) ?? null);
  }

  create(entry: NewWaitlistEntry, at: Date): Promise<WaitlistEntry> {
    const room = this.rooms.find((candidate) => candidate.id === entry.roomId);
    const member = this.members.find((candidate) => candidate.id === entry.memberId);
    if (!room || !member) throw new Error('unknown room or member');
    const created: WaitlistEntry = {
      id: this.nextId++,
      room: { id: room.id, name: room.name },
      member: { id: member.id, fullName: member.fullName },
      title: entry.title,
      attendees: entry.attendees,
      startsAt: entry.startsAt.toISOString(),
      endsAt: entry.endsAt.toISOString(),
      createdAt: at.toISOString(),
      offeredAt: null,
      offerExpiresAt: null,
    };
    this.entries.push(created);
    return Promise.resolve(created);
  }

  offer(id: number, at: Date, expiresAt: Date): Promise<WaitlistEntry> {
    const entry = this.entries.find((candidate) => candidate.id === id);
    if (!entry) throw new Error(`waitlist entry ${id} vanished`);
    entry.offeredAt = at.toISOString();
    entry.offerExpiresAt = expiresAt.toISOString();
    return Promise.resolve(entry);
  }

  remove(id: number): Promise<void> {
    this.entries = this.entries.filter((entry) => entry.id !== id);
    return Promise.resolve();
  }
}

const byStart = (a: { startsAt: string }, b: { startsAt: string }) => a.startsAt.localeCompare(b.startsAt);
