import type { Room } from '../rooms/room.js';
import { DomainError } from '../shared/domain-error.js';
import { parisDateTime } from '../shared/paris-time.js';
import type { Booking, StoredBooking } from './booking.js';

/** Horaires d'ouverture de l'espace, en minutes depuis minuit (heure de Paris). */
export const OPENING_TIME = 8 * 60;
export const CLOSING_TIME = 20 * 60;
/** Les réservations commencent et finissent au quart d'heure. */
export const STEP_MINUTES = 15;
export const MAX_DURATION_MINUTES = 4 * 60;
/** Without a signaled arrival this long after its start, a booking is released. */
export const RELEASE_DELAY_MINUTES = 15;
/** The arrival can be signaled this long before the start at the earliest. */
export const EARLY_ARRIVAL_MINUTES = 15;

const MINUTE = 60_000;

interface Slot {
  startsAt: Date;
  endsAt: Date;
}

const isOpenAt = (minutes: number): boolean => minutes >= OPENING_TIME && minutes < CLOSING_TIME;

// Le décalage de Paris avec UTC est d'une heure ronde : un quart d'heure UTC est un quart d'heure de Paris.
const isOnStep = (instant: Date): boolean => instant.getTime() % (STEP_MINUTES * MINUTE) === 0;

/** Le créneau demandé respecte les horaires, le pas d'un quart d'heure et la durée maximale, et n'est pas passé. */
export function checkSlot({ startsAt, endsAt }: Slot, now: Date): void {
  if (endsAt <= startsAt) {
    throw new DomainError('END_BEFORE_START', 'endsAt must be after startsAt', 'endsAt');
  }
  if (!isOnStep(startsAt)) {
    throw new DomainError('NOT_ON_QUARTER_HOUR', 'startsAt must be on a quarter hour', 'startsAt');
  }
  if (!isOnStep(endsAt)) {
    throw new DomainError('NOT_ON_QUARTER_HOUR', 'endsAt must be on a quarter hour', 'endsAt');
  }
  if (startsAt < now) {
    throw new DomainError('IN_THE_PAST', 'the booking cannot start in the past', 'startsAt');
  }
  const start = parisDateTime(startsAt);
  const end = parisDateTime(endsAt);
  if (!isOpenAt(start.minutes)) {
    throw new DomainError('OUTSIDE_OPENING_HOURS', 'the space is open from 8:00 to 20:00', 'startsAt');
  }
  if (end.date !== start.date || !isOpenAt(end.minutes)) {
    throw new DomainError('OUTSIDE_OPENING_HOURS', 'the space is open from 8:00 to 20:00', 'endsAt');
  }
  if (endsAt.getTime() - startsAt.getTime() > MAX_DURATION_MINUTES * MINUTE) {
    throw new DomainError('TOO_LONG', 'a booking lasts at most 4 hours', 'endsAt');
  }
}

/** La salle accueille les participants annoncés. */
export function checkCapacity(room: Room, attendees: number | null): void {
  if (attendees !== null && attendees > room.capacity) {
    throw new DomainError('OVER_CAPACITY', `${room.name} seats at most ${room.capacity} people`, 'attendees');
  }
}

/** Deux créneaux se chevauchent ; l'un peut commencer à l'instant où l'autre finit. */
export function overlaps(a: Slot, b: Slot): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

/** Seul le membre qui a réservé annule, et seulement avant le début. */
export function checkCancellation(booking: StoredBooking, memberId: number, now: Date): void {
  if (booking.member.id !== memberId) {
    throw new DomainError('NOT_YOUR_BOOKING', 'only the member who booked can cancel');
  }
  if (booking.cancelledAt !== null) {
    throw new DomainError('ALREADY_CANCELLED', 'the booking is already cancelled');
  }
  if (isReleased(booking, now)) {
    throw new DomainError('BOOKING_RELEASED', 'the booking was released, it cannot be cancelled');
  }
  if (new Date(booking.startsAt) <= now) {
    throw new DomainError('ALREADY_STARTED', 'a booking cannot be cancelled once it has started');
  }
}

/** The instant a booking is released if its arrival was not signaled. */
export function releaseTime(booking: Pick<StoredBooking, 'startsAt'>): Date {
  return new Date(new Date(booking.startsAt).getTime() + RELEASE_DELAY_MINUTES * MINUTE);
}

/** Released: neither cancelled nor arrived, and the delay has elapsed. The room is free from that very instant. */
export function isReleased(booking: StoredBooking, now: Date): boolean {
  return booking.cancelledAt === null && booking.arrivedAt === null && now >= releaseTime(booking);
}

/** Release is derived from the clock rather than stored, so no job has to run for the room to be freed. */
export function withRelease(booking: StoredBooking, now: Date): Booking {
  return { ...booking, releasedAt: isReleased(booking, now) ? releaseTime(booking).toISOString() : null };
}

/** Only the member who booked signals the arrival, shortly before or after the start, while not released. */
export function checkArrival(booking: StoredBooking, memberId: number, now: Date): void {
  if (booking.member.id !== memberId) {
    throw new DomainError('NOT_YOUR_BOOKING', 'only the member who booked can signal the arrival');
  }
  if (booking.cancelledAt !== null) {
    throw new DomainError('ALREADY_CANCELLED', 'the booking is cancelled');
  }
  if (isReleased(booking, now)) {
    throw new DomainError('BOOKING_RELEASED', 'the booking was released, the arrival came too late');
  }
  if (new Date(booking.startsAt).getTime() - now.getTime() > EARLY_ARRIVAL_MINUTES * MINUTE) {
    throw new DomainError(
      'TOO_EARLY_FOR_ARRIVAL',
      'the arrival can be signaled 15 minutes before the start at the earliest',
    );
  }
}
