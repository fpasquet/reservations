import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Booking } from '../bookings/booking.js';
import { BOOKINGS_REPOSITORY, type BookingsRepository } from '../bookings/bookings.repository.js';
import { MEMBERS_REPOSITORY, type MembersRepository } from '../members/members.repository.js';
import { CLOCK, type Clock } from '../shared/clock.js';
import { nextDate, parisDateTime, parisDayRange } from '../shared/paris-time.js';
import { MAILER, type Mailer } from './mailer.js';
import { reminderEmail } from './reminder-email.js';
import { REMINDERS_REPOSITORY, type RemindersRepository } from './reminders.repository.js';

/** Heure de Paris (en minutes depuis minuit) à partir de laquelle on rappelle les réservations du lendemain. */
export const REMINDER_MINUTES = 18 * 60;

export const APP_URL = Symbol('APP_URL');

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(MEMBERS_REPOSITORY) private readonly members: MembersRepository,
    @Inject(REMINDERS_REPOSITORY) private readonly reminders: RemindersRepository,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(APP_URL) private readonly appUrl: string,
  ) {}

  /**
   * Envoie les rappels du lendemain si 18h00 à Paris est passé. Appelée à intervalle régulier : le journal des rappels
   * garantit un seul e-mail par membre et par jour, et un échec d'envoi est retenté au passage suivant.
   * Renvoie le nombre d'e-mails envoyés.
   */
  async sendDueReminders(): Promise<number> {
    const now = this.clock.now();
    const today = parisDateTime(now);
    if (today.minutes < REMINDER_MINUTES) return 0;

    const day = nextDate(today.date);
    const { from, to } = parisDayRange(day);
    const upcoming = (await this.bookings.listBetween(from, to)).filter((booking) => booking.cancelledAt === null);

    const byMember = new Map<number, Booking[]>();
    for (const booking of upcoming) {
      byMember.set(booking.member.id, [...(byMember.get(booking.member.id) ?? []), booking]);
    }

    let sent = 0;
    for (const [memberId, memberBookings] of byMember) {
      const member = await this.members.get(memberId);
      if (!member) continue;
      if (!(await this.reminders.claim(memberId, day, now))) continue;
      try {
        await this.mailer.send(reminderEmail(member, memberBookings, this.appUrl));
        sent += 1;
      } catch (error) {
        await this.reminders.release(memberId, day);
        this.logger.error(`Reminder for member ${memberId} (${day}) failed: ${String(error)}`);
      }
    }
    return sent;
  }
}
