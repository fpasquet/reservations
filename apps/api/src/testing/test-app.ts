import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BookingsController } from '../bookings/bookings.controller.js';
import { BOOKINGS_REPOSITORY } from '../bookings/bookings.repository.js';
import { BookingsService } from '../bookings/bookings.service.js';
import type { Member } from '../members/member.js';
import { MembersController } from '../members/members.controller.js';
import { MEMBERS_REPOSITORY } from '../members/members.repository.js';
import type { Room } from '../rooms/room.js';
import { RoomsController } from '../rooms/rooms.controller.js';
import { ROOMS_REPOSITORY } from '../rooms/rooms.repository.js';
import { CLOCK, type Clock } from '../shared/clock.js';
import { DomainErrorFilter } from '../shared/domain-error.filter.js';
import {
  InMemoryBookingsRepository,
  InMemoryMembersRepository,
  InMemoryRoomsRepository,
} from './in-memory-repositories.js';

export const rooms: Room[] = [
  {
    id: 1,
    name: 'La Serre',
    floor: 1,
    capacity: 8,
    equipment: ['screen', 'whiteboard'],
    color: '#5b8a72',
    description: '',
  },
  { id: 2, name: 'Cabine 1', floor: 0, capacity: 2, equipment: ['videoconference'], color: '#c0703f', description: '' },
  {
    id: 3,
    name: 'Atelier',
    floor: 0,
    capacity: 14,
    equipment: ['screen', 'videoconference', 'whiteboard', 'step_free_access'],
    color: '#3f6fb0',
    description: '',
  },
];

export const members: Member[] = [
  { id: 1, fullName: 'Camille Martin', email: 'camille@studio-ondes.fr', company: 'Studio Ondes' },
  { id: 2, fullName: 'Yanis Benali', email: 'yanis@benali.dev', company: 'Indépendant' },
];

export interface TestApp {
  app: INestApplication;
  http: ReturnType<typeof request>;
  clock: { current: Date };
  bookings: InMemoryBookingsRepository;
}

/** L'API sur des dépôts en mémoire, à l'heure fixée par `clock.current`. */
export async function createTestApp(now: Date): Promise<TestApp> {
  const clock = { current: now };
  const fixedClock: Clock = { now: () => clock.current };
  const bookings = new InMemoryBookingsRepository(rooms, members, () => clock.current);
  const module = await Test.createTestingModule({
    controllers: [RoomsController, MembersController, BookingsController],
    providers: [
      BookingsService,
      { provide: CLOCK, useValue: fixedClock },
      { provide: ROOMS_REPOSITORY, useValue: new InMemoryRoomsRepository(rooms) },
      { provide: MEMBERS_REPOSITORY, useValue: new InMemoryMembersRepository(members) },
      { provide: BOOKINGS_REPOSITORY, useValue: bookings },
    ],
  }).compile();
  const app = module.createNestApplication({ logger: false });
  app.useGlobalFilters(new DomainErrorFilter());
  await app.init();
  return { app, http: request(app.getHttpServer() as Parameters<typeof request>[0]), clock, bookings };
}
