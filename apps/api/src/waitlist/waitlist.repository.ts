import type { NewWaitlistEntry, WaitlistEntry } from './waitlist-entry.js';

export const WAITLIST_REPOSITORY = Symbol('WAITLIST_REPOSITORY');

export interface WaitlistRepository {
  /** Toutes les inscriptions, dans l'ordre d'inscription. */
  list(): Promise<WaitlistEntry[]>;
  /** Inscriptions d'un membre, par heure de début. */
  listByMember(memberId: number): Promise<WaitlistEntry[]>;
  get(id: number): Promise<WaitlistEntry | null>;
  create(entry: NewWaitlistEntry, at: Date): Promise<WaitlistEntry>;
  offer(id: number, offeredAt: Date, expiresAt: Date): Promise<WaitlistEntry>;
  remove(id: number): Promise<void>;
}
