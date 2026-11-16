import { Body, Controller, Delete, Get, Headers, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { parseBookingRequest, parseMemberHeader } from '../bookings/booking-request.js';
import type { Booking } from '../bookings/booking.js';
import { parseId } from '../rooms/room.js';
import { DomainError } from '../shared/domain-error.js';
import type { WaitlistEntry } from './waitlist-entry.js';
import { WaitlistService } from './waitlist.service.js';

function entryId(value: string): number {
  const id = parseId(value);
  if (id === null) throw new DomainError('WAITLIST_ENTRY_NOT_FOUND', `waitlist entry ${value} not found`);
  return id;
}

@Controller('waitlist')
export class WaitlistController {
  constructor(@Inject(WaitlistService) private readonly waitlist: WaitlistService) {}

  /** `?memberId=` : les inscriptions d'un membre ; celles dont le créneau est passé n'y sont plus. */
  @Get()
  list(@Query() query: { memberId?: string }): Promise<WaitlistEntry[]> {
    const memberId = query.memberId === undefined ? null : parseId(query.memberId);
    if (memberId === null) throw new DomainError('INVALID_FIELD', 'memberId must be a positive integer', 'memberId');
    return this.waitlist.memberEntries(memberId);
  }

  /** Même corps que POST /bookings, pour un créneau déjà pris. */
  @Post()
  join(@Headers('x-member-id') memberId: string | undefined, @Body() body: unknown): Promise<WaitlistEntry> {
    return this.waitlist.join(parseMemberHeader(memberId), parseBookingRequest(body));
  }

  /** Confirme le créneau proposé : la réservation est créée. */
  @Post(':id/confirm')
  confirm(@Headers('x-member-id') memberId: string | undefined, @Param('id') id: string): Promise<Booking> {
    return this.waitlist.confirm(parseMemberHeader(memberId), entryId(id));
  }

  @Delete(':id')
  @HttpCode(204)
  async leave(@Headers('x-member-id') memberId: string | undefined, @Param('id') id: string): Promise<void> {
    await this.waitlist.leave(parseMemberHeader(memberId), entryId(id));
  }
}
