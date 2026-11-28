import { Module } from '@nestjs/common';
import { BookingsController } from './bookings/bookings.controller.js';
import { BOOKINGS_REPOSITORY } from './bookings/bookings.repository.js';
import { BookingsService } from './bookings/bookings.service.js';
import { PgBookingsRepository } from './bookings/pg-bookings.repository.js';
import { connect, DATABASE } from './database.js';
import { HealthController } from './health.controller.js';
import { MembersController } from './members/members.controller.js';
import { MEMBERS_REPOSITORY } from './members/members.repository.js';
import { PgMembersRepository } from './members/pg-members.repository.js';
import { PgRoomsRepository } from './rooms/pg-rooms.repository.js';
import { RoomsController } from './rooms/rooms.controller.js';
import { ROOMS_REPOSITORY } from './rooms/rooms.repository.js';
import { CLOCK, clockFromEnv } from './shared/clock.js';

@Module({
  controllers: [HealthController, RoomsController, MembersController, BookingsController],
  providers: [
    { provide: DATABASE, useFactory: () => connect() },
    { provide: CLOCK, useFactory: () => clockFromEnv() },
    { provide: ROOMS_REPOSITORY, useClass: PgRoomsRepository },
    { provide: MEMBERS_REPOSITORY, useClass: PgMembersRepository },
    { provide: BOOKINGS_REPOSITORY, useClass: PgBookingsRepository },
    BookingsService,
  ],
})
export class AppModule {}
