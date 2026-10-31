import { Inject, Injectable } from '@nestjs/common';
import { MEMBERS_REPOSITORY, type MembersRepository } from '../members/members.repository.js';
import { ROOMS_REPOSITORY, type RoomsRepository } from '../rooms/rooms.repository.js';
import { CLOCK, type Clock } from '../shared/clock.js';
import { DomainError } from '../shared/domain-error.js';
import { parisDayRange } from '../shared/paris-time.js';
import type { Booking, BookingRequest, Occurrence, SeriesRequest } from './booking.js';
import { checkCancellation, checkCapacity, checkSlot, overlaps } from './booking-rules.js';
import { BOOKINGS_REPOSITORY, type BookingsRepository } from './bookings.repository.js';
import { occurrenceConflict, weeklySlots } from './series-rules.js';

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

  /** Les occurrences d'une série avec, pour chacune, la raison de son conflit : rien n'est créé. */
  async previewSeries(memberId: number, request: SeriesRequest): Promise<Occurrence[]> {
    return this.planSeries(memberId, request);
  }

  /** Crée les occurrences libres de la série, toutes ensemble ; les autres sont rendues en conflit. */
  async createSeries(
    memberId: number,
    request: SeriesRequest,
  ): Promise<{ seriesId: number; bookings: Booking[]; conflicts: Occurrence[] }> {
    const occurrences = await this.planSeries(memberId, request);
    const free = occurrences.filter((occurrence) => occurrence.conflict === null);
    if (free.length === 0) {
      throw new DomainError('NO_FREE_OCCURRENCE', 'every occurrence of the series is in conflict', 'startsAt');
    }
    const created = await this.bookings.createSeries({
      memberId,
      roomId: request.roomId,
      title: request.title,
      attendees: request.attendees,
      weeks: request.weeks,
      slots: free.map(({ startsAt, endsAt }) => ({ startsAt: new Date(startsAt), endsAt: new Date(endsAt) })),
    });
    return { ...created, conflicts: occurrences.filter((occurrence) => occurrence.conflict !== null) };
  }

  /** Annule les occurrences à venir de la série ; celles déjà commencées ou annulées restent telles quelles. */
  async cancelSeries(memberId: number, seriesId: number): Promise<Booking[]> {
    const owner = await this.bookings.getSeriesOwner(seriesId);
    if (owner === null) throw new DomainError('SERIES_NOT_FOUND', `series ${seriesId} not found`);
    if (owner !== memberId) throw new DomainError('NOT_YOUR_BOOKING', 'only the member who booked can cancel');
    const now = this.clock.now();
    const cancelled = await this.bookings.cancelSeriesAfter(seriesId, now, now);
    if (cancelled.length === 0) {
      throw new DomainError('NO_UPCOMING_OCCURRENCE', 'the series has no upcoming occurrence left to cancel');
    }
    return cancelled;
  }

  private async planSeries(memberId: number, request: SeriesRequest): Promise<Occurrence[]> {
    const member = await this.members.get(memberId);
    if (!member) throw new DomainError('MEMBER_NOT_FOUND', `member ${memberId} not found`);
    const room = await this.rooms.get(request.roomId);
    if (!room) throw new DomainError('ROOM_NOT_FOUND', `room ${request.roomId} not found`, 'roomId');
    checkCapacity(room, request.attendees);

    const slots = weeklySlots(request, request.weeks);
    const last = slots[slots.length - 1]!;
    const booked = (await this.bookings.listBetween(request.startsAt, last.endsAt, room.id))
      .filter((booking) => booking.cancelledAt === null)
      .map((booking) => ({ startsAt: new Date(booking.startsAt), endsAt: new Date(booking.endsAt) }));

    const now = this.clock.now();
    return slots.map((slot) => ({
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      conflict: occurrenceConflict(slot, now, booked),
    }));
  }

  async cancel(memberId: number, bookingId: number): Promise<Booking> {
    const booking = await this.bookings.get(bookingId);
    if (!booking) throw new DomainError('BOOKING_NOT_FOUND', `booking ${bookingId} not found`);
    const now = this.clock.now();
    checkCancellation(booking, memberId, now);
    return this.bookings.cancel(bookingId, now);
  }
}
