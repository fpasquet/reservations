import { DomainError } from '../shared/domain-error.js';

export const EQUIPMENT = ['screen', 'videoconference', 'whiteboard', 'speakerphone', 'step_free_access'] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export interface Room {
  id: number;
  name: string;
  /** 0 pour le rez-de-chaussée. */
  floor: number;
  capacity: number;
  equipment: Equipment[];
  /** Couleur de la vignette, #rrggbb. */
  color: string;
  description: string;
}

export interface RoomFilters {
  minCapacity?: number;
  /** La salle doit avoir tous ces équipements. */
  equipment: Equipment[];
  /** Fragment du nom, sans tenir compte de la casse ni des accents. */
  name?: string;
}

const isEquipment = (value: string): value is Equipment => (EQUIPMENT as readonly string[]).includes(value);

/** Filtres de la liste des salles : `?capacity=6&equipment=screen,whiteboard&name=serre`. */
export function parseRoomFilters(query: { capacity?: unknown; equipment?: unknown; name?: unknown }): RoomFilters {
  const filters: RoomFilters = { equipment: [] };
  if (query.capacity !== undefined && query.capacity !== '') {
    const capacity = Number(query.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new DomainError('INVALID_FIELD', 'capacity must be a positive integer', 'capacity');
    }
    filters.minCapacity = capacity;
  }
  if (typeof query.equipment === 'string' && query.equipment !== '') {
    for (const value of query.equipment.split(',')) {
      if (!isEquipment(value)) {
        throw new DomainError('INVALID_FIELD', `unknown equipment: ${value}`, 'equipment');
      }
      filters.equipment.push(value);
    }
  }
  if (typeof query.name === 'string' && query.name.trim() !== '') filters.name = query.name.trim();
  return filters;
}

/** Minuscules sans accents, pour comparer des noms ; reproduit `lower(unaccent(…))` de la base. */
export const normalizeName = (value: string): string => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Identifiant de ressource lu dans l'URL ; un identifiant mal formé ne désigne aucune ressource. */
export function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
