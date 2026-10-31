import { Inject, Injectable } from '@nestjs/common';
import { MEMBERS_REPOSITORY, type MembersRepository } from '../members/members.repository.js';
import { ROOMS_REPOSITORY, type RoomsRepository } from '../rooms/rooms.repository.js';
import { CLOCK, type Clock } from '../shared/clock.js';
import { DomainError } from '../shared/domain-error.js';
import { parisDayRange } from '../shared/paris-time.js';
import type { Booking, BookingRequest } from './booking.js';
import {
  checkArrival,
  checkCancellation,
  checkCapacity,
  checkSlot,
  isReleased,
  overlaps,
  withRelease,
} from './booking-rules.js';
import { BOOKINGS_REPOSITORY, type BookingsRepository } from './bookings.repository.js';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(ROOMS_REPOSITORY) private readonly rooms: RoomsRepository,
    @Inject(MEMBERS_REPOSITORY) private readonly members: MembersRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** The planning of a day (YYYY-MM-DD, Paris time), for all rooms or one; released bookings are left out. */
  async dayPlanning(date: string, roomId?: number): Promise<Booking[]> {
    const { from, to } = parisDayRange(date);
    const now = this.clock.now();
    const stored = await this.bookings.listBetween(from, to, roomId);
    return stored.filter((booking) => !isReleased(booking, now)).map((booking) => withRelease(booking, now));
  }

  /** All the bookings of a member, cancelled and released ones included. */
  async memberBookings(memberId: number): Promise<Booking[]> {
    const now = this.clock.now();
    const stored = await this.bookings.listByMember(memberId);
    return stored.map((booking) => withRelease(booking, now));
  }

  async create(memberId: number, request: BookingRequest): Promise<Booking> {
    const member = await this.members.get(memberId);
    if (!member) throw new DomainError('MEMBER_NOT_FOUND', `member ${memberId} not found`);
    const room = await this.rooms.get(request.roomId);
    if (!room) throw new DomainError('ROOM_NOT_FOUND', `room ${request.roomId} not found`, 'roomId');

    const now = this.clock.now();
    checkSlot(request, now);
    checkCapacity(room, request.attendees);

    const sameRoom = await this.bookings.listBetween(request.startsAt, request.endsAt, room.id);
    const conflict = sameRoom.find(
      (booking) =>
        booking.cancelledAt === null &&
        !isReleased(booking, now) &&
        overlaps(request, { startsAt: new Date(booking.startsAt), endsAt: new Date(booking.endsAt) }),
    );
    if (conflict) {
      throw new DomainError('ROOM_ALREADY_BOOKED', `${room.name} is already booked at that time`, 'startsAt');
    }

    return withRelease(await this.bookings.create({ ...request, memberId }), now);
  }

  async cancel(memberId: number, bookingId: number): Promise<Booking> {
    const booking = await this.mustGet(bookingId);
    const now = this.clock.now();
    checkCancellation(booking, memberId, now);
    return withRelease(await this.bookings.cancel(bookingId, now), now);
  }

  /** The member signals their arrival; signaled again, the first timestamp is kept. */
  async signalArrival(memberId: number, bookingId: number): Promise<Booking> {
    const booking = await this.mustGet(bookingId);
    const now = this.clock.now();
    checkArrival(booking, memberId, now);
    if (booking.arrivedAt !== null) return withRelease(booking, now);
    return withRelease(await this.bookings.markArrived(bookingId, now), now);
  }

  private async mustGet(bookingId: number) {
    const booking = await this.bookings.get(bookingId);
    if (!booking) throw new DomainError('BOOKING_NOT_FOUND', `booking ${bookingId} not found`);
    return booking;
  }
}
