import { Controller, Get, Inject } from '@nestjs/common';
import type { Member } from './member.js';
import { MEMBERS_REPOSITORY, type MembersRepository } from './members.repository.js';

@Controller('members')
export class MembersController {
  constructor(@Inject(MEMBERS_REPOSITORY) private readonly members: MembersRepository) {}

  @Get()
  list(): Promise<Member[]> {
    return this.members.list();
  }
}
