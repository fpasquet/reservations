import { beforeEach, describe, expect, it } from 'vitest';
import { parisInstant } from '../shared/paris-time.js';
import {
  InMemoryBookingsRepository,
  InMemoryMembersRepository,
  InMemoryRemindersRepository,
} from '../testing/in-memory-repositories.js';
import { members, rooms } from '../testing/test-app.js';
import type { Email, Mailer } from './mailer.js';
import { RemindersService } from './reminders.service.js';

class FakeMailer implements Mailer {
  readonly sent: Email[] = [];
  failing = false;

  send(email: Email): Promise<void> {
    if (this.failing) return Promise.reject(new Error('smtp down'));
    this.sent.push(email);
    return Promise.resolve();
  }
}

describe('RemindersService', () => {
  let now: Date;
  let bookings: InMemoryBookingsRepository;
  let mailer: FakeMailer;
  let service: RemindersService;

  const at = (date: string, hour: number, minute = 0) => parisInstant(date, hour * 60 + minute);
  const book = (memberId: number, roomId: number, date: string, from: number, to: number, title: string) =>
    bookings.create({
      memberId,
      roomId,
      title,
      attendees: null,
      startsAt: at(date, from),
      endsAt: at(date, to),
    });

  beforeEach(() => {
    now = at('2026-11-05', 18);
    bookings = new InMemoryBookingsRepository(rooms, members, () => now);
    mailer = new FakeMailer();
    service = new RemindersService(
      bookings,
      new InMemoryMembersRepository(members),
      new InMemoryRemindersRepository(),
      mailer,
      { now: () => now },
      'http://localhost:3030/',
    );
  });

  it('sends nothing before 18:00 Paris', async () => {
    await book(1, 1, '2026-11-06', 9, 10, 'Point');
    now = at('2026-11-05', 17, 59);
    expect(await service.sendDueReminders()).toBe(0);
    expect(mailer.sent).toEqual([]);
  });

  it('sends one e-mail at 18:00 Paris with room, hours, title and cancellation link', async () => {
    await book(1, 1, '2026-11-06', 9, 10, 'Point hebdo');
    expect(await service.sendDueReminders()).toBe(1);
    const [email] = mailer.sent;
    expect(email?.to).toBe('camille@studio-ondes.fr');
    expect(email?.text).toContain('La Serre');
    expect(email?.text).toContain('09:00 – 10:00');
    expect(email?.text).toContain('Point hebdo');
    expect(email?.text).toContain('http://localhost:3030/my-bookings');
    expect(email?.html).toContain('href="http://localhost:3030/my-bookings"');
  });

  it('groups several bookings of a member into a single e-mail', async () => {
    await book(1, 1, '2026-11-06', 9, 10, 'Matin');
    await book(1, 2, '2026-11-06', 14, 15, 'Après-midi');
    await book(2, 3, '2026-11-06', 9, 11, 'Atelier');
    expect(await service.sendDueReminders()).toBe(2);
    const camille = mailer.sent.filter((email) => email.to === 'camille@studio-ondes.fr');
    expect(camille).toHaveLength(1);
    expect(camille[0]?.text).toContain('Matin');
    expect(camille[0]?.text).toContain('Après-midi');
  });

  it('ignores cancelled bookings, and members with only cancelled ones', async () => {
    const kept = await book(1, 1, '2026-11-06', 9, 10, 'Gardée');
    const cancelled = await book(1, 2, '2026-11-06', 14, 15, 'Annulée');
    const onlyCancelled = await book(2, 3, '2026-11-06', 9, 10, 'Toute seule');
    await bookings.cancel(cancelled.id, now);
    await bookings.cancel(onlyCancelled.id, now);
    expect(kept.cancelledAt).toBeNull();
    expect(await service.sendDueReminders()).toBe(1);
    expect(mailer.sent[0]?.text).toContain('Gardée');
    expect(mailer.sent[0]?.text).not.toContain('Annulée');
  });

  it("only reminds tomorrow's bookings", async () => {
    await book(1, 1, '2026-11-05', 19, 20, "Aujourd'hui");
    await book(2, 1, '2026-11-07', 9, 10, 'Après-demain');
    expect(await service.sendDueReminders()).toBe(0);
  });

  it('sends at most one e-mail per member and day over repeated runs', async () => {
    await book(1, 1, '2026-11-06', 9, 10, 'Point');
    await service.sendDueReminders();
    now = at('2026-11-05', 18, 1);
    await service.sendDueReminders();
    now = at('2026-11-05', 23, 30);
    await service.sendDueReminders();
    expect(mailer.sent).toHaveLength(1);
  });

  it('retries on the next run when sending fails', async () => {
    await book(1, 1, '2026-11-06', 9, 10, 'Point');
    mailer.failing = true;
    expect(await service.sendDueReminders()).toBe(0);
    mailer.failing = false;
    expect(await service.sendDueReminders()).toBe(1);
  });

  it('uses Paris time around the summer time change', async () => {
    // Samedi 28 mars 2026 à 18h00 (UTC+1) : le dimanche, passage à l'heure d'été.
    now = at('2026-03-28', 18);
    await book(1, 1, '2026-03-29', 9, 10, 'Dimanche');
    expect(await service.sendDueReminders()).toBe(1);
  });
});
