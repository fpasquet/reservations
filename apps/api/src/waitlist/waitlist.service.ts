import { Inject, Injectable } from '@nestjs/common';
import type { Booking, BookingRequest } from '../bookings/booking.js';
import { checkCapacity, checkSlot, overlaps } from '../bookings/booking-rules.js';
import { BOOKINGS_REPOSITORY, type BookingsRepository } from '../bookings/bookings.repository.js';
import { MEMBERS_REPOSITORY, type MembersRepository } from '../members/members.repository.js';
import { ROOMS_REPOSITORY, type RoomsRepository } from '../rooms/rooms.repository.js';
import { CLOCK, type Clock } from '../shared/clock.js';
import { DomainError } from '../shared/domain-error.js';
import type { WaitlistEntry } from './waitlist-entry.js';
import { WAITLIST_REPOSITORY, type WaitlistRepository } from './waitlist.repository.js';

/** Le membre prévenu a 30 minutes pour confirmer. */
export const OFFER_DURATION_MINUTES = 30;

const slotOf = (entry: WaitlistEntry) => ({ startsAt: new Date(entry.startsAt), endsAt: new Date(entry.endsAt) });

@Injectable()
export class WaitlistService {
  constructor(
    @Inject(WAITLIST_REPOSITORY) private readonly waitlist: WaitlistRepository,
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(ROOMS_REPOSITORY) private readonly rooms: RoomsRepository,
    @Inject(MEMBERS_REPOSITORY) private readonly members: MembersRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Les inscriptions d'un membre, à jour : celles dont le créneau est passé ont disparu. */
  async memberEntries(memberId: number): Promise<WaitlistEntry[]> {
    await this.refresh();
    return this.waitlist.listByMember(memberId);
  }

  async join(memberId: number, request: BookingRequest): Promise<WaitlistEntry> {
    const member = await this.members.get(memberId);
    if (!member) throw new DomainError('MEMBER_NOT_FOUND', `member ${memberId} not found`);
    const room = await this.rooms.get(request.roomId);
    if (!room) throw new DomainError('ROOM_NOT_FOUND', `room ${request.roomId} not found`, 'roomId');

    const now = this.clock.now();
    checkSlot(request, now);
    checkCapacity(room, request.attendees);
    await this.refresh();

    const entries = await this.waitlist.list();
    const sameRoom = entries.filter((entry) => entry.room.id === room.id);
    if (sameRoom.some((entry) => entry.member.id === memberId && overlaps(request, slotOf(entry)))) {
      throw new DomainError('ALREADY_ON_WAITLIST', 'the member is already waiting for that slot', 'startsAt');
    }
    const taken =
      (await this.hasBooking(room.id, request)) ||
      sameRoom.some((entry) => entry.offeredAt !== null && overlaps(request, slotOf(entry)));
    if (!taken) throw new DomainError('SLOT_AVAILABLE', 'the slot is free, book it directly', 'startsAt');

    return this.waitlist.create({ ...request, memberId }, now);
  }

  /** Le membre quitte la liste, ou renonce à la place qu'on lui a proposée. */
  async leave(memberId: number, entryId: number): Promise<void> {
    await this.refresh();
    await this.ownEntry(memberId, entryId);
    await this.waitlist.remove(entryId);
    await this.refresh();
  }

  /** Le membre prévenu confirme dans les 30 minutes : la réservation est créée à sa place sur la liste. */
  async confirm(memberId: number, entryId: number): Promise<Booking> {
    await this.refresh();
    const entry = await this.ownEntry(memberId, entryId);
    if (entry.offeredAt === null) throw new DomainError('NOT_OFFERED', 'the slot has not been offered yet');
    const booking = await this.bookings.create({
      roomId: entry.room.id,
      memberId,
      title: entry.title,
      attendees: entry.attendees,
      startsAt: new Date(entry.startsAt),
      endsAt: new Date(entry.endsAt),
    });
    await this.waitlist.remove(entryId);
    return booking;
  }

  /** Un créneau proposé à un membre est gardé pour lui : personne d'autre ne le réserve. */
  async isHeld(roomId: number, slot: { startsAt: Date; endsAt: Date }): Promise<boolean> {
    await this.refresh();
    const entries = await this.waitlist.list();
    return entries.some(
      (entry) => entry.room.id === roomId && entry.offeredAt !== null && overlaps(slot, slotOf(entry)),
    );
  }

  /**
   * Met la liste à jour : retire les inscriptions dont le créneau est passé et les propositions restées sans réponse,
   * puis propose chaque créneau libéré au premier inscrit. Sans tâche de fond, elle tourne à chaque lecture ou
   * écriture qui touche la liste ou les réservations.
   */
  async refresh(): Promise<void> {
    const now = this.clock.now();
    const alive: WaitlistEntry[] = [];
    for (const entry of await this.waitlist.list()) {
      const over = new Date(entry.startsAt) <= now;
      const lapsed = entry.offerExpiresAt !== null && new Date(entry.offerExpiresAt) <= now;
      if (over || lapsed) await this.waitlist.remove(entry.id);
      else alive.push(entry);
    }

    const held = alive.filter((entry) => entry.offeredAt !== null);
    for (const entry of alive) {
      if (entry.offeredAt !== null) continue;
      const slot = slotOf(entry);
      if (held.some((other) => other.room.id === entry.room.id && overlaps(slot, slotOf(other)))) continue;
      if (await this.hasBooking(entry.room.id, slot)) continue;
      const expiresAt = new Date(now.getTime() + OFFER_DURATION_MINUTES * 60_000);
      held.push(await this.waitlist.offer(entry.id, now, expiresAt));
    }
  }

  private async hasBooking(roomId: number, slot: { startsAt: Date; endsAt: Date }): Promise<boolean> {
    const bookings = await this.bookings.listBetween(slot.startsAt, slot.endsAt, roomId);
    return bookings.some((booking) => booking.cancelledAt === null);
  }

  private async ownEntry(memberId: number, entryId: number): Promise<WaitlistEntry> {
    const entry = await this.waitlist.get(entryId);
    if (!entry) throw new DomainError('WAITLIST_ENTRY_NOT_FOUND', `waitlist entry ${entryId} not found`);
    if (entry.member.id !== memberId) {
      throw new DomainError('NOT_YOUR_WAITLIST_ENTRY', 'only the member who signed up can change this entry');
    }
    return entry;
  }
}
