import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { DomainError } from '../shared/domain-error.js';
import { parseId, parseRoomFilters, type Room } from './room.js';
import { ROOMS_REPOSITORY, type RoomsRepository } from './rooms.repository.js';

@Controller('rooms')
export class RoomsController {
  constructor(@Inject(ROOMS_REPOSITORY) private readonly rooms: RoomsRepository) {}

  @Get()
  list(@Query() query: { capacity?: string; equipment?: string }): Promise<Room[]> {
    return this.rooms.list(parseRoomFilters(query));
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<Room> {
    const roomId = parseId(id);
    const room = roomId === null ? null : await this.rooms.get(roomId);
    if (!room) throw new DomainError('ROOM_NOT_FOUND', `room ${id} not found`);
    return room;
  }
}
