import { Inject, Injectable } from '@nestjs/common';
import { MEMBERS_REPOSITORY, type MembersRepository } from '../members/members.repository.js';
import { ROOMS_REPOSITORY, type RoomsRepository } from '../rooms/rooms.repository.js';
import { CLOCK, type Clock } from '../shared/clock.js';
import { DomainError } from '../shared/domain-error.js';
import { parisDayRange } from '../shared/paris-time.js';
import type { Booking, BookingRequest } from './booking.js';
import { checkCancellation, checkCapacity, checkSlot, overlaps } from './booking-rules.js';
import { BOOKINGS_REPOSITORY, type BookingsRepository } from './bookings.repository.js';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(ROOMS_REPOSITORY) private readonly rooms: RoomsRepository,
    @Inject(MEMBERS_REPOSITORY) private readonly members: MembersRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Le planning d'une journée (YYYY-MM-DD, à Paris), de toutes les salles ou d'une seule. */
  dayPlanning(date: string, roomId?: number): Promise<Booking[]> {
    const { from, to } = parisDayRange(date);
    return this.bookings.listBetween(from, to, roomId);
  }

  /** Toutes les réservations d'un membre, annulées comprises. */
  memberBookings(memberId: number): Promise<Booking[]> {
    return this.bookings.listByMember(memberId);
  }

  async create(memberId: number, request: BookingRequest): Promise<Booking> {
    const member = await this.members.get(memberId);
    if (!member) throw new DomainError('MEMBER_NOT_FOUND', `member ${memberId} not found`);
    const room = await this.rooms.get(request.roomId);
    if (!room) throw new DomainError('ROOM_NOT_FOUND', `room ${request.roomId} not found`, 'roomId');

    checkSlot(request, this.clock.now());
    checkCapacity(room, request.attendees);

    const sameRoom = await this.bookings.listBetween(request.startsAt, request.endsAt, room.id);
    const conflict = sameRoom.find(
      (booking) =>
        booking.cancelledAt === null &&
        overlaps(request, { startsAt: new Date(booking.startsAt), endsAt: new Date(booking.endsAt) }),
    );
    if (conflict) {
      throw new DomainError('ROOM_ALREADY_BOOKED', `${room.name} is already booked at that time`, 'startsAt');
    }

    return this.bookings.create({ ...request, memberId });
  }

  async cancel(memberId: number, bookingId: number): Promise<Booking> {
    const booking = await this.bookings.get(bookingId);
    if (!booking) throw new DomainError('BOOKING_NOT_FOUND', `booking ${bookingId} not found`);
    const now = this.clock.now();
    checkCancellation(booking, memberId, now);
    return this.bookings.cancel(bookingId, now);
  }
}
