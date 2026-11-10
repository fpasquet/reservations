import { Body, Controller, Delete, Get, Headers, Inject, Param, Post, Query } from '@nestjs/common';
import { parseId } from '../rooms/room.js';
import { DomainError } from '../shared/domain-error.js';
import { isIsoDate } from '../shared/paris-time.js';
import type { Booking } from './booking.js';
import { parseBookingRequest, parseMemberHeader } from './booking-request.js';
import { BookingsService } from './bookings.service.js';

function idFilter(value: string, field: string): number {
  const id = parseId(value);
  if (id === null) throw new DomainError('INVALID_FIELD', `${field} must be a positive integer`, field);
  return id;
}

@Controller('bookings')
export class BookingsController {
  constructor(@Inject(BookingsService) private readonly bookings: BookingsService) {}

  /** `?date=YYYY-MM-DD[&roomId=]` pour le planning d'une journée, `?memberId=` pour les réservations d'un membre. */
  @Get()
  list(@Query() query: { date?: string; roomId?: string; memberId?: string }): Promise<Booking[]> {
    if (query.date !== undefined) {
      if (!isIsoDate(query.date)) throw new DomainError('INVALID_DATE', 'date must be YYYY-MM-DD', 'date');
      const roomId = query.roomId === undefined ? undefined : idFilter(query.roomId, 'roomId');
      return this.bookings.dayPlanning(query.date, roomId);
    }
    if (query.memberId !== undefined) {
      return this.bookings.memberBookings(idFilter(query.memberId, 'memberId'));
    }
    throw new DomainError('MISSING_FILTER', 'either date or memberId is required');
  }

  @Post()
  create(@Headers('x-member-id') memberId: string | undefined, @Body() body: unknown): Promise<Booking> {
    return this.bookings.create(parseMemberHeader(memberId), parseBookingRequest(body));
  }

  /** Annule la réservation : elle est gardée, avec la date de son annulation. */
  @Delete(':id')
  cancel(@Headers('x-member-id') memberId: string | undefined, @Param('id') id: string): Promise<Booking> {
    const bookingId = parseId(id);
    if (bookingId === null) throw new DomainError('BOOKING_NOT_FOUND', `booking ${id} not found`);
    return this.bookings.cancel(parseMemberHeader(memberId), bookingId);
  }
}
