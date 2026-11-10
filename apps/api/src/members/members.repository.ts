import type { Member } from './member.js';

export const MEMBERS_REPOSITORY = Symbol('MEMBERS_REPOSITORY');

export interface MembersRepository {
  /** Membres par nom. */
  list(): Promise<Member[]>;
  get(id: number): Promise<Member | null>;
}
