import { Logger, Module } from '@nestjs/common';
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
import { MAILER } from './reminders/mailer.js';
import { PgRemindersRepository } from './reminders/pg-reminders.repository.js';
import { ReminderScheduler } from './reminders/reminder-scheduler.js';
import { REMINDERS_REPOSITORY } from './reminders/reminders.repository.js';
import { APP_URL, RemindersService } from './reminders/reminders.service.js';
import { SmtpMailer, smtpConfigFromEnv } from './reminders/smtp-mailer.js';
import { CLOCK, clockFromEnv } from './shared/clock.js';

const smtp = smtpConfigFromEnv();
// Sans serveur SMTP configuré, aucun rappel n'est planifié : mieux vaut le dire que des échecs d'envoi chaque minute.
if (!smtp) new Logger('AppModule').warn('SMTP_HOST is not set: booking reminder e-mails are disabled.');

@Module({
  controllers: [HealthController, RoomsController, MembersController, BookingsController],
  providers: [
    { provide: DATABASE, useFactory: () => connect() },
    { provide: CLOCK, useFactory: () => clockFromEnv() },
    { provide: ROOMS_REPOSITORY, useClass: PgRoomsRepository },
    { provide: MEMBERS_REPOSITORY, useClass: PgMembersRepository },
    { provide: BOOKINGS_REPOSITORY, useClass: PgBookingsRepository },
    BookingsService,
    { provide: REMINDERS_REPOSITORY, useClass: PgRemindersRepository },
    {
      provide: MAILER,
      useFactory: () =>
        smtp ? new SmtpMailer(smtp) : { send: () => Promise.reject(new Error('SMTP is not configured')) },
    },
    { provide: APP_URL, useFactory: () => process.env['APP_URL'] ?? 'http://localhost:3030' },
    RemindersService,
    ...(smtp ? [ReminderScheduler] : []),
  ],
})
export class AppModule {}
