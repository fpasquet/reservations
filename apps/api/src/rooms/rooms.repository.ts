import type { Room, RoomFilters } from './room.js';

export const ROOMS_REPOSITORY = Symbol('ROOMS_REPOSITORY');

export interface RoomsRepository {
  /** Salles qui répondent aux filtres, par étage puis par nom. */
  list(filters: RoomFilters): Promise<Room[]>;
  get(id: number): Promise<Room | null>;
}
