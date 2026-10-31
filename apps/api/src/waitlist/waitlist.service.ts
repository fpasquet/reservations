import { Inject, Injectable } from '@nestjs/common';
import type { Booking, BookingRequest } from '../bookings/booking.js';
import { checkCapacity, checkSlot, overlaps } from '../bookings/booking-rules.js';
import { BOOKINGS_REPOSITORY, type BookingsRepository } from '../bookings/bookings.repository.js';
import { MEMBERS_REPOSITORY, type MembersRepository } from '../members/members.repository.js';
import { ROOMS_REPOSITORY, type RoomsRepository } from '../rooms/rooms.repository.js';
import { CLOCK, type Clock } from '../shared/clock.js';
import { DomainError } from '../shared/domain-error.js';
import { OFFER_MINUTES, type WaitlistEntry } from './waitlist-entry.js';
import { WAITLIST_REPOSITORY, type WaitlistRepository } from './waitlist.repository.js';

const MINUTE = 60_000;

const slotOf = (entry: { startsAt: string; endsAt: string }) => ({
  startsAt: new Date(entry.startsAt),
  endsAt: new Date(entry.endsAt),
});

@Injectable()
export class WaitlistService {
  constructor(
    @Inject(WAITLIST_REPOSITORY) private readonly waitlist: WaitlistRepository,
    @Inject(BOOKINGS_REPOSITORY) private readonly bookings: BookingsRepository,
    @Inject(ROOMS_REPOSITORY) private readonly rooms: RoomsRepository,
    @Inject(MEMBERS_REPOSITORY) private readonly members: MembersRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Met la liste d'attente à jour : les inscriptions dont le créneau a commencé et les offres dont le délai est écoulé
   * disparaissent, puis chaque créneau redevenu libre est proposé au premier inscrit qui l'attend.
   * Appelée avant toute lecture ou écriture qui en dépend, plutôt que par une tâche de fond.
   */
  async process(): Promise<void> {
    const now = this.clock.now();
    const kept: WaitlistEntry[] = [];
    for (const entry of await this.waitlist.listAll()) {
      const over = new Date(entry.startsAt) <= now;
      const expired = entry.offerExpiresAt !== null && new Date(entry.offerExpiresAt) <= now;
      if (over || expired) await this.waitlist.remove(entry.id);
      else kept.push(entry);
    }

    for (const entry of kept) {
      if (entry.offeredAt !== null) continue;
      const slot = slotOf(entry);
      const sameRoom = await this.bookings.listBetween(slot.startsAt, slot.endsAt, entry.room.id);
      const booked = sameRoom.some((booking) => booking.cancelledAt === null && overlaps(slot, slotOf(booking)));
      const held = kept.some(
        (other) => other.offeredAt !== null && other.room.id === entry.room.id && overlaps(slot, slotOf(other)),
      );
      if (booked || held) continue;
      const offered = await this.waitlist.offer(entry.id, now, new Date(now.getTime() + OFFER_MINUTES * MINUTE));
      kept[kept.indexOf(entry)] = offered;
    }
  }

  /** Le créneau est gardé pour un autre membre que `memberId`, à qui la salle vient d'être proposée. */
  async isHeldForOthers(memberId: number, roomId: number, slot: { startsAt: Date; endsAt: Date }): Promise<boolean> {
    const entries = await this.waitlist.listAll();
    return entries.some(
      (entry) =>
        entry.offeredAt !== null &&
        entry.room.id === roomId &&
        entry.member.id !== memberId &&
        overlaps(slot, slotOf(entry)),
    );
  }

  async memberEntries(memberId: number): Promise<WaitlistEntry[]> {
    await this.process();
    return this.waitlist.listByMember(memberId);
  }

  async join(memberId: number, request: BookingRequest): Promise<WaitlistEntry> {
    const member = await this.members.get(memberId);
    if (!member) throw new DomainError('MEMBER_NOT_FOUND', `member ${memberId} not found`);
    const room = await this.rooms.get(request.roomId);
    if (!room) throw new DomainError('ROOM_NOT_FOUND', `room ${request.roomId} not found`, 'roomId');
    checkSlot(request, this.clock.now());
    checkCapacity(room, request.attendees);

    await this.process();
    const sameRoom = await this.bookings.listBetween(request.startsAt, request.endsAt, room.id);
    const booked = sameRoom.some((booking) => booking.cancelledAt === null && overlaps(request, slotOf(booking)));
    if (!booked && !(await this.isHeldForOthers(memberId, room.id, request))) {
      throw new DomainError('SLOT_AVAILABLE', `${room.name} is free at that time, book it directly`, 'startsAt');
    }

    const already = (await this.waitlist.listByMember(memberId)).some(
      (entry) =>
        entry.room.id === room.id &&
        entry.startsAt === request.startsAt.toISOString() &&
        entry.endsAt === request.endsAt.toISOString(),
    );
    if (already) throw new DomainError('ALREADY_ON_WAITLIST', 'the member is already on the waiting list', 'startsAt');

    return this.waitlist.create({ ...request, memberId }, this.clock.now());
  }

  async leave(memberId: number, entryId: number): Promise<void> {
    await this.process();
    await this.ownEntry(memberId, entryId);
    await this.waitlist.remove(entryId);
    // Une offre abandonnée passe au suivant.
    await this.process();
  }

  /** Le membre prévenu confirme dans le délai : l'inscription devient une réservation. */
  async confirm(memberId: number, entryId: number): Promise<Booking> {
    await this.process();
    const entry = await this.ownEntry(memberId, entryId);
    if (entry.offeredAt === null) throw new DomainError('NOT_OFFERED', 'the room has not been offered yet');

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

  private async ownEntry(memberId: number, entryId: number): Promise<WaitlistEntry> {
    const entry = await this.waitlist.get(entryId);
    if (!entry) throw new DomainError('WAITLIST_ENTRY_NOT_FOUND', `waiting list entry ${entryId} not found`);
    if (entry.member.id !== memberId) {
      throw new DomainError('NOT_YOUR_WAITLIST_ENTRY', 'only the member on the waiting list can change it');
    }
    return entry;
  }
}
