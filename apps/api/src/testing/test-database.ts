import type pg from 'pg';
import type { Equipment } from '../rooms/room.js';

/** Vide les tables entre deux tests ; les identifiants repartent de 1. */
export async function clearTables(db: pg.Pool): Promise<void> {
  await db.query('truncate booking, member, room restart identity cascade');
}

export async function insertRoom(
  db: pg.Pool,
  room: { name: string; floor?: number; capacity: number; equipment?: Equipment[] },
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `insert into room (name, floor, capacity, equipment, color) values ($1, $2, $3, $4, '#5b8a72') returning id`,
    [room.name, room.floor ?? 0, room.capacity, room.equipment ?? []],
  );
  return rows[0]!.id;
}

export async function insertMember(db: pg.Pool, fullName: string, company = 'La Verrière'): Promise<number> {
  const email = `${fullName.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`;
  const { rows } = await db.query<{ id: number }>(
    'insert into member (full_name, email, company) values ($1, $2, $3) returning id',
    [fullName, email, company],
  );
  return rows[0]!.id;
}
