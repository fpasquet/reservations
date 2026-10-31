import { Module } from '@nestjs/common';
import { BookingsController } from './bookings/bookings.controller.js';
import { BOOKINGS_REPOSITORY } from './bookings/bookings.repository.js';
import { BookingsService } from './bookings/bookings.service.js';
import { PgBookingsRepository } from './bookings/pg-bookings.repository.js';
import { ClosedDaysController } from './closed-days/closed-days.controller.js';
import { CLOSED_DAYS_REPOSITORY } from './closed-days/closed-days.repository.js';
import { PgClosedDaysRepository } from './closed-days/pg-closed-days.repository.js';
import { fetchPublicHolidays } from './closed-days/public-holidays.js';
import { PUBLIC_HOLIDAYS_SOURCE, PublicHolidaysSync } from './closed-days/public-holidays.sync.js';
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
  controllers: [HealthController, RoomsController, MembersController, BookingsController, ClosedDaysController],
  providers: [
    { provide: DATABASE, useFactory: () => connect() },
    { provide: CLOCK, useFactory: () => clockFromEnv() },
    { provide: ROOMS_REPOSITORY, useClass: PgRoomsRepository },
    { provide: MEMBERS_REPOSITORY, useClass: PgMembersRepository },
    { provide: BOOKINGS_REPOSITORY, useClass: PgBookingsRepository },
    { provide: CLOSED_DAYS_REPOSITORY, useClass: PgClosedDaysRepository },
    { provide: PUBLIC_HOLIDAYS_SOURCE, useValue: fetchPublicHolidays },
    PublicHolidaysSync,
    BookingsService,
  ],
})
export class AppModule {}
