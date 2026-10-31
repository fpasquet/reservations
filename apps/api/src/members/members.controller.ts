import { Controller, Get, Inject, Param } from '@nestjs/common';
import { BookingsService } from '../bookings/bookings.service.js';
import { parseId } from '../rooms/room.js';
import { DomainError } from '../shared/domain-error.js';
import type { Credit } from './credit.js';
import type { Member } from './member.js';
import { MEMBERS_REPOSITORY, type MembersRepository } from './members.repository.js';

@Controller('members')
export class MembersController {
  constructor(
    @Inject(MEMBERS_REPOSITORY) private readonly members: MembersRepository,
    @Inject(BookingsService) private readonly bookings: BookingsService,
  ) {}

  @Get()
  list(): Promise<Member[]> {
    return this.members.list();
  }

  /** Les heures de salle du membre pour le mois en cours (heure de Paris). */
  @Get(':id/credit')
  credit(@Param('id') id: string): Promise<Credit> {
    const memberId = parseId(id);
    if (memberId === null) throw new DomainError('MEMBER_NOT_FOUND', `member ${id} not found`);
    return this.bookings.credit(memberId);
  }
}
